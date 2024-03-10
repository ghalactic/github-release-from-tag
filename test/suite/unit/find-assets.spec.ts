import { join } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findAssets } from "../../../src/asset.js";
import { WarningFn } from "../../../src/type/actions.js";
import { info, warning } from "../../mocks/actions-core.js";

const { chdir, cwd } = process;
const fixturesPath = join(__dirname, "../../fixture/find-assets");

describe("findAssets()", () => {
  let originalCwd: string;

  beforeEach(async () => {
    vi.spyOn(process.stdout, "write").mockImplementation((s, e, cb) => {
      cb?.();

      return true;
    });
    originalCwd = cwd();
  });

  afterEach(async () => {
    chdir(originalCwd);
    vi.restoreAllMocks();
  });

  it("finds assets when the pattern matches a single file", async () => {
    const fixturePath = join(fixturesPath, "singular");
    chdir(fixturePath);

    const actual = await findAssets(info, warning, [
      {
        path: "path/to/file-a.txt",
        label: "",
        name: "",
        optional: false,
      },
      {
        path: "path/to/file-b.*.txt",
        label: "",
        name: "",
        optional: false,
      },
    ]);

    const expected = [
      {
        path: join(fixturePath, "path/to/file-a.txt"),
        name: "file-a.txt",
        label: "",
        optional: false,
      },
      {
        path: join(fixturePath, "path/to/file-b.243980118.txt"),
        name: "file-b.243980118.txt",
        label: "",
        optional: false,
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("applies custom names and labels when the pattern matches a single file", async () => {
    const fixturePath = join(fixturesPath, "singular");
    chdir(fixturePath);

    const actual = await findAssets(info, warning, [
      {
        path: "path/to/file-b.*.txt",
        name: "custom-name.txt",
        label: "label for file b",
        optional: false,
      },
    ]);

    const expected = [
      {
        path: join(fixturePath, "path/to/file-b.243980118.txt"),
        name: "custom-name.txt",
        label: "label for file b",
        optional: false,
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("finds assets when the pattern matches multiple files", async () => {
    const fixturePath = join(fixturesPath, "multiple");
    chdir(fixturePath);

    const actual = await findAssets(info, warning, [
      {
        path: "path/to/file-a.*.txt",
        label: "",
        name: "",
        optional: false,
      },
    ]);

    const expected = [
      {
        path: join(fixturePath, "path/to/file-a.1468898034.txt"),
        name: "file-a.1468898034.txt",
        label: "",
        optional: false,
      },
      {
        path: join(fixturePath, "path/to/file-a.4228738524.txt"),
        name: "file-a.4228738524.txt",
        label: "",
        optional: false,
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("doesn't apply custom names or labels when the pattern matches multiple files", async () => {
    const fixturePath = join(fixturesPath, "multiple");
    chdir(fixturePath);

    const actual = await findAssets(info, warning, [
      {
        path: "path/to/file-a.*.txt",
        name: "custom-name.txt",
        label: "label for file a",
        optional: false,
      },
    ]);

    const expected = [
      {
        path: join(fixturePath, "path/to/file-a.1468898034.txt"),
        name: "file-a.1468898034.txt",
        label: "",
        optional: false,
      },
      {
        path: join(fixturePath, "path/to/file-a.4228738524.txt"),
        name: "file-a.4228738524.txt",
        label: "",
        optional: false,
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("warns about duplicate assets", async () => {
    const fixturePath = join(fixturesPath, "multiple");
    chdir(fixturePath);

    const actual: string[] = [];
    const warning: WarningFn = (messageOrError: string | Error) => {
      if (messageOrError instanceof Error) {
        actual.push(messageOrError.message);
      } else {
        actual.push(messageOrError);
      }
    };

    await findAssets(info, warning, [
      {
        path: "path/to/file-a.*.txt",
        label: "",
        name: "",
        optional: false,
      },
      {
        path: "path/to/file-a.*.txt",
        label: "",
        name: "",
        optional: false,
      },
    ]);

    expect(actual).toContain(
      'Release asset "file-a.1468898034.txt" found multiple times. Only the first instance will be used.',
    );
    expect(actual).toContain(
      'Release asset "file-a.4228738524.txt" found multiple times. Only the first instance will be used.',
    );
  });

  it("skips duplicate assets where the names differ only by case", async () => {
    const fixturePath = join(fixturesPath, "case-insensitivity");
    chdir(fixturePath);

    const actual: string[] = [];
    const warning: WarningFn = (messageOrError: string | Error) => {
      if (messageOrError instanceof Error) {
        actual.push(messageOrError.message);
      } else {
        actual.push(messageOrError);
      }
    };

    await findAssets(info, warning, [
      {
        path: "**/*.txt",
        label: "",
        name: "",
        optional: false,
      },
    ]);

    expect(actual).toContain(
      'Release asset "FILE-A.txt" found multiple times. Only the first instance will be used.',
    );
  });

  it("fails when the pattern matches no files", async () => {
    chdir(fixturesPath);

    async function actual() {
      await findAssets(info, warning, [
        {
          path: "path/to/nonexistent.*",
          label: "",
          name: "",
          optional: false,
        },
      ]);
    }

    await expect(actual).rejects.toThrow(
      'No release assets found for mandatory asset with path glob pattern "path/to/nonexistent.*"',
    );
  });
});
