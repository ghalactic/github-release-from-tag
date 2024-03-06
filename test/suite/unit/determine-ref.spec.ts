import { exec } from "@actions/exec";
import fileUrl from "file-url";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { determineRef } from "../../../src/git.js";
import { group, info } from "../../mocks/actions-core.js";

const { chdir, cwd } = process;

const silent = true;
const execGit = async (...args: string[]) => exec("git", args, { silent });

describe("determineRef()", () => {
  let originalCwd: string;
  let paths: {
    main: string;
    origin: string;
    clone: string;
  };

  beforeEach(async () => {
    originalCwd = cwd();

    const mainPath = await mkdtemp(join(tmpdir(), "ghalactic-"));
    const originPath = join(mainPath, "origin");
    const clonePath = join(mainPath, "clone");

    paths = {
      main: mainPath,
      origin: originPath,
      clone: clonePath,
    };
  });

  afterEach(async () => {
    chdir(originalCwd);

    await rm(paths.main, { recursive: true });
  });

  describe("Happy path", () => {
    beforeEach(async () => {
      // create an origin repo with annotated tags
      await execGit(
        "-C",
        paths.main,
        "init",
        "--quiet",
        "--initial-branch=main",
        paths.origin,
      );
      await execGit(
        "-C",
        paths.origin,
        "config",
        "user.email",
        "user@example.org",
      );
      await execGit("-C", paths.origin, "config", "user.name", "User");
      await execGit(
        "-C",
        paths.origin,
        "commit",
        "--quiet",
        "--allow-empty",
        "--message=commit-message-a",
      );
      await execGit("-C", paths.origin, "switch", "--create", "branch-a");
      await execGit("-C", paths.origin, "switch", "main");
      await execGit(
        "-C",
        paths.origin,
        "commit",
        "--quiet",
        "--allow-empty",
        "--message=commit-message-b",
      );
      await execGit(
        "-C",
        paths.origin,
        "tag",
        "--annotate",
        "--message=tag-message-a",
        "tag-a",
      );
      await execGit(
        "-C",
        paths.origin,
        "commit",
        "--quiet",
        "--allow-empty",
        "--message=commit-message-c",
      );
      await execGit(
        "-C",
        paths.origin,
        "tag",
        "--annotate",
        "--message=tag-message-b",
        "tag-b",
      );

      // create a shallow clone repo with a single lightweight tag, and switch to it
      await execGit(
        "-C",
        paths.main,
        "clone",
        "--quiet",
        "--depth=1",
        "--no-tags",
        fileUrl(paths.origin),
        paths.clone,
      );
      await execGit(
        "-C",
        paths.clone,
        "fetch",
        "origin",
        "refs/tags/tag-a:refs/tags/tag-a",
      );
      await execGit(
        "-C",
        paths.clone,
        "fetch",
        "origin",
        "refs/heads/branch-a:refs/heads/branch-a",
      );
      await execGit(
        "-C",
        paths.clone,
        "config",
        "user.email",
        "user@example.org",
      );
      await execGit("-C", paths.clone, "config", "user.name", "User");
      await execGit("-C", paths.clone, "tag", "--no-sign", "tag-b"); // signing would create annotated tags

      chdir(paths.clone);
    });

    it("should determine the ref when an annotatd tag is checked out", async () => {
      await execGit(
        "-C",
        paths.clone,
        "switch",
        "--quiet",
        "--detach",
        "tag-a",
      );

      expect(await determineRef({ group, info, silent })).toEqual(
        "refs/tags/tag-a",
      );
    });

    it("should determine the ref when a lightweight tag is checked out", async () => {
      await execGit(
        "-C",
        paths.clone,
        "switch",
        "--quiet",
        "--detach",
        "tag-b",
      );

      expect(await determineRef({ group, info, silent })).toEqual(
        "refs/tags/tag-b",
      );
    });

    it("should determine the ref when a branch is checked out", async () => {
      await execGit("-C", paths.clone, "switch", "--quiet", "branch-a");

      expect(await determineRef({ group, info, silent })).toEqual(
        "refs/heads/branch-a",
      );
    });
  });

  describe("Unhappy path", () => {
    beforeEach(async () => {
      chdir(paths.main);
    });

    it("should fail to determine the ref", async () => {
      await expect(() =>
        determineRef({ group, info, silent }),
      ).rejects.toThrow();
    });
  });
});
