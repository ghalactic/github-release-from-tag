import {getInput, group, info, notice, setFailed} from '@actions/core'
import {context, getOctokit} from '@actions/github'

import {modifyReleaseAssets} from './asset.js'
import {renderReleaseBody} from './body.js'
import {readConfig} from './config/reading.js'
import {determineTagType, fetchTagAnnotation, readTagAnnotation} from './git.js'
import {parseRef} from './ref.js'
import {createOrUpdateRelease} from './release.js'

try {
  await main()
} catch (error) {
  setFailed(error.stack)
}

async function main () {
  const config = await readConfig({group, info})

  const {env} = process
  const {ref, repo: {owner, repo}} = context
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
  const {rest: {markdown, repos}} = getOctokit(getInput('token'))

  const releaseBody = await renderReleaseBody({
    env,
    group,
    info,
    markdown,
    tagBody,
  })

  const [release, wasCreated] = await createOrUpdateRelease({
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
    group,
    info,
    release,
    repos,
  })

  if (!assetResult) setFailed('Unable to modify release assets')
}
