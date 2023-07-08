import { parseRef } from "../../../src/ref.js";

const shorthandFixtures = {
  validStable: [
    ["1"],
    ["v1"],
    ["99999999999999999999999"],
    ["v99999999999999999999999"],
    ["1.1"],
    ["v1.1"],
    ["1.99999999999999999999999"],
    ["v1.99999999999999999999999"],
    ["99999999999999999999999.99999999999999999999999"],
    ["v99999999999999999999999.99999999999999999999999"],
  ],
  validUnstable: [
    ["0"],
    ["v0"],
    ["0.0"],
    ["v0.0"],
    ["0.99999999999999999999999"],
    ["v0.99999999999999999999999"],
  ],
} as const;

/**
 * SemVer fixtures taken from https://regex101.com/r/vkijKf/1/ - which is linked
 * to directly from https://semver.org/.
 */
const semVerValidStable = [
  ["1.2.3"],
  ["10.20.30"],
  ["1.1.2+meta"],
  ["1.1.2+meta-valid"],
  ["1.0.0"],
  ["2.0.0"],
  ["1.1.7"],
  ["2.0.0+build.1848"],
  ["1.0.0+0.build.1-rc.10000aaa-kk-0.1"],
  ["99999999999999999999999.999999999999999999.99999999999999999"],
] as const;
const semVerValidUnstable = [
  ["0.0.4"],
  ["1.1.2-prerelease+meta"],
  ["1.0.0-alpha"],
  ["1.0.0-beta"],
  ["1.0.0-alpha.beta"],
  ["1.0.0-alpha.beta.1"],
  ["1.0.0-alpha.1"],
  ["1.0.0-alpha0.valid"],
  ["1.0.0-alpha.0valid"],
  ["1.0.0-alpha-a.b-c-somethinglong+build.1-aef.1-its-okay"],
  ["1.0.0-rc.1+build.1"],
  ["2.0.0-rc.1+build.123"],
  ["1.2.3-beta"],
  ["10.2.3-DEV-SNAPSHOT"],
  ["1.2.3-SNAPSHOT-123"],
  ["2.0.1-alpha.1227"],
  ["1.0.0-alpha+beta"],
  ["1.2.3----RC-SNAPSHOT.12.9.1--.12+788"],
  ["1.2.3----R-S.12.9.1--.12+meta"],
  ["1.2.3----RC-SNAPSHOT.12.9.1--.12"],
  ["1.0.0-0A.is.legal"],
] as const;
const semVerInvalid = [
  ["1"],
  ["1.2"],
  ["1.2.3-0123"],
  ["1.2.3-0123.0123"],
  ["1.1.2+.123"],
  ["+invalid"],
  ["-invalid"],
  ["-invalid+invalid"],
  ["-invalid.01"],
  ["alpha"],
  ["alpha.beta"],
  ["alpha.beta.1"],
  ["alpha.1"],
  ["alpha+beta"],
  ["alpha_beta"],
  ["alpha."],
  ["alpha.."],
  ["beta"],
  ["1.0.0-alpha_beta"],
  ["-alpha."],
  ["1.0.0-alpha.."],
  ["1.0.0-alpha..1"],
  ["1.0.0-alpha...1"],
  ["1.0.0-alpha....1"],
  ["1.0.0-alpha.....1"],
  ["1.0.0-alpha......1"],
  ["1.0.0-alpha.......1"],
  ["01.1.1"],
  ["1.01.1"],
  ["1.1.01"],
  ["1.2"],
  ["1.2.3.DEV"],
  ["1.2-SNAPSHOT"],
  ["1.2.31.2.3----RC-SNAPSHOT.12.09.1--..12+788"],
  ["1.2-RC-SNAPSHOT"],
  ["-1.0.3-gamma+b7718"],
  ["+justmeta"],
  ["9.8.7+meta+meta"],
  ["9.8.7-whatever+meta+meta"],
  [
    "99999999999999999999999.999999999999999999.99999999999999999----RC-SNAPSHOT.12.09.1--------------------------------..12",
  ],
] as const;
const semVerFixtures = {
  validStable: semVerValidStable,
  validUnstable: semVerValidUnstable,
  invalid: semVerInvalid,
  valid: [...semVerValidStable, ...semVerValidUnstable],
} as const;

describe("parseRef()", () => {
  it("should be able to detect tag refs", () => {
    expect(parseRef("refs/tags/a")).toMatchObject({ isTag: true, tag: "a" });
    expect(parseRef("refs/tags/1.1.1")).toMatchObject({
      isTag: true,
      tag: "1.1.1",
    });
  });

  it("should be able to detect non-tag refs", () => {
    expect(parseRef("refs/heads/a")).toMatchObject({ isTag: false });
    expect(parseRef("refs/heads/a").tag).toBeUndefined();
    expect(parseRef("refs/heads/main")).toMatchObject({ isTag: false });
    expect(parseRef("refs/heads/main").tag).toBeUndefined();
  });

  it.each(shorthandFixtures.validStable)(
    "should be able to detect stable shorthand tag refs (%s)",
    (tag) => {
      expect(parseRef(`refs/tags/${tag}`)).toMatchObject({ isStable: true });
    },
  );

  it.each(shorthandFixtures.validUnstable)(
    "should be able to detect unstable shorthand tag refs (%s)",
    (tag) => {
      expect(parseRef(`refs/tags/${tag}`)).toMatchObject({ isStable: false });
    },
  );

  it.each(semVerFixtures.valid)(
    "should be able to detect SemVer tag refs (%s)",
    (tag) => {
      expect(parseRef(`refs/tags/${tag}`)).toMatchObject({ isSemVer: true });
    },
  );

  it.each(semVerFixtures.valid)(
    'should be able to detect SemVer tag refs with a "v" prefix (v%s)',
    (tag) => {
      expect(parseRef(`refs/tags/v${tag}`)).toMatchObject({ isSemVer: true });
    },
  );

  it.each(semVerFixtures.invalid)(
    "should be able to detect non-SemVer tag refs (%s)",
    (tag) => {
      expect(parseRef(`refs/tags/${tag}`)).toMatchObject({ isSemVer: false });
    },
  );

  it.each(semVerFixtures.invalid)(
    'should be able to detect non-SemVer tag refs with a "v" prefix (v%s)',
    (tag) => {
      expect(parseRef(`refs/tags/v${tag}`)).toMatchObject({ isSemVer: false });
    },
  );

  it.each(semVerFixtures.validStable)(
    "should be able to detect stable SemVer tag refs (%s)",
    (tag) => {
      expect(parseRef(`refs/tags/${tag}`)).toMatchObject({ isStable: true });
    },
  );

  it.each(semVerFixtures.validStable)(
    'should be able to detect stable SemVer tag refs with a "v" prefix (v%s)',
    (tag) => {
      expect(parseRef(`refs/tags/v${tag}`)).toMatchObject({ isStable: true });
    },
  );

  it.each(semVerFixtures.validUnstable)(
    "should be able to detect unstable SemVer tag refs (%s)",
    (tag) => {
      expect(parseRef(`refs/tags/${tag}`)).toMatchObject({ isStable: false });
    },
  );
});
