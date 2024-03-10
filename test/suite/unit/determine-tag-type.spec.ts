import { exec } from "@actions/exec";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { determineTagType } from "../../../src/git.js";
import { group } from "../../mocks/actions-core.js";

const { chdir, cwd } = process;

const silent = true;
const execGit = async (...args: string[]) => exec("git", args, { silent });

describe("determineTagType()", () => {
  let originalCwd: string, mainPath: string;

  beforeEach(async () => {
    originalCwd = cwd();

    mainPath = await mkdtemp(join(tmpdir(), "ghalactic-"));
  });

  afterEach(async () => {
    chdir(originalCwd);

    await rm(mainPath, { recursive: true });
  });

  describe("Happy path", () => {
    beforeEach(async () => {
      // create a repo with an annotated tag
      await execGit(
        "-C",
        mainPath,
        "init",
        "--quiet",
        "--initial-branch=main",
        mainPath,
      );
      await execGit("-C", mainPath, "config", "user.email", "user@example.org");
      await execGit("-C", mainPath, "config", "user.name", "User");
      await execGit(
        "-C",
        mainPath,
        "commit",
        "--quiet",
        "--allow-empty",
        "--message=commit-message-a",
      );
      await execGit(
        "-C",
        mainPath,
        "tag",
        "--annotate",
        "--message=tag-message-a",
        "tag-a",
      );
      await execGit("-C", mainPath, "tag", "--no-sign", "tag-b"); // signing would create annotated tags

      chdir(mainPath);
    });

    it("determines the tag type for defined tags", async () => {
      expect(await determineTagType({ group, tag: "tag-a", silent })).toEqual([
        true,
        "tag",
      ]);
      expect(await determineTagType({ group, tag: "tag-b", silent })).toEqual([
        true,
        "commit",
      ]);
    });
  });

  describe("Unhappy path", () => {
    beforeEach(async () => {
      chdir(mainPath);
    });

    it("fails to determine the tag type", async () => {
      expect(await determineTagType({ group, tag: "tag-a", silent })).toEqual([
        false,
        "",
      ]);
    });
  });
});
