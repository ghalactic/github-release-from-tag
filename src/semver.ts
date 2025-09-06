/**
 * Taken directly from https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
 *
 * Modified to allow for a "v" prefix
 */
const SEMVER_PATTERN =
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export type SemVerVersion = {
  major: string;
  minor: string;
  patch: string;
  preRelease?: string;
  build?: string;
};

export function parseSemVer(version: string): SemVerVersion | undefined {
  const match = version.match(SEMVER_PATTERN);

  if (!match) return undefined;

  const [, major, minor, patch, preRelease, build] = match;

  return { major, minor, patch, preRelease, build };
}

export function isStableSemVer(version: SemVerVersion): boolean {
  return version.major !== "0" && version.preRelease == null;
}
