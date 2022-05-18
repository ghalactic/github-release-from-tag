/**
 * Specifically targets typical GitHub Actions style major version tags (e.g.
 * "v1", "v2").
 */
const SHORTHAND_PATTERN = /^v([1-9]\d*)$/

/**
 * Taken directly from https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
 *
 * Modified to allow for a "v" prefix
 */
const SEMVER_PATTERN = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

export function parseRef (ref) {
  const tagMatch = ref.match(/^refs\/tags\/(.*)$/)

  if (tagMatch == null) {
    return {
      isTag: false,
      isSemVer: false,
      isStable: false,
    }
  }

  const [/*full*/, tag] = tagMatch

  if (SHORTHAND_PATTERN.test(tag)) {
    return {
      isTag: true,
      isSemVer: false,
      isStable: true,
      tag,
    }
  }

  const semVerMatch = SEMVER_PATTERN.exec(tag)

  if (semVerMatch != null) {
    const [/*full*/, major, /*minor*/, /*patch*/, prerelease] = semVerMatch

    return {
      isTag: true,
      isSemVer: true,
      isStable: major !== '0' && prerelease == null,
      tag,
    }
  }

  return {
    isTag: true,
    isSemVer: false,
    isStable: false,
    tag,
  }
}
