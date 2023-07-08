import { readFile } from "fs/promises";
import { load } from "js-yaml";
import { join } from "path";
import { renderSummary } from "../../../src/summary.js";
import { ReleaseData, TaggerData } from "../../../src/type/octokit.js";

const fixturesPath = join(__dirname, "../../fixture/summary");

describe("renderSummary()", () => {
  it.each`
    label                                               | fixture
    ${"handle stable releases"}                         | ${"stable"}
    ${"handle pre-release releases"}                    | ${"pre-release"}
    ${"handle draft releases"}                          | ${"draft"}
    ${"handle releases with discussions"}               | ${"with-discussion"}
    ${"handle releases with empty bodies"}              | ${"empty-body"}
    ${"handle releases with incomplete tagger details"} | ${"incomplete-tagger"}
    ${"handle updating existing releases"}              | ${"updated-existing"}
    ${"handle updating existing draft releases"}        | ${"updated-existing-draft"}
  `("should $label", async ({ fixture }) => {
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
    const expected = String(
      (await readFile(join(fixturePath, "expected.md"))).toString(),
    );

    expect(renderSummary({ ...args, release, tagger })).toBe(expected);
  });
});
