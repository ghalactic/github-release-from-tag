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
    const args = load(
      (await readFile(join(fixturePath, "args.yml"))).toString(),
    ) as Parameters<typeof renderSummary>[0];
    const release = load(
      (await readFile(join(fixturePath, "release.yml"))).toString(),
    ) as ReleaseData;
    const tagger = load(
      (await readFile(join(fixturePath, "tagger.yml"))).toString(),
    ) as TaggerData;

    await expect(
      renderSummary({ ...args, release, tagger }),
    ).toMatchFileSnapshot(join(fixturePath, "expected.md"));
  });
});
