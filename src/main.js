import {getInput, group, info, notice, setFailed} from '@actions/core'
import {exec, getExecOutput} from '@actions/exec'
import {context, getOctokit} from '@actions/github'

try {
  await main()
} catch (error) {
  setFailed(error.stack)
}

async function main () {
  const {ref} = context
  const tagMatch = ref.match(/^refs\/tags\/(.*)$/)

  if (tagMatch == null) {
    setFailed('Cannot create a release from a non-tag')

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
    setFailed(`Unable to fetch the tag annotation for ${quotedTag}`)

    return
  }

  const tagTypeResult = await group(`Determining the tag type for ${quotedTag}`, async () => {
    return getExecOutput('git', ['cat-file', '-t', tag])
  })

  if (tagTypeResult.exitCode !== 0) {
    setFailed(`Unable to determine the tag type for ${quotedTag}`)

    return
  }

  if (tagTypeResult.stdout.trim() !== 'tag') {
    setFailed(`Unable to create a release from lightweight tag ${quotedTag}`)

    return
  }

  const {isSemVer, isPreRelease} = parseTag(tag)
  info(
    `${isSemVer ? 'SemVer' : 'Non-Semver'} tag ${quotedTag} ` +
    `will be treated as a ${isPreRelease ? 'pre-release' : 'stable release'}`
  )

  const tagSubjectResult = await group(`Reading the tag annotation subject for ${quotedTag}`, async () => {
    return getExecOutput('git', ['tag', '-n1', '--format', '%(contents:subject)', tag])
  })

  if (tagSubjectResult.exitCode !== 0) {
    setFailed(`Unable to read the tag annotation subject for ${quotedTag}`)

    return
  }

  const tagBodyResult = await group(`Reading the tag annotation body for ${quotedTag}`, async () => {
    return getExecOutput('git', ['tag', '-n1', '--format', '%(contents:body)', tag])
  })

  if (tagBodyResult.exitCode !== 0) {
    setFailed(`Unable to read the tag annotation body for ${quotedTag}`)

    return
  }

  const tagSubject = tagSubjectResult.stdout.trim()
  const tagBody = tagBodyResult.stdout.trim()

  const {rest: {markdown, repos}} = getOctokit(getInput('token'))

  /**
   * Pre-render the body using CommonMark, because tag annotations are often
   * wrapped to a fixed column width, and GFM renders every one of these
   * newlines as a <br> tag.
   *
   * This approach sucks because it means the actual release body ends up being
   * HTML instead of the original Markdown, but I don't know of any simple way
   * to parse the tag annotation body as CommonMark and then render it as GFM,
   * with all of the intended line breaks intact. If you know how to do this
   * correctly, please open an issue.
   *
   * Pre-rendering with CommonMark does not render issue references (like #1),
   * but thankfully it seems like GitHub Releases will render them even inside
   * the pre-rendered HTML.
   */
  const renderedTagBody = await group(`Rendering tag annotation body for ${quotedTag}`, async () => {
    const {data} = await markdown.render({mode: 'markdown', text: tagBody})
    info(data)

    return data
  })

  const releaseBody = `<!-- original tag annotation body

${tagBody}

-->

${renderedTagBody}`

  const [release, wasCreated] = await createOrUpdateRelease(repos, tag, tagSubject, renderedTagBody, isPreRelease)
  notice(`Release ${wasCreated ? 'created' : 'updated'}: ${release.html_url}`)
}

async function createOrUpdateRelease (repos, tag, name, body, isPreRelease) {
  const quotedTag = JSON.stringify(tag)
  const {repo: {owner, repo}} = context

  const params = {
    owner,
    repo,
    tag_name: tag,
    name,
    body,
    draft: false,
    prerelease: isPreRelease,
  }

  // attempt to create a new release first, as it will usually succeed first
  // time during normal operation
  const createdRelease = await group(`Attempting to create release for ${quotedTag}`, async () => {
    try {
      const response = await repos.createRelease(params)
      info(JSON.stringify(response.data, null, 2))

      return response.data
    } catch (error) {
      const errors = error.response?.data?.errors ?? []
      const isExisting = errors.some(({resource, code}) => resource === 'Release' && code === 'already_exists')

      if (!isExisting) throw error
    }

    return undefined
  })

  if (createdRelease) return [createdRelease, true]

  info('Existing release detected')

  // fetch the existing release, we need its ID
  const existingRelease = await group(`Fetching the existing release for ${quotedTag}`, async () => {
    const {data} = await repos.getReleaseByTag({owner, repo, tag})
    info(JSON.stringify(response.data, null, 2))

    return data
  })

  // update the existing release
  const updatedRelease = await group(`Updating the existing release for ${quotedTag}`, async () => {
    const {data} = await repos.updateRelease({...params, release_id: existingRelease.id})
    info(JSON.stringify(response.data, null, 2))

    return data
  })

  return [updatedRelease, false]
}

function parseTag (tag) {
  // from https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
  // modified to allow for an optional prefix of "v"
  const semVerMatch = tag.match(/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/)

  if (!semVerMatch) return {isSemVer: false, isPreRelease: true}

  const [/*full*/, major, /*minor*/, /*patch*/, prerelease] = semVerMatch

  return {isSemVer: true, isPreRelease: major === '0' || prerelease != null}
}
