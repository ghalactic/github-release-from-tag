import { Octokit } from "@octokit/action";

export function createOctokit(token) {
  return new Octokit({ auth: token });
}
