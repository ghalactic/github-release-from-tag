import {
  error,
  getInput,
  group,
  info,
  setFailed,
  setOutput,
  summary,
  warning,
} from "@actions/core";
import { modifyReleaseAssets } from "./asset.js";
import { renderReleaseBody } from "./body.js";
import { readConfig } from "./config/reading.js";
import {
  ASSETS,
  RELEASE_BODY,
  RELEASE_ID,
  RELEASE_NAME,
  RELEASE_UPLOAD_URL,
  RELEASE_URL,
  RELEASE_WAS_CREATED,
  TAGGER_AVATAR_URL,
  TAGGER_LOGIN,
  TAG_BODY,
  TAG_IS_SEM_VER,
  TAG_IS_STABLE,
  TAG_NAME,
  TAG_SUBJECT,
} from "./constant/output.js";
import {
  configureGit,
  determineRef,
  determineTagType,
  fetchTagAnnotation,
  readTagAnnotation,
} from "./git.js";
import { isError } from "./guard.js";
import { createOctokit } from "./octokit.js";
import {
  createDiscussionReactions,
  createReleaseReactions,
} from "./reaction.js";
import { parseRef } from "./ref.js";
import { createOrUpdateRelease } from "./release.js";
import { renderSummary } from "./summary.js";
import { getTagHtmlUrl, getTagger } from "./tags.js";

main().catch((error) => {
  const stack = isError(error) ? error.stack : undefined;
  setFailed(stack ?? "unknown cause");
});

async function main(): Promise<void> {
  const config = await readConfig({ getInput, group, info });

  const { env } = process;
  const { GITHUB_REPOSITORY = "" } = env;
  const [owner, repo] = GITHUB_REPOSITORY.split("/");

  const isConfigured = await configureGit({ env, group, info });

  if (!isConfigured) {
    setFailed("Unable to configure Git");

    return;
  }

  const ref = await determineRef({ group, info });
  const { isTag, isSemVer, isStable, tag } = parseRef(ref);

  if (!isTag) {
    setFailed("Cannot create a release from a non-tag");

    return;
  }

  info(`Detected tag ${JSON.stringify(tag)}`);

  setOutput(TAG_IS_SEM_VER, isSemVer ? "true" : "");
  setOutput(TAG_IS_STABLE, isStable ? "true" : "");
  setOutput(TAG_NAME, tag);

  if (!(await fetchTagAnnotation({ group, tag }))) {
    setFailed("Unable to fetch the tag annotation");

    return;
  }

  const [isTagTypeSuccess, tagType] = await determineTagType({ group, tag });

  if (!isTagTypeSuccess) {
    setFailed("Unable to determine the tag type");

    return;
  }

  if (tagType !== "tag") {
    setFailed("Unable to create a release from a lightweight tag");

    return;
  }

  const tagSemVerLabel = isSemVer ? "SemVer" : "Non-Semver";
  const tagStabilityLabel = isStable ? "stable release" : "pre-release";

  if (typeof config.prerelease === "boolean") {
    info(
      `Release has been explicitly configured to be a ${
        config.prerelease ? "pre-release" : "stable release"
      }`
    );

    if (isStable === config.prerelease) {
      info(
        `Normally, ${tagSemVerLabel} tag would have been treated as a ${tagStabilityLabel}`
      );
    }
  } else {
    info(`${tagSemVerLabel} tag will be treated as a ${tagStabilityLabel}`);
  }

  const [isTagAnnotationReadSuccess, tagSubject, tagBody] =
    await readTagAnnotation({ group, tag });

  if (!isTagAnnotationReadSuccess) {
    setFailed("Unable to read the tag annotation");

    return;
  }

  setOutput(TAG_BODY, tagBody);
  setOutput(TAG_SUBJECT, tagSubject);

  const {
    graphql,
    request,
    rest: { reactions, repos },
  } = createOctokit(getInput("token"));

  const tagger = await getTagger({ graphql, owner, repo, tag });

  if (tagger) {
    setOutput(TAGGER_AVATAR_URL, tagger.avatarUrl);
    setOutput(TAGGER_LOGIN, tagger.login);
  }

  const releaseBody = await renderReleaseBody({
    config,
    env,
    group,
    info,
    owner,
    repo,
    repos,
    setOutput,
    tag,
    tagBody,
  });

  setOutput(RELEASE_BODY, releaseBody);

  const [release, wasCreated] = await createOrUpdateRelease({
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
  });

  setOutput(RELEASE_ID, release.id);
  setOutput(RELEASE_NAME, release.name);
  setOutput(RELEASE_UPLOAD_URL, release.upload_url);
  setOutput(RELEASE_URL, release.html_url);
  setOutput(RELEASE_WAS_CREATED, wasCreated ? "true" : "");

  info(`${wasCreated ? "Created" : "Updated"} ${release.html_url}`);

  const [assetResult, assets] = await modifyReleaseAssets({
    config,
    error,
    group,
    info,
    owner,
    release,
    repo,
    repos,
    request,
    warning,
  });

  if (!assetResult) setFailed("Unable to modify release assets");

  setOutput(ASSETS, JSON.stringify(assets));

  await createReleaseReactions({
    config,
    group,
    info,
    owner,
    reactions,
    release,
    repo,
  });

  await createDiscussionReactions({
    config,
    graphql,
    group,
    info,
    owner,
    release,
    repo,
    setOutput,
  });

  if (config.summary.enabled) {
    const tagHtmlUrl = await getTagHtmlUrl({ repos, owner, repo, tag });

    await summary
      .addRaw(renderSummary({ release, tagger, tagHtmlUrl, wasCreated }))
      .write();
  }
}
