import { Octokit } from "@octokit/action";
import { retry } from "@octokit/plugin-retry";

export function createOctokit(token) {
  const CustomOctokit = Octokit.plugin(retry);

  return new CustomOctokit({ auth: token });
}
