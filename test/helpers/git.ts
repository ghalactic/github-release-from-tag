import { getExecOutput } from "@actions/exec";

let emptyTreeHash: string;

export async function readEmptyTreeHash(): Promise<string> {
  if (emptyTreeHash == null) {
    const { stdout } = await getExecOutput(
      "git",
      ["hash-object", "-t", "tree", "/dev/null"],
      { silent: true }
    );
    emptyTreeHash = stdout.trim();
  }

  return emptyTreeHash;
}
