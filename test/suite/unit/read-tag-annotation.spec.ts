import { exec } from "@actions/exec";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readTagAnnotation } from "../../../src/git.js";
import { group } from "../../mocks/actions-core.js";

const { chdir, cwd } = process;

const silent = true;
const execGit = async (...args: string[]) => exec("git", args, { silent });

describe("readTagAnnotation()", () => {
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
        "--no-gpg-sign",
        "--allow-empty",
        "--message=commit-message-a",
      );
      await execGit(
        "-C",
        mainPath,
        "tag",
        "--no-sign",
        "--annotate",
        "--message=subject-a\nsubject-b\n\nbody-a\nbody-b",
        "tag-a",
      );

      chdir(mainPath);
    });

    it("reads the tag subject and body", async () => {
      expect(await readTagAnnotation({ group, tag: "tag-a", silent })).toEqual([
        true,
        "subject-a subject-b",
        "body-a\nbody-b",
      ]);
    });
  });

  describe("Unhappy path", () => {
    beforeEach(async () => {
      chdir(mainPath);
    });

    it("fails to read the tag subject and body", async () => {
      expect(await readTagAnnotation({ group, tag: "tag-a", silent })).toEqual([
        false,
        "",
        "",
      ]);
    });
  });
});
