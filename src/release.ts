import { isRequestError } from "./octokit.js";
import { GroupFn, InfoFn } from "./type/actions.js";
import { Config } from "./type/config.js";
import { ReleaseData, ReposApi } from "./type/octokit.js";

export async function createOrUpdateRelease({
  config,
  group,
  info,
  isStable,
  owner,
  releaseBody,
  repo,
  repos,
  tag,
  tagSubject,
}: {
  config: Config;
  group: GroupFn;
  info: InfoFn;
  isStable: boolean;
  owner: string;
  releaseBody: string;
  repo: string;
  repos: ReposApi;
  tag: string;
  tagSubject: string;
}): Promise<[ReleaseData, boolean]> {
  const params = {
    owner,
    repo,
    tag_name: tag,
    name: tagSubject,
    body: releaseBody,
    draft: config.draft,
    prerelease: config.prerelease ?? !isStable,
    discussion_category_name: config.discussion.category || undefined,
  };

  // Attempt to create a new release first, prioritizing speed during normal
  // operation
  const createdRelease = await group(
    "Attempting to create a release",
    async () => {
      try {
        const { data } = await repos.createRelease(params);
        info(JSON.stringify(data, null, 2));

        return data;
      } catch (error) {
        if (!isRequestError(error)) throw error;

        const errors = error.response.data.errors ?? [];
        const isExisting = errors.some(
          ({ resource, code }) =>
            resource === "Release" && code === "already_exists",
        );

        if (!isExisting) throw error;

        info(JSON.stringify(error.response.data, null, 2));
      }

      return undefined;
    },
  );

  if (createdRelease) return [createdRelease, true];

  info("Existing release detected");

  // fetch the existing release, we need its ID
  const existingRelease = await group(
    "Fetching the existing release",
    async () => {
      const { data } = await repos.getReleaseByTag({ owner, repo, tag });
      info(JSON.stringify(data, null, 2));

      return data;
    },
  );

  // update the existing release
  const updatedRelease = await group(
    "Updating the existing release",
    async () => {
      const { data } = await repos.updateRelease({
        ...params,
        release_id: existingRelease.id,
      });
      info(JSON.stringify(data, null, 2));

      return data;
    },
  );

  return [updatedRelease, false];
}
