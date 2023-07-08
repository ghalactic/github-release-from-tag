import { exec, getExecOutput } from "@actions/exec";
import { GroupFn, InfoFn } from "./type/actions.js";

export async function configureGit({
  env,
  group,
  info,
  silent = false,
}: {
  env: typeof process.env;
  group: GroupFn;
  info: InfoFn;
  silent?: boolean;
}): Promise<boolean> {
  return group("Marking the GitHub workspace as a safe directory", async () => {
    const { GITHUB_WORKSPACE = "" } = env;

    if (GITHUB_WORKSPACE === "") {
      info("No GitHub workspace defined");

      return true;
    }

    const exitCode = await exec(
      "git",
      ["config", "--global", "--add", "safe.directory", GITHUB_WORKSPACE],
      { silent },
    );

    return exitCode === 0;
  });
}

export async function determineRef({
  group,
  info,
  silent = false,
}: {
  group: GroupFn;
  info: InfoFn;
  silent?: boolean;
}): Promise<string> {
  return group("Determining the current Git ref", async () => {
    const { stdout } = await getExecOutput(
      "git",
      ["describe", "--exact-match", "--all"],
      { silent },
    );
    const ref = `refs/${stdout.trim()}`;
    info(ref);

    return ref;
  });
}

export async function determineTagType({
  group,
  silent = false,
  tag,
}: {
  group: GroupFn;
  silent?: boolean;
  tag: string;
}): Promise<[boolean, string]> {
  try {
    const { stdout: type } = await group(
      "Determining the tag type",
      async () => {
        return getExecOutput("git", ["cat-file", "-t", tag], { silent });
      },
    );

    return [true, type.trim()];
  } catch {
    return [false, ""];
  }
}

/**
 * Fetch the real tag, because GHA creates a fake lightweight tag, and we need
 * the tag annotation to build our release content.
 */
export async function fetchTagAnnotation({
  group,
  silent = false,
  tag,
}: {
  group: GroupFn;
  silent?: boolean;
  tag: string;
}): Promise<boolean> {
  try {
    const exitCode = await group("Fetching the tag annotation", async () =>
      exec(
        "git",
        [
          "fetch",
          "origin",
          "--no-tags",
          "--force",
          `refs/tags/${tag}:refs/tags/${tag}`,
        ],
        { silent },
      ),
    );

    return exitCode === 0;
  } catch {
    return false;
  }
}

export async function readTagAnnotation({
  group,
  silent = false,
  tag,
}: {
  group: GroupFn;
  silent?: boolean;
  tag: string;
}): Promise<[boolean, string, string]> {
  try {
    const { stdout: tagSubject } = await group(
      "Reading the tag annotation subject",
      async () => {
        return getExecOutput(
          "git",
          ["tag", "-n1", "--format", "%(contents:subject)", tag],
          { silent },
        );
      },
    );
    const { stdout: tagBody } = await group(
      "Reading the tag annotation body",
      async () => {
        return getExecOutput(
          "git",
          ["tag", "-n1", "--format", "%(contents:body)", tag],
          { silent },
        );
      },
    );

    return [true, tagSubject.trim(), tagBody.trim()];
  } catch {
    return [false, "", ""];
  }
}
