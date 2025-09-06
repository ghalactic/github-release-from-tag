import { compareVersions } from "compare-versions";
import {
  ALWAYS,
  IF_NEW,
  LEGACY,
  NEVER,
} from "./constant/make-latest-strategy.js";
import {
  LATEST_RELEASE_ID,
  LATEST_RELEASE_NAME,
  LATEST_RELEASE_URL,
  RELEASE_IS_LATEST,
} from "./constant/output.js";
import { isRequestError } from "./octokit.js";
import { isStableSemVer, parseSemVer } from "./semver.js";
import { GroupFn, InfoFn, type SetOutputFn } from "./type/actions.js";
import { Config } from "./type/config.js";
import { ReleaseData, ReposApi, type MakeLatestValue } from "./type/octokit.js";

export async function determineMakeLatest({
  config,
  group,
  info,
  isPreRelease,
  owner,
  repo,
  repos,
  tag,
}: {
  config: Config;
  group: GroupFn;
  info: InfoFn;
  isPreRelease: boolean;
  owner: string;
  repo: string;
  repos: ReposApi;
  tag: string;
}): Promise<
  [createMakeLatest: MakeLatestValue, updateMakeLatest: MakeLatestValue]
> {
  return group(
    "Determining whether this release should be the latest",
    async (): Promise<
      [createMakeLatest: MakeLatestValue, updateMakeLatest: MakeLatestValue]
    > => {
      if (isPreRelease) {
        info("This is a pre-release, which can't be set as the latest");

        return ["false", "false"];
      }

      if (config.draft) {
        info("This is a draft release, which can't be set as the latest");

        return ["false", "false"];
      }

      if (config.makeLatest === IF_NEW) {
        info(
          "This release will be set as the latest only if it's newly created",
        );

        return ["true", "false"];
      }

      if (config.makeLatest === ALWAYS) {
        info("This release will be set as the latest");

        return ["true", "true"];
      }

      if (config.makeLatest === NEVER) {
        info("This release will not be set as the latest");

        return ["false", "false"];
      }

      if (config.makeLatest === LEGACY) {
        info("Deferring to GitHub's legacy behavior");

        return ["legacy", "legacy"];
      }

      const tagSemVer = parseSemVer(tag);

      if (!tagSemVer) {
        info(`The tag ${JSON.stringify(tag)} is not valid SemVer`);
        info("This release will not be set as the latest");

        return ["false", "false"];
      }

      info(`The tag ${JSON.stringify(tag)} is valid SemVer`);

      const latestRelease = await getLatestRelease(repos, owner, repo);

      if (!latestRelease) {
        info("No current latest release found");
        info("This release will be set as the latest");

        return ["true", "true"];
      }

      info(`The current latest release is ${latestRelease.html_url}`);

      const currentTag = latestRelease.tag_name;
      const currentTagSemVer = parseSemVer(currentTag);

      if (!currentTagSemVer) {
        info(
          `The current latest release tag ${JSON.stringify(currentTag)} ` +
            "is not valid SemVer",
        );
        info("This release will be set as the latest");

        return ["true", "true"];
      }

      if (isStableSemVer(tagSemVer) && !isStableSemVer(currentTagSemVer)) {
        info(
          `The tag ${JSON.stringify(tag)} is a stable SemVer version, and ` +
            `the current latest release tag ${JSON.stringify(currentTag)} ` +
            `is an unstable SemVer version`,
        );
        info("This release will be set as the latest");

        return ["true", "true"];
      }

      if (!isStableSemVer(tagSemVer) && isStableSemVer(currentTagSemVer)) {
        info(
          `The tag ${JSON.stringify(tag)} is an unstable SemVer version, and ` +
            `the current latest release tag ${JSON.stringify(currentTag)} ` +
            `is a stable SemVer version`,
        );
        info("This release will not be set as the latest");

        return ["false", "false"];
      }

      const comparison = compareVersions(tag, currentTag);

      if (comparison === 0) {
        info(
          `The tag ${JSON.stringify(tag)} has equal SemVer precedence to ` +
            `the current latest release tag ${JSON.stringify(currentTag)}`,
        );
        info(
          "This release will be set as the latest only if it's newly created",
        );

        return ["true", "false"];
      }

      if (comparison > 0) {
        info(
          `The tag ${JSON.stringify(tag)} has higher SemVer precedence than ` +
            `the current latest release tag ${JSON.stringify(currentTag)}`,
        );
        info("This release will be set as the latest");

        return ["true", "true"];
      }

      info(
        `The tag ${JSON.stringify(tag)} has lower SemVer precedence than ` +
          `the current latest release tag ${JSON.stringify(currentTag)}`,
      );
      info("This release will not be set as the latest");

      return ["false", "false"];
    },
  );
}

