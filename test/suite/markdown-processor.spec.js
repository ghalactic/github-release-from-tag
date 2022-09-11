import { readFile } from "fs/promises";
import { load } from "js-yaml";
import { join } from "path";
import { createProcessor } from "../../src/markdown.js";

const fixturesPath = join(__dirname, "../fixture/markdown-processor");

describe("Markdown processor", () => {
  it.each`
    label                                           | fixture
    ${"handle GitHub Flavoured Markdown"}           | ${"gfm"}
    ${"handle GitHub references"}                   | ${"github"}
    ${"handle GitHub Enterprise Server references"} | ${"github-ghes"}
    ${"strip soft line breaks"}                     | ${"soft-breaks"}
    ${"tolerate sub-optimal Markdown"}              | ${"tolerance"}
    ${"process a typical release body correctly"}   | ${"typical"}
  `("should $label", async ({ fixture }) => {
    const fixturePath = join(fixturesPath, fixture);
    const input = String(await readFile(join(fixturePath, "input.md")));
    const env = load(await readFile(join(fixturePath, "env.yml")));
    const expected = String(await readFile(join(fixturePath, "expected.md")));

    const process = createProcessor({
      serverUrl: env.serverUrl,
      owner: "owner-a",
      repo: "repo-a",
    });

    expect(await process(input)).toBe(expected);
  });
});
