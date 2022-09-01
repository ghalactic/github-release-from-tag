import { exec, getExecOutput } from "@actions/exec";

const SIGNATURE_PATTERN =
  /-----BEGIN (\w+) SIGNATURE-----.*?-----END \1 SIGNATURE-----/gs;

export async function determineRef({ group, info, silent = false }) {
  return group("Determining the current Git ref", async () => {
    const { stdout } = await getExecOutput(
      "git",
      ["describe", "--exact-match", "--all"],
      { silent }
    );
    const ref = `refs/${stdout.trim()}`;
    info(ref);

    return ref;
  });
}

export async function determineTagType({ group, silent = false, tag }) {
  try {
    const { stdout: type } = await group(
      "Determining the tag type",
      async () => {
        return getExecOutput("git", ["cat-file", "-t", tag], { silent });
      }
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
export async function fetchTagAnnotation({ group, silent = false, tag }) {
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
        { silent }
      )
    );

    return exitCode === 0;
  } catch {
    return false;
  }
}

export async function readTagAnnotation({ group, silent = false, tag }) {
  try {
    const { stdout: tagSubject } = await group(
      "Reading the tag annotation subject",
      async () => {
        return getExecOutput(
          "git",
          ["tag", "-n1", "--format", "%(contents:subject)", tag],
          { silent }
        );
      }
    );
    const { stdout: tagBody } = await group(
      "Reading the tag annotation body",
      async () => {
        return getExecOutput(
          "git",
          ["tag", "-n1", "--format", "%(contents:body)", tag],
          { silent }
        );
      }
    );

    return [true, trimTagAnnotation(tagSubject), trimTagAnnotation(tagBody)];
  } catch {
    return [false, "", ""];
  }
}

/**
 * This function is unfortunately necessary because the version of Git on the
 * Node.js Docker base image that I use is too old to understand SSH signatures,
 * and does not automatically remove them from tag annotations.
 *
 * Once the Git version used on the Node.js Docker image is 2.34.0 or greater,
 * this function can be removed, and replaced with a simple trim operation.
 */
export function trimTagAnnotation(annotation) {
  return annotation.replace(SIGNATURE_PATTERN, "").trim();
}
