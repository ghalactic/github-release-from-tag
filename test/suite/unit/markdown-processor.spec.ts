import { readFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { createProcessor } from "../../../src/markdown.js";

const fixturesPath = fileURLToPath(
  new URL("../../fixture/markdown-processor", import.meta.url),
);

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

    await expect(await process(input)).toMatchFileSnapshot(
      join(fixturePath, "expected.md"),
    );
  });
});
