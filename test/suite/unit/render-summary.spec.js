import { readFile } from "fs/promises";
import { load } from "js-yaml";
import { join } from "path";
import { renderSummary } from "../../../src/summary";

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
    const args = load(await readFile(join(fixturePath, "args.yml")));
    const release = load(await readFile(join(fixturePath, "release.yml")));
    const tagger = load(await readFile(join(fixturePath, "tagger.yml")));
    const expected = String(await readFile(join(fixturePath, "expected.md")));

    expect(renderSummary({ ...args, release, tagger })).toBe(expected);
  });
});
