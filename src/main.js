import {
  error,
  getInput,
  group,
  info,
  notice,
  setFailed,
  warning,
} from "@actions/core";
import { context, getOctokit } from "@actions/github";
import { setOutput } from "./actions.js";
import { modifyReleaseAssets } from "./asset.js";
import { renderReleaseBody } from "./body.js";
import { readConfig } from "./config/reading.js";
import {
  determineRef,
  determineTagType,
  fetchTagAnnotation,
  readTagAnnotation,
} from "./git.js";
import {
  createDiscussionReactions,
  createReleaseReactions,
} from "./reaction.js";
import { parseRef } from "./ref.js";
import { createOrUpdateRelease } from "./release.js";

try {
  await main();
} catch (e) {
  setFailed(e.stack);
}

async function main() {
  const config = await readConfig({ getInput, group, info });

  const { env } = process;
  const {
    repo: { owner, repo },
  } = context;

  const ref = await determineRef({ group, info });
  const { isTag, isSemVer, isStable, tag } = parseRef(ref);

  if (!isTag) {
    setFailed("Cannot create a release from a non-tag");

    return;
  }

  info(`Detected tag ${JSON.stringify(tag)}`);

  setOutput("tagIsSemVer", isSemVer ? "true" : "");
  setOutput("tagIsStable", isStable ? "true" : "");
  setOutput("tagName", tag);

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

  setOutput("tagBody", tagBody);
  setOutput("tagSubject", tagSubject);

  const {
    graphql,
    request,
    rest: { markdown, reactions, repos },
  } = getOctokit(getInput("token"));

  const releaseBody = await renderReleaseBody({
    config,
    env,
    group,
    info,
    markdown,
    owner,
    repo,
    repos,
    setOutput,
    tag,
    tagBody,
  });

  setOutput("releaseBody", releaseBody);

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

  setOutput("releaseId", release.id);
  setOutput("releaseName", release.name);
  setOutput("releaseUploadUrl", release.upload_url);
  setOutput("releaseUrl", release.html_url);
  setOutput("releaseWasCreated", wasCreated ? "true" : "");

  notice(`${wasCreated ? "Created" : "Updated"} ${release.html_url}`, {
    title: `Released - ${tagSubject}`,
  });

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

  setOutput("assets", JSON.stringify(assets));

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
}
