import { exec, getExecOutput } from "@actions/exec";
import fileUrl from "file-url";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fetchTagAnnotation } from "../../../src/git.js";
import { group } from "../../mocks/actions-core.js";

const { chdir, cwd } = process;

const silent = true;
const execGit = async (...args: string[]) => exec("git", args, { silent });
const getExecGitOutput = async (...args: string[]) =>
  (await getExecOutput("git", args, { silent })).stdout.trim();

describe("fetchTagAnnotation()", () => {
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
      await execGit(
        "-C",
        paths.origin,
        "tag",
        "--no-sign",
        "--annotate",
        "--message=tag-message-a",
        "tag-a",
      );
      await execGit(
        "-C",
        paths.origin,
        "tag",
        "--no-sign",
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
        "config",
        "user.email",
        "user@example.org",
      );
      await execGit("-C", paths.clone, "config", "user.name", "User");
      await execGit("-C", paths.clone, "tag", "--no-sign", "tag-a"); // signing would create annotated tags
      await execGit(
        "-C",
        paths.clone,
        "switch",
        "--quiet",
        "--detach",
        "tag-a",
      );

      chdir(paths.clone);
    });

    it("should fetch the annotated tag from origin", async () => {
      // first prove that the tag is lightweight
      expect(await getExecGitOutput("cat-file", "-t", "tag-a")).toBe("commit");

      // fetch should succeed
      expect(await fetchTagAnnotation({ group, tag: "tag-a", silent })).toBe(
        true,
      );

      // the tag should now be annotated
      expect(await getExecGitOutput("cat-file", "-t", "tag-a")).toBe("tag");
      expect(
        await getExecGitOutput(
          "tag",
          "-n1",
          "--format",
          "%(contents:subject)",
          "tag-a",
        ),
      ).toBe("tag-message-a");

      // other tags should not have been fetched
      await expect(async () =>
        execGit("cat-file", "-t", "tag-b"),
      ).rejects.toThrow();
    });
  });

  describe("Unhappy path", () => {
    beforeEach(async () => {
      // create an origin repo with no tags
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
        "config",
        "user.email",
        "user@example.org",
      );
      await execGit("-C", paths.clone, "config", "user.name", "User");
      await execGit("-C", paths.clone, "tag", "--no-sign", "tag-a"); // signing would create annotated tags
      await execGit(
        "-C",
        paths.clone,
        "switch",
        "--quiet",
        "--detach",
        "tag-a",
      );

      chdir(paths.clone);
    });

    it("should fail to fetch the annotated tag from origin", async () => {
      expect(await fetchTagAnnotation({ group, tag: "tag-a", silent })).toBe(
        false,
      );
    });
  });
});
