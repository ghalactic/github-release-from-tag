import { isStableSemVer, parseSemVer } from "./semver.js";

/**
 * Specifically targets typical GitHub Actions style major and minor version
 * tags (e.g. "v1", "v2", "v1.2", "v2.3").
 */
const SHORTHAND_PATTERN = /^v?([1-9]\d*)(\.\d+)?$/;

type ParsedTagRef = {
  isTag: true;
  isSemVer: boolean;
  isStable: boolean;
  tag: string;
};

type ParsedNonTagRef = {
  isTag: false;
  isSemVer: false;
  isStable: false;
  tag: undefined;
};

export function parseRef(ref: string): ParsedTagRef | ParsedNonTagRef {
  const tagMatch = ref.match(/^refs\/tags\/(.*)$/);

  if (tagMatch == null) {
    return {
      isTag: false,
      isSemVer: false,
      isStable: false,
      tag: undefined,
    };
  }

  const [, /*full*/ tag] = tagMatch;

  if (SHORTHAND_PATTERN.test(tag)) {
    return {
      isTag: true,
      isSemVer: false,
      isStable: true,
      tag,
    };
  }

  const semVer = parseSemVer(tag);

  if (semVer) {
    return {
      isTag: true,
      isSemVer: true,
      isStable: isStableSemVer(semVer),
      tag,
    };
  }

  return {
    isTag: true,
    isSemVer: false,
    isStable: false,
    tag,
  };
}
