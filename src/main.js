import {error, getInput, group, info, notice, setFailed, warning} from '@actions/core'
import {context, getOctokit} from '@actions/github'

import {modifyReleaseAssets} from './asset.js'
import {renderReleaseBody} from './body.js'
import {readConfig} from './config/reading.js'
import {determineRef, determineTagType, fetchTagAnnotation, readTagAnnotation} from './git.js'
import {parseRef} from './ref.js'
import {createOrUpdateRelease} from './release.js'

try {
  await main()
} catch (e) {
  setFailed(e.stack)
}

async function main () {
  const config = await readConfig({group, info})

  const {env} = process
  const {repo: {owner, repo}} = context

  const ref = await determineRef({group, info})
  const {isTag, isSemVer, isStable, tag} = parseRef(ref)

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

  const isDraft = getInput('draft') === 'true'
  const shouldGenerateReleaseNotes = getInput('generateReleaseNotes') === 'true'
  const discussionCategory = getInput('discussionCategory')
  const {request, rest: {markdown, repos}} = getOctokit(getInput('token'))

  const releaseBody = await renderReleaseBody({
    env,
    group,
    info,
    markdown,
    owner,
    repo,
    repos,
    shouldGenerateReleaseNotes,
    tag,
    tagBody,
  })

  const [release, wasCreated] = await createOrUpdateRelease({
    discussionCategory,
    group,
    info,
    isDraft,
    isStable,
    owner,
    releaseBody,
    repo,
    repos,
    tag,
    tagSubject,
  })

  notice(`${wasCreated ? 'Created' : 'Updated'} ${release.html_url}`, {title: `Released - ${tagSubject}`})

  const assetResult = await modifyReleaseAssets({
    config,
    error,
    group,
    info,
    owner,
    release,
    repo,
    repos,
    request,
    warning,
  })

  if (!assetResult) setFailed('Unable to modify release assets')
}
