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
  const semVerMatch = SEMVER_PATTERN.exec(tag)

  if (semVerMatch == null) {
    return {
      isTag: true,
      isSemVer: false,
      isStable: false,
      tag,
    }
  }

  const [/*full*/, major, /*minor*/, /*patch*/, prerelease] = semVerMatch

  return {
    isTag: true,
    isSemVer: true,
    isStable: major !== '0' && prerelease == null,
    tag,
  }
}
