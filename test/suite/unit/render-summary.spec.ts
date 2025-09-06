import { readFile } from "fs/promises";
import { load } from "js-yaml";
import { join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { renderSummary } from "../../../src/summary.js";
import { ReleaseData, TaggerData } from "../../../src/type/octokit.js";

const fixturesPath = fileURLToPath(
  new URL("../../fixture/summary", import.meta.url),
);

describe("renderSummary()", () => {
  it.each`
    label                                                | fixture
    ${"handles stable releases"}                         | ${"stable"}
    ${"handles pre-release releases"}                    | ${"pre-release"}
    ${"handles draft releases"}                          | ${"draft"}
    ${"handles releases with discussions"}               | ${"with-discussion"}
    ${"handles releases with empty bodies"}              | ${"empty-body"}
    ${"handles releases with incomplete tagger details"} | ${"incomplete-tagger"}
    ${"handles updating existing releases"}              | ${"updated-existing"}
    ${"handles updating existing draft releases"}        | ${"updated-existing-draft"}
  `("$label", async ({ fixture }) => {
    const fixturePath = join(fixturesPath, fixture);
    const argsPath = join(fixturePath, "args.yml");
    const releasePath = join(fixturePath, "release.yml");
    const latestReleasePath = join(fixturePath, "latest-release.yml");
    const taggerPath = join(fixturePath, "tagger.yml");
    const args = load((await readFile(argsPath)).toString()) as Parameters<
      typeof renderSummary
    >[0];
    const release = load(
      (await readFile(releasePath)).toString(),
    ) as ReleaseData;
    const tagger = load((await readFile(taggerPath)).toString()) as TaggerData;

    let latestRelease: ReleaseData | undefined;

    if (args.isLatest) {
      latestRelease = release;
    } else {
      try {
        latestRelease = load(
          (await readFile(latestReleasePath)).toString(),
        ) as ReleaseData;
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !("code" in error) ||
          error.code !== "ENOENT"
        ) {
          throw error;
        }
      }
    }

    await expect(
      renderSummary({ ...args, release, tagger, latestRelease }),
    ).toMatchFileSnapshot(join(fixturePath, "expected.md"));
  });
});