export async function createOrUpdateRelease({
  config,
  createMakeLatest,
  group,
  info,
  isPreRelease,
  owner,
  releaseBody,
  repo,
  repos,
  tag,
  tagSubject,
  updateMakeLatest,
}: {
  config: Config;
  createMakeLatest: MakeLatestValue;
  group: GroupFn;
  info: InfoFn;
  isPreRelease: boolean;
  owner: string;
  releaseBody: string;
  repo: string;
  repos: ReposApi;
  tag: string;
  tagSubject: string;
  updateMakeLatest: MakeLatestValue;
}): Promise<[release: ReleaseData, wasCreated: boolean]> {
  const params = {
    owner,
    repo,
    tag_name: tag,
    name: tagSubject,
    body: releaseBody,
    draft: config.draft,
    prerelease: isPreRelease,
    discussion_category_name: config.discussion.category || undefined,
  };

  // Attempt to create a new release first, prioritizing speed during normal
  // operation
  const createdRelease = await group(
    "Attempting to create a release",
    async () => {
      try {
        const { data } = await repos.createRelease({
          ...params,
          make_latest: createMakeLatest,
        });
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
        make_latest: updateMakeLatest,
      });
      info(JSON.stringify(data, null, 2));

      return data;
    },
  );

  return [updatedRelease, false];
}

export async function compareLatestRelease({
  group,
  info,
  owner,
  release,
  repo,
  repos,
  setOutput,
}: {
  group: GroupFn;
  info: InfoFn;
  owner: string;
  release: ReleaseData;
  repo: string;
  repos: ReposApi;
  setOutput: SetOutputFn;
}): Promise<[latestRelease: ReleaseData | undefined, isLatest: boolean]> {
  const [latestRelease, isLatest] = await group(
    "Checking the latest release after publishing",
    async () => {
      const latestRelease = await getLatestRelease(repos, owner, repo);
      let isLatest: boolean;

      if (latestRelease) {
        isLatest = latestRelease.id === release.id;
        info(
          isLatest
            ? "The published release is the latest"
            : `The current latest release is ${latestRelease.html_url}`,
        );

        setOutput(LATEST_RELEASE_ID, String(latestRelease.id));
        setOutput(LATEST_RELEASE_NAME, latestRelease.name ?? "");
        setOutput(LATEST_RELEASE_URL, latestRelease.html_url);
        setOutput(RELEASE_IS_LATEST, isLatest ? "true" : "");
      } else {
        isLatest = false;
        info("There is no current latest release");

        setOutput(LATEST_RELEASE_ID, "");
        setOutput(LATEST_RELEASE_NAME, "");
        setOutput(LATEST_RELEASE_URL, "");
        setOutput(RELEASE_IS_LATEST, "");
      }

      return [latestRelease, isLatest];
    },
  );

  return [latestRelease, isLatest];
}

async function getLatestRelease(
  repos: ReposApi,
  owner: string,
  repo: string,
): Promise<ReleaseData | undefined> {
  try {
    const { data: latestRelease } = await repos.getLatestRelease({
      owner,
      repo,
    });

    return latestRelease;
  } catch (error) {
    if (
      !isRequestError(error) ||
      // Octokit types are wrong, status is actually a string
      String(error.response.data.status) !== "404"
    ) {
      throw error;
    }

    return undefined;
  }
}
