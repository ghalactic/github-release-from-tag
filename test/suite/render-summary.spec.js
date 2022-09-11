import { readFile } from "fs/promises";
import { load } from "js-yaml";
import { join } from "path";
import { renderSummary } from "../../src/summary";

const fixturesPath = join(__dirname, "../fixture/summary");

describe("renderSummary()", () => {
  it.each`
    label                                               | fixture
    ${"handle stable releases"}                         | ${"stable"}
    ${"handle pre-release releases"}                    | ${"pre-release"}
    ${"handle draft releases"}                          | ${"draft"}
    ${"handle releases with discussions"}               | ${"with-discussion"}
    ${"handle releases with empty bodies"}              | ${"empty-body"}
    ${"handle releases with incomplete tagger details"} | ${"incomplete-tagger"}
  `("should $label", async ({ fixture }) => {
    const fixturePath = join(fixturesPath, fixture);
    const release = load(await readFile(join(fixturePath, "release.yml")));
    const tagger = load(await readFile(join(fixturePath, "tagger.yml")));
    const expected = String(await readFile(join(fixturePath, "expected.md")));

    expect(renderSummary({ release, tagger })).toBe(expected);
  });
});
