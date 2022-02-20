import {getInput, group, info, notice, setFailed} from '@actions/core'
import {context, getOctokit} from '@actions/github'

import {renderReleaseBody} from './body.js'
import {determineTagType, fetchTagAnnotation, readTagAnnotation} from './git.js'
import {parseRef} from './ref.js'

try {
  await main()
} catch (error) {
  setFailed(error.stack)
}

async function main () {
  const {env} = process
  const {isTag, isSemVer, isStable, tag} = parseRef(context.ref)

  if (!isTag) {
    setFailed('Cannot create a release from a non-tag')

    return
  }

  info(`Detected tag ${JSON.stringify(tag)}`)

  if (!(await fetchTagAnnotation({group, tag}))) {
    setFailed('Unable to fetch the tag annotation')

    return
  }

  const [isTagTypeSuccess, tagType] = await determineTagType({group, tag})

  if (!isTagTypeSuccess) {
    setFailed('Unable to determine the tag type')

    return
  }

  if (tagType !== 'tag') {
    setFailed('Unable to create a release from a lightweight tag')

    return
  }

  info(`${isSemVer ? 'SemVer' : 'Non-Semver'} tag will be treated as a ${isStable ? 'stable release' : 'pre-release'}`)

  const [isTagAnnotationReadSuccess, tagSubject, tagBody] = await readTagAnnotation({group, tag})

  if (!isTagAnnotationReadSuccess) {
    setFailed('Unable to read the tag annotation')

    return
  }

  const {rest: {markdown, repos}} = getOctokit(getInput('token'))

  const releaseBody = await renderReleaseBody({
    env,
    group,
    info,
    markdown,
    tagBody,
  })

  const [release, wasCreated] = await createOrUpdateRelease(repos, tag, tagSubject, releaseBody, isStable)
  notice(`${wasCreated ? 'Created' : 'Updated'} ${release.html_url}`, {title: `Released - ${tagSubject}`})
}

async function createOrUpdateRelease (repos, tag, name, body, isStable) {
  const {repo: {owner, repo}} = context

  const params = {
    owner,
    repo,
    tag_name: tag,
    name,
    body,
    draft: false,
    prerelease: !isStable,
  }

  // attempt to create a new release first, as it will usually succeed first
  // time during normal operation
  const createdRelease = await group('Attempting to create a release', async () => {
    try {
      const {data} = await repos.createRelease(params)
      info(JSON.stringify(data, null, 2))

      return data
    } catch (error) {
      const errors = error.response?.data?.errors ?? []
      const isExisting = errors.some(({resource, code}) => resource === 'Release' && code === 'already_exists')

      if (!isExisting) throw error

      info(JSON.stringify(error.response.data, null, 2))
    }

    return undefined
  })

  if (createdRelease) return [createdRelease, true]

  info('Existing release detected')

  // fetch the existing release, we need its ID
  const existingRelease = await group('Fetching the existing release', async () => {
    const {data} = await repos.getReleaseByTag({owner, repo, tag})
    info(JSON.stringify(data, null, 2))

    return data
  })

  // update the existing release
  const updatedRelease = await group('Updating the existing release', async () => {
    const {data} = await repos.updateRelease({...params, release_id: existingRelease.id})
    info(JSON.stringify(data, null, 2))

    return data
  })

  return [updatedRelease, false]
}
