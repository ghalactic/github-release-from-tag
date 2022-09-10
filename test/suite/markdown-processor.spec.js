import { readFile } from "fs/promises";
import { join } from "path";
import { createProcessor } from "../../src/markdown.js";

const fixturesPath = join(__dirname, "../fixture/markdown-processor");

describe("Markdown processor", () => {
  const process = createProcessor({
    owner: "owner-a",
    repo: "repo-a",
  });

  it.each`
    label                                         | fixture
    ${"handle GitHub Flavoured Markdown"}         | ${"gfm"}
    ${"handle GitHub references"}                 | ${"github"}
    ${"strip soft line breaks"}                   | ${"soft-breaks"}
    ${"tolerate sub-optimal Markdown"}            | ${"tolerance"}
    ${"process a typical release body correctly"} | ${"typical"}
  `("should $label", async ({ fixture }) => {
    const fixturePath = join(fixturesPath, fixture);
    const input = String(await readFile(join(fixturePath, "input.md")));
    const expected = String(await readFile(join(fixturePath, "expected.md")));

    expect(await process(input)).toBe(expected);
  });
});
