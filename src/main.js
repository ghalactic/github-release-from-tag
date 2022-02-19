import {getInput, group, info, setFailed} from '@actions/core'
import {exec, getExecOutput} from '@actions/exec'
import {context, getOctokit} from '@actions/github'

try {
  await main()
} catch (e) {
  logFailure(e.stack)
}

async function main () {
  const {ref} = context
  const tagMatch = ref.match(/^refs\/tags\/(.*)$/)

  if (tagMatch == null) {
    logFailure('Cannot create a release from a non-tag')

    return
  }

  const [, tag] = tagMatch
  const quotedTag = JSON.stringify(tag)

  const fetchTagExitCode = await group(`Fetching the tag annotation for ${quotedTag}`, async () => {
    // fetch the real tag, because GHA creates a fake lightweight tag, and we need
    // the tag annotation to build our release content
    return exec('git', ['fetch', 'origin', '--no-tags', '--force', `${ref}:${ref}`])
  })

  if (fetchTagExitCode !== 0) {
    logFailure(`Unable to fetch the tag annotation for ${quotedTag}`)

    return
  }

  const tagTypeResult = await group(`Determining the tag type for ${quotedTag}`, async () => {
    return getExecOutput('git', ['cat-file', '-t', tag])
  })

  if (tagTypeResult.exitCode !== 0) {
    logFailure(`Unable to determine the tag type for ${quotedTag}`)

    return
  }

  if (tagTypeResult.stdout.trim() !== 'tag') {
    logFailure(`Unable to create a release from lightweight tag ${quotedTag}`)

    return
  }

  const {isSemVer, isStable} = parseTag(tag)
  info(
    `${isSemVer ? 'SemVer' : 'Non-Semver'} tag ${quotedTag} ` +
    `will be treated as a ${isStable ? 'stable release' : 'pre-release'}`
  )

  const tagSubjectResult = await group(`Reading the tag annotation subject for ${quotedTag}`, async () => {
    return getExecOutput('git', ['tag', '-n1', '--format', '%(contents:subject)', tag])
  })

  if (tagSubjectResult.exitCode !== 0) {
    logFailure(`Unable to read the tag annotation subject for ${quotedTag}`)

    return
  }

  const tagBodyResult = await group(`Reading the tag annotation body for ${quotedTag}`, async () => {
    return getExecOutput('git', ['tag', '-n1', '--format', '%(contents:body)', tag])
  })

  if (tagBodyResult.exitCode !== 0) {
    logFailure(`Unable to read the tag annotation body for ${quotedTag}`)

    return
  }

  const {stdout: tagSubject} = tagSubjectResult
  const {stdout: tagBody} = tagBodyResult

  const {rest: {markdown}} = getOctokit(getInput('token'))

  const renderedTagBody = await group(`Rendering tag annotation body for ${quotedTag}`, async () => {
    const {data} = await markdown.render({mode: 'markdown', text: tagBody})
    info(data)

    return data
  })
}

function parseTag (tag) {
  // from https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
  // modified to allow for an optional prefix of "v"
  const semVerMatch = tag.match(/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/)

  if (!semVerMatch) return {isSemVer: false, isStable: false}

  const [/*full*/, major, /*minor*/, /*patch*/, prerelease] = semVerMatch

  return {isSemVer: true, isStable: major !== '0' && prerelease == null}
}

function logFailure (message) {
  setFailed(`\u001b[31m${content}\u001b[0m`)
}
