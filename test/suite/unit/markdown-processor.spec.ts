import { readFile } from "fs/promises";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { createProcessor } from "../../../src/markdown.js";

const fixturesPath = join(__dirname, "../../fixture/markdown-processor");

describe("Markdown processor", () => {
  const process = createProcessor();

  it.each`
    label                                         | fixture
    ${"handles GitHub Flavoured Markdown"}        | ${"gfm"}
    ${"doesn't interfere with GitHub references"} | ${"github"}
    ${"strips soft line breaks"}                  | ${"soft-breaks"}
    ${"tolerates sub-optimal Markdown"}           | ${"tolerance"}
    ${"processes a typical release body"}         | ${"typical"}
  `("$label", async ({ fixture }) => {
    const fixturePath = join(fixturesPath, fixture);
    const input = String(await readFile(join(fixturePath, "input.md")));
    const expected = String(await readFile(join(fixturePath, "expected.md")));

    expect(await process(input)).toBe(expected);
  });
});
