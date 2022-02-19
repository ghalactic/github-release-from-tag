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

  const tagAnnotationResult = await group(`Reading the tag annotation for ${quotedTag}`, async () => {
    return getExecOutput('git', ['tag', '-n1', '--format', '%(contents)', tag])
  })

  if (tagAnnotationResult.exitCode !== 0) {
    logFailure(`Unable to read the tag annotation for ${quotedTag}`)

    return
  }

  const {stdout: originalAnnotation} = tagAnnotationResult
  const annotation = originalAnnotation.replace(/-----BEGIN PGP SIGNATURE-----.*-----END PGP SIGNATURE-----\n/s, '')
  if (annotation !== originalAnnotation) info(`PGP signature detected in tag annotation for ${quotedTag}`)

  info(`Would publish release with annotation ${JSON.stringify(annotation)}`)

  // const octokit = getOctokit(getInput('token'))
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
