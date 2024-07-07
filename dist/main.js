// add require()
const require = await (async () => {
	const { createRequire } = await import("node:module");

	return createRequire(import.meta.url);
})();

// src/main.ts
import {
  error,
  getInput,
  group,
  info,
  setFailed,
  setOutput,
  summary,
  warning
} from "@actions/core";

// src/asset.ts
import { create as createGlob } from "@actions/glob";
import { createHash } from "crypto";
import { readFile, stat } from "fs/promises";
import { lookup } from "mime-types";
import { basename } from "path";
async function modifyReleaseAssets({
  config: config2,
  error: error2,
  group: group2,
  info: info2,
  owner,
  release,
  repo,
  repos,
  request,
  warning: warning2
}) {
  const existingAssets = release.assets;
  const desiredAssets = await findAssets(info2, warning2, config2.assets);
  if (existingAssets.length < 1 && desiredAssets.length < 1) {
    info2("No release assets to modify");
    return [true, []];
  }
  return group2("Modifying release assets", async () => {
    const { toUpload, toUpdate } = diffAssets(existingAssets, desiredAssets);
    info2(`${toUpload.length} to upload, ${toUpdate.length} to update`);
    const [uploadResults, updateResults] = await Promise.all([
      Promise.allSettled(toUpload.map((desired) => uploadAsset(desired))),
      Promise.allSettled(
        toUpdate.map(([existing, desired]) => updateAsset(existing, desired))
      )
    ]);
    const uploadResult = analyzeResults(uploadResults);
    const updateResult = analyzeResults(updateResults);
    logResults(
      info2,
      error2,
      uploadResult,
      "{successCount} uploaded, {failureCount} failed to upload"
    );
    logResults(
      info2,
      error2,
      updateResult,
      "{successCount} updated, {failureCount} failed to update"
    );
    const sortedAssets = [...uploadResult.assets, ...updateResult.assets].sort(
      compareAsset
    );
    let checksumsResult;
    if (config2.checksum.generateAssets) {
      checksumsResult = await uploadOrUpdateChecksumAssets(
        existingAssets,
        sortedAssets
      );
    } else {
      checksumsResult = true;
    }
    const isSuccess = uploadResult.isSuccess && updateResult.isSuccess && checksumsResult;
    return [isSuccess, sortedAssets];
  });
  async function deleteAsset(existing) {
    info2(
      `Deleting existing release asset ${JSON.stringify(existing.name)} (${existing.id})`
    );
    await repos.deleteReleaseAsset({
      owner,
      repo,
      asset_id: existing.id
    });
  }
  async function updateAsset(existing, desired) {
    await deleteAsset(existing);
    return uploadAsset(desired);
  }
  async function uploadAsset(desired) {
    const { upload_url: url } = release;
    const { label, name, path } = desired;
    const contentType = lookup(path) || "application/octet-stream";
    const data = await readFile(path);
    const sha256 = createHash("sha256").update(data).digest("hex");
    info2(
      `Uploading release asset ${JSON.stringify(
        desired.name
      )} (${contentType})`
    );
    const { data: assetData } = await request({
      method: "POST",
      url,
      name,
      data,
      label,
      headers: {
        "Content-Type": contentType
      }
    });
    const normalized = normalizeAssetData(assetData, { sha256 });
    info2(
      `Uploaded release asset ${JSON.stringify(desired.name)}: ${JSON.stringify(
        normalized,
        null,
        2
      )}`
    );
    return normalized;
  }
  async function uploadOrUpdateChecksumAsset(existingAssets2, name, contentType, data, label) {
    const existing = existingAssets2.find((asset) => asset.name === name);
    if (existing) {
      info2(
        `Deleting existing checksum asset ${JSON.stringify(existing.name)} (${existing.id})`
      );
      await repos.deleteReleaseAsset({
        owner,
        repo,
        asset_id: existing.id
      });
    }
    const { upload_url: url } = release;
    info2(`Uploading checksum asset ${JSON.stringify(name)}`);
    const { data: assetData } = await request({
      method: "POST",
      url,
      name,
      data,
      label,
      headers: {
        "Content-Type": contentType
      }
    });
    info2(`Uploaded checksum asset ${JSON.stringify(name)}`);
  }
  async function uploadOrUpdateChecksumAssets(existingAssets2, assets2) {
    const sha256sumData = renderChecksumAsset("sha256", assets2);
    const jsonData = renderJSONChecksumAsset(assets2);
    const results = await Promise.allSettled([
      uploadOrUpdateChecksumAsset(
        existingAssets2,
        "checksums.sha256",
        "text/plain",
        sha256sumData,
        "Checksums (sha256sum)"
      ),
      uploadOrUpdateChecksumAsset(
        existingAssets2,
        "checksums.json",
        "application/json",
        jsonData,
        "Checksums (JSON)"
      )
    ]);
    return results.every((result) => result.status === "fulfilled");
  }
}
async function findAssets(info2, warning2, assets2) {
  const found = [];
  for (const asset of assets2) found.push(...await findAsset(info2, asset));
  const seen = /* @__PURE__ */ new Set();
  return found.filter(({ name }) => {
    const lowercaseName = name.toLowerCase();
    if (!seen.has(lowercaseName)) {
      seen.add(lowercaseName);
      return true;
    }
    const quotedName = JSON.stringify(name);
    warning2(
      `Release asset ${quotedName} found multiple times. Only the first instance will be used.`
    );
    return false;
  });
}
async function findAsset(info2, asset) {
  const { path: pattern, optional: isOptional } = asset;
  const globber = await createGlob(pattern);
  const assets2 = [];
  for await (const path2 of globber.globGenerator()) {
    const stats = await stat(path2);
    if (!stats.isDirectory()) assets2.push({ path: path2 });
  }
  if (assets2.length < 1) {
    const quotedPattern = JSON.stringify(pattern);
    if (isOptional) {
      info2(
        `No release assets found for optional asset with path glob pattern ${quotedPattern}`
      );
      return [];
    }
    throw new Error(
      `No release assets found for mandatory asset with path glob pattern ${quotedPattern}`
    );
  }
  if (assets2.length > 1) return assets2.map(normalizeAssetConfig);
  const [{ path }] = assets2;
  const { name, label, optional } = asset;
  return [normalizeAssetConfig({ label, name, path, optional })];
}
function normalizeAssetConfig({
  label = "",
  path,
  name = "",
  optional = false
}) {
  return {
    label,
    name: name || basename(path),
    path,
    optional
  };
}
function diffAssets(existingAssets, desiredAssets) {
  const toUpdate = [];
  const toUpload = [];
  for (const desired of desiredAssets) {
    const existing = existingAssets.find(
      (existing2) => existing2.name === desired.name
    );
    if (existing == null) {
      toUpload.push(desired);
    } else {
      toUpdate.push([existing, desired]);
    }
  }
  return {
    toUpdate,
    toUpload
  };
}
function renderChecksumAsset(type, assets2) {
  return assets2.map((asset) => `${asset.checksum[type]}  ${asset.name}`).join("\n") + "\n";
}
function renderJSONChecksumAsset(assets2) {
  return JSON.stringify(
    {
      sha256: Object.fromEntries(
        assets2.map((asset) => [asset.name, asset.checksum.sha256])
      )
    },
    null,
    2
  ) + "\n";
}
function analyzeResults(results) {
  let isSuccess = true;
  let successCount = 0;
  const assets2 = [];
  let failureCount = 0;
  const failureReasons = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      ++successCount;
      assets2.push(result.value);
    } else {
      isSuccess = false;
      ++failureCount;
      failureReasons.push(result.reason);
    }
  }
  return {
    isSuccess,
    successCount,
    assets: assets2,
    failureCount,
    failureReasons
  };
}
async function logResults(info2, error2, resultAnalysis, messageTemplate) {
  const { successCount, failureCount, failureReasons } = resultAnalysis;
  const message = messageTemplate.replace("{successCount}", successCount.toString()).replace("{failureCount}", failureCount.toString());
  if (failureCount > 0) {
    info2(`${message}:`);
    for (const reason of failureReasons) error2(reason.stack ?? "");
    info2("");
  } else {
    info2(message);
  }
}
function normalizeAssetData(data, checksum) {
  const {
    url: apiUrl,
    browser_download_url: downloadUrl,
    id,
    node_id: nodeId,
    name,
    label,
    state,
    content_type: contentType,
    size,
    download_count: downloadCount,
    created_at: createdAt,
    updated_at: updatedAt
  } = data;
  return {
    apiUrl,
    downloadUrl,
    id,
    nodeId,
    name,
    label,
    state,
    contentType,
    size,
    downloadCount,
    createdAt,
    updatedAt,
    checksum
  };
}
function compareAsset(a, b) {
  return a.name.localeCompare(b.name);
}

// src/constant/output.ts
var ASSETS = "assets";
var DISCUSSION_ID = "discussionId";
var DISCUSSION_NUMBER = "discussionNumber";
var DISCUSSION_URL = "discussionUrl";
var GENERATED_RELEASE_NOTES = "generatedReleaseNotes";
var RELEASE_BODY = "releaseBody";
var RELEASE_ID = "releaseId";
var RELEASE_NAME = "releaseName";
var RELEASE_UPLOAD_URL = "releaseUploadUrl";
var RELEASE_URL = "releaseUrl";
var RELEASE_WAS_CREATED = "releaseWasCreated";
var TAG_BODY = "tagBody";
var TAG_BODY_RENDERED = "tagBodyRendered";
var TAGGER_AVATAR_URL = "taggerAvatarUrl";
var TAGGER_LOGIN = "taggerLogin";
var TAG_IS_SEM_VER = "tagIsSemVer";
var TAG_IS_STABLE = "tagIsStable";
var TAG_NAME = "tagName";
var TAG_SUBJECT = "tagSubject";

// src/markdown.ts
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
var ALERT_PATTERN = /(\[!(?:CAUTION|IMPORTANT|NOTE|TIP|WARNING)])(?!\s*$)(\s*)/gm;
var SOFT_BREAK_PATTERN = /$[^$]/gms;
function createProcessor() {
  const createRemark = remark().use(remarkGfm).use(() => {
    return (tree) => {
      visit(tree, "text", (node) => {
        node.value = node.value.replace(SOFT_BREAK_PATTERN, " ");
      });
      visit(tree, "blockquote", (node) => {
        visit(node, "text", (node2) => {
          node2.value = node2.value.replace(ALERT_PATTERN, "$1\n");
        });
      });
    };
  }).freeze();
  return async function process2(original) {
    const processor = createRemark();
    return String(await processor.process(original));
  };
}

// src/body.ts
async function renderReleaseBody({
  config: config2,
  env,
  group: group2,
  info: info2,
  owner,
  repo,
  repos,
  setOutput: setOutput2,
  tag,
  tagBody
}) {
  const parts = [];
  if (tagBody.trim() !== "") {
    const renderedTagBody = await group2(
      "Rendering tag annotation body",
      async () => {
        const process2 = createProcessor();
        const processed = (await process2(tagBody)).trim();
        info2(processed);
        return processed;
      }
    );
    setOutput2(TAG_BODY_RENDERED, renderedTagBody);
    parts.push(renderedTagBody);
  }
  if (config2.generateReleaseNotes) {
    const releaseNotes = await group2(
      "Rendering automatically generated release notes",
      async () => {
        const {
          data: { body }
        } = await repos.generateReleaseNotes({ owner, repo, tag_name: tag });
        info2(body);
        return body;
      }
    );
    setOutput2(GENERATED_RELEASE_NOTES, releaseNotes);
    if (parts.length > 0) parts.push("");
    parts.push(releaseNotes);
  }
  if (parts.length > 0) {
    parts.push("", `<!-- published by ${env.GITHUB_ACTION_REPOSITORY} -->`);
  }
  return parts.join("\n");
}

// src/config/reading.ts
import { readFile as readFile2 } from "fs/promises";
import { load } from "js-yaml";

// src/constant/reaction.ts
var THUMBS_UP = "+1";
var THUMBS_DOWN = "-1";
var LAUGH = "laugh";
var HOORAY = "hooray";
var CONFUSED = "confused";
var HEART = "heart";
var ROCKET = "rocket";
var EYES = "eyes";
var DISCUSSION_REACTIONS = [
  THUMBS_UP,
  THUMBS_DOWN,
  LAUGH,
  HOORAY,
  CONFUSED,
  HEART,
  ROCKET,
  EYES
];
var RELEASE_REACTIONS = [
  THUMBS_UP,
  LAUGH,
  HOORAY,
  HEART,
  ROCKET,
  EYES
];
var REACTION_NAMES = {
  [THUMBS_UP]: "THUMBS_UP",
  [THUMBS_DOWN]: "THUMBS_DOWN",
  [LAUGH]: "LAUGH",
  [HOORAY]: "HOORAY",
  [CONFUSED]: "CONFUSED",
  [HEART]: "HEART",
  [ROCKET]: "ROCKET",
  [EYES]: "EYES"
};

// src/guard.ts
function isError(value) {
  return value instanceof Error;
}
function isObject(value) {
  return typeof value === "object" && value != null;
}

// src/config/validation.ts
import ajvModule from "ajv";

// src/constant/schema-id.ts
var CONFIG = "https://ghalactic.github.io/github-release-from-tag/schema/config.schema.json";
var ASSETS2 = "https://ghalactic.github.io/github-release-from-tag/schema/assets.schema.json";

// src/config/schema.ts
var config = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: CONFIG,
  title: "GitHub Release from Tag (Configuration)",
  description: 'Configuration for the "GitHub Release from Tag" GitHub Action.',
  type: "object",
  additionalProperties: false,
  properties: {
    assets: {
      $ref: ASSETS2,
      default: []
    },
    checksum: {
      description: "Options for release asset checksums.",
      type: "object",
      additionalProperties: false,
      default: {},
      properties: {
        generateAssets: {
          description: "Set to false to disable generation of checksum assets for releases.",
          type: "boolean",
          default: true
        }
      }
    },
    discussion: {
      description: "Options for creating discussions linked to releases.",
      type: "object",
      additionalProperties: false,
      default: {},
      properties: {
        category: {
          description: "The category to use when creating the discussion. The value must be a category that already exists in the repository.",
          type: "string",
          default: ""
        },
        reactions: {
          description: "Reactions to create for discussions linked to releases.",
          type: "array",
          default: [],
          items: {
            description: "A reaction to create for discussions linked to releases.",
            type: "string",
            enum: DISCUSSION_REACTIONS
          }
        }
      }
    },
    draft: {
      description: "Set to true to produce releases in a draft state.",
      type: "boolean",
      default: false
    },
    generateReleaseNotes: {
      description: "Set to true to append automatically generated release notes to release bodies.",
      type: "boolean",
      default: false
    },
    prerelease: {
      description: "Set to true or false to override the automatic tag name based pre-release detection.",
      type: "boolean"
    },
    reactions: {
      description: "Reactions to create for releases.",
      type: "array",
      default: [],
      items: {
        description: "A reaction to create for releases.",
        type: "string",
        enum: RELEASE_REACTIONS
      }
    },
    summary: {
      description: "Options for creating GitHub Actions job summaries.",
      type: "object",
      additionalProperties: false,
      default: {},
      properties: {
        enabled: {
          description: "Set to false to disable GitHub Actions job summary creation.",
          type: "boolean",
          default: true
        }
      }
    }
  }
};
var assets = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: ASSETS2,
  title: "GitHub Release from Tag (Assets)",
  description: "Assets to be associated with releases.",
  type: "array",
  items: {
    description: "An asset to be associated with releases.",
    type: "object",
    additionalProperties: false,
    required: ["path"],
    properties: {
      label: {
        description: "The asset label.",
        type: "string",
        default: ""
      },
      name: {
        description: "The asset name. Defaults to the basename of the asset path.",
        type: "string",
        default: ""
      },
      optional: {
        description: "Whether the asset should be ignored if the path file glob pattern does not match any files.",
        type: "boolean",
        default: false
      },
      path: {
        description: "The file path glob pattern used to locate the asset(s). Relative patterns are resolved against the root of the Git repo.",
        type: "string",
        minLength: 1
      }
    }
  }
};

// src/config/validation.ts
var Ajv = ajvModule.default;
var ajv = new Ajv({
  schemas: [assets, config],
  allErrors: true,
  useDefaults: true
});
var validateConfig = createValidate(
  CONFIG,
  "release configuration"
);
var validateAssets = createValidate(
  ASSETS2,
  "release assets configuration"
);
var ValidateError = class extends Error {
  errors;
  constructor(message, errors) {
    super(message);
    this.errors = errors;
  }
};
function createValidate(schemaId, label) {
  return function validate(value) {
    const validator = ajv.getSchema(schemaId);
    if (!validator) throw new Error(`Undefined schema ${schemaId}`);
    if (validator(value)) return value;
    const errors = validator.errors ?? [];
    const error2 = new ValidateError(
      `Invalid ${label}:
${renderErrors(errors)}`,
      errors
    );
    throw error2;
  };
}
function renderErrors(errors) {
  return `  - ${errors.map(renderError).join("\n  - ")}
`;
}
function renderError(error2) {
  const { instancePath, message } = error2;
  const subject = instancePath && ` (${instancePath})`;
  return `${message}${subject}`;
}

// src/config/reading.ts
async function readConfig({
  getInput: getInput2,
  group: group2,
  info: info2
}) {
  return group2("Reading release configuration", async () => {
    const yaml = await readConfigFile();
    if (typeof yaml === "undefined") {
      info2("No configuration found at .github/github-release-from-tag.yml");
    }
    const base = parseConfig(yaml);
    const overrides = getConfigOverrides(getInput2, base);
    let checksum, discussion, summary2;
    if (overrides) {
      info2(`Base configuration: ${JSON.stringify(base, null, 2)}`);
      info2(`Configuration overrides: ${JSON.stringify(overrides, null, 2)}`);
      checksum = { ...base.checksum, ...overrides.checksum };
      discussion = { ...base.discussion, ...overrides.discussion };
      summary2 = { ...base.summary, ...overrides.summary };
    } else {
      checksum = base.checksum;
      discussion = base.discussion;
      summary2 = base.summary;
    }
    const effective = {
      ...base,
      ...overrides,
      checksum,
      discussion,
      summary: summary2
    };
    info2(`Effective configuration: ${JSON.stringify(effective, null, 2)}`);
    return effective;
  });
}
async function readConfigFile() {
  let data;
  try {
    data = await readFile2(".github/github-release-from-tag.yml");
  } catch (error2) {
    if (!isFileNotFoundError(error2)) throw error2;
    return void 0;
  }
  return data.toString().trim();
}
function getConfigOverrides(getInput2, base) {
  const checksumOverrides = {};
  const checksumGenerateAssets = getInput2("checksumGenerateAssets");
  if (checksumGenerateAssets) {
    checksumOverrides.generateAssets = checksumGenerateAssets === "true";
  }
  const discussionOverrides = {};
  const discussionCategory = getInput2("discussionCategory");
  if (discussionCategory) discussionOverrides.category = discussionCategory;
  const discussionReactions = getInput2("discussionReactions");
  if (discussionReactions) {
    discussionOverrides.reactions = parseInputDiscussionReactions(discussionReactions);
  }
  const summaryOverrides = {};
  const summaryEnabled = getInput2("summaryEnabled");
  if (summaryEnabled) summaryOverrides.enabled = summaryEnabled === "true";
  const inputAssets = parseAssets(getInput2);
  const draft = getInput2("draft");
  const generateReleaseNotes = getInput2("generateReleaseNotes");
  const prerelease = getInput2("prerelease");
  const reactions = getInput2("reactions");
  const overrides = {};
  if (inputAssets.length > 0) {
    overrides.assets = [...base.assets, ...inputAssets];
  }
  if (Object.keys(checksumOverrides).length > 0) {
    overrides.checksum = checksumOverrides;
  }
  if (Object.keys(discussionOverrides).length > 0) {
    overrides.discussion = discussionOverrides;
  }
  if (Object.keys(summaryOverrides).length > 0) {
    overrides.summary = summaryOverrides;
  }
  if (draft) overrides.draft = draft === "true";
  if (generateReleaseNotes) {
    overrides.generateReleaseNotes = generateReleaseNotes === "true";
  }
  if (prerelease) overrides.prerelease = prerelease === "true";
  if (reactions) overrides.reactions = parseReleaseReactions(reactions);
  return Object.keys(overrides).length > 0 ? overrides : void 0;
}
function parseConfig(yaml) {
  if (!yaml) return validateConfig({});
  let parsed;
  try {
    parsed = load(yaml);
  } catch (error2) {
    const message = isError(error2) ? JSON.stringify(error2.message) : "unknown cause";
    const original = JSON.stringify(yaml);
    throw new Error(
      `Parsing of release configuration failed with ${message}. Provided value: ${original}`
    );
  }
  return validateConfig(parsed);
}
function parseAssets(getInput2) {
  const yaml = getInput2("assets");
  if (!yaml) return [];
  let parsed;
  try {
    parsed = load(yaml);
  } catch (error2) {
    const message = isError(error2) ? JSON.stringify(error2.message) : "unknown cause";
    const original = JSON.stringify(yaml);
    throw new Error(
      `Parsing of assets action input failed with ${message}. Provided value: ${original}`
    );
  }
  try {
    return validateAssets(parsed);
  } catch (error2) {
    if (!isError(error2)) throw error2;
    throw new Error(`Validation of assets action input failed: ${error2.stack}`);
  }
}
function parseInputDiscussionReactions(reactionList) {
  const reactions = [];
  for (const reaction of reactionList.split(",")) {
    if (!isDiscussionReaction(reaction)) {
      const quotedReaction = JSON.stringify(reaction);
      throw new Error(
        `Validation of discussionReactions action input failed. Invalid reaction ${quotedReaction}.`
      );
    }
    reactions.push(reaction);
  }
  return reactions;
}
function parseReleaseReactions(reactionList) {
  const reactions = [];
  for (const reaction of reactionList.split(",")) {
    if (!isReleaseReaction(reaction)) {
      const quotedReaction = JSON.stringify(reaction);
      throw new Error(
        `Validation of reactions action input failed. Invalid reaction ${quotedReaction}.`
      );
    }
    reactions.push(reaction);
  }
  return reactions;
}
function isDiscussionReaction(reaction) {
  return DISCUSSION_REACTIONS.includes(reaction);
}
function isFileNotFoundError(value) {
  if (!isObject(value)) return false;
  const code = value.code;
  return code === "ENOENT";
}
function isReleaseReaction(reaction) {
  return RELEASE_REACTIONS.includes(reaction);
}

// src/git.ts
import { exec, getExecOutput } from "@actions/exec";
async function configureGit({
  env,
  group: group2,
  info: info2,
  silent = false
}) {
  return group2("Marking the GitHub workspace as a safe directory", async () => {
    const { GITHUB_WORKSPACE = "" } = env;
    if (GITHUB_WORKSPACE === "") {
      info2("No GitHub workspace defined");
      return true;
    }
    const exitCode = await exec(
      "git",
      ["config", "--global", "--add", "safe.directory", GITHUB_WORKSPACE],
      { silent }
    );
    return exitCode === 0;
  });
}
async function determineRef({
  group: group2,
  info: info2,
  silent = false
}) {
  return group2("Determining the current Git ref", async () => {
    const { stdout } = await getExecOutput(
      "git",
      ["describe", "--exact-match", "--all"],
      { silent }
    );
    const ref = `refs/${stdout.trim()}`;
    info2(ref);
    return ref;
  });
}
async function determineTagType({
  group: group2,
  silent = false,
  tag
}) {
  try {
    const { stdout: type } = await group2(
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
async function fetchTagAnnotation({
  group: group2,
  silent = false,
  tag
}) {
  try {
    const exitCode = await group2(
      "Fetching the tag annotation",
      async () => exec(
        "git",
        [
          "fetch",
          "origin",
          "--no-tags",
          "--force",
          `refs/tags/${tag}:refs/tags/${tag}`
        ],
        { silent }
      )
    );
    return exitCode === 0;
  } catch {
    return false;
  }
}
async function readTagAnnotation({
  group: group2,
  silent = false,
  tag
}) {
  try {
    const { stdout: tagSubject } = await group2(
      "Reading the tag annotation subject",
      async () => {
        return getExecOutput(
          "git",
          ["tag", "-n1", "--format", "%(contents:subject)", tag],
          { silent }
        );
      }
    );
    const { stdout: tagBody } = await group2(
      "Reading the tag annotation body",
      async () => {
        return getExecOutput(
          "git",
          ["tag", "-n1", "--format", "%(contents:body)", tag],
          { silent }
        );
      }
    );
    return [true, tagSubject.trim(), tagBody.trim()];
  } catch {
    return [false, "", ""];
  }
}

// src/octokit.ts
import { Octokit } from "@octokit/action";
import { retry } from "@octokit/plugin-retry";
function createOctokit(token) {
  const CustomOctokit = Octokit.plugin(retry);
  return new CustomOctokit({ auth: token });
}
function isRequestError(value) {
  if (!isObject(value)) return false;
  const response = value.response;
  const data = response?.data;
  return typeof data === "object" && data != null;
}

// src/discussion.ts
async function getDiscussionIdByUrl({
  graphql,
  owner,
  repo,
  setOutput: setOutput2,
  url
}) {
  const query = `
    query getDiscussionIdByNumber ($owner: String!, $repo: String!, $number: Int!) {
      repository (owner: $owner, name: $repo) {
        discussion (number: $number) {
          id
        }
      }
    }
  `;
  const number = getDiscussionNumberByUrl(url);
  setOutput2(DISCUSSION_NUMBER, number);
  setOutput2(DISCUSSION_URL, url);
  const result = await graphql({
    query,
    owner,
    repo,
    number
  });
  const id = result.repository.discussion.id;
  setOutput2(DISCUSSION_ID, id);
  return id;
}
function getDiscussionNumberByUrl(url) {
  const { pathname } = new URL(url);
  const numberString = decodeURIComponent(pathname.split("/").pop());
  return parseInt(numberString, 10);
}

// src/reaction.ts
async function createDiscussionReactions({
  config: config2,
  graphql,
  group: group2,
  info: info2,
  owner,
  release,
  repo,
  setOutput: setOutput2
}) {
  if (config2.discussion.reactions.length < 1) {
    info2("No release discussion reactions to create");
    return;
  }
  if (!release.discussion_url) {
    info2("No release discussion to react to");
    return;
  }
  await group2("Creating release discussion reactions", async () => {
    const discussionId = await getDiscussionIdByUrl({
      graphql,
      owner,
      repo,
      setOutput: setOutput2,
      url: release.discussion_url ?? ""
    });
    await Promise.all(config2.discussion.reactions.map(createReaction));
    async function createReaction(content) {
      const query = `
        mutation createDiscussionReaction ($discussionId: ID!, $content: ReactionContent!) {
          addReaction (input: {subjectId: $discussionId, content: $content}) {
            clientMutationId
          }
        }
      `;
      await graphql({
        query,
        discussionId,
        content: REACTION_NAMES[content]
      });
      info2(`Created ${content} reaction`);
    }
  });
}
async function createReleaseReactions({
  config: config2,
  group: group2,
  info: info2,
  owner,
  reactions,
  release,
  repo
}) {
  if (config2.reactions.length < 1) {
    info2("No release reactions to create");
    return;
  }
  await group2("Creating release reactions", async () => {
    await Promise.all(config2.reactions.map(createReaction));
    async function createReaction(content) {
      await reactions.createForRelease({
        owner,
        repo,
        release_id: release.id,
        content
      });
      info2(`Created ${content} reaction`);
    }
  });
}

// src/ref.ts
var SHORTHAND_PATTERN = /^v?([1-9]\d*)(\.\d+)?$/;
var SEMVER_PATTERN = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
function parseRef(ref) {
  const tagMatch = ref.match(/^refs\/tags\/(.*)$/);
  if (tagMatch == null) {
    return {
      isTag: false,
      isSemVer: false,
      isStable: false,
      tag: void 0
    };
  }
  const [
    ,
    /*full*/
    tag
  ] = tagMatch;
  if (SHORTHAND_PATTERN.test(tag)) {
    return {
      isTag: true,
      isSemVer: false,
      isStable: true,
      tag
    };
  }
  const semVerMatch = SEMVER_PATTERN.exec(tag);
  if (semVerMatch != null) {
    const [
      ,
      /*full*/
      major,
      ,
      ,
      prerelease
    ] = semVerMatch;
    return {
      isTag: true,
      isSemVer: true,
      isStable: major !== "0" && prerelease == null,
      tag
    };
  }
  return {
    isTag: true,
    isSemVer: false,
    isStable: false,
    tag
  };
}

// src/release.ts
async function createOrUpdateRelease({
  config: config2,
  group: group2,
  info: info2,
  isStable,
  owner,
  releaseBody,
  repo,
  repos,
  tag,
  tagSubject
}) {
  const params = {
    owner,
    repo,
    tag_name: tag,
    name: tagSubject,
    body: releaseBody,
    draft: config2.draft,
    prerelease: config2.prerelease ?? !isStable,
    discussion_category_name: config2.discussion.category || void 0
  };
  const createdRelease = await group2(
    "Attempting to create a release",
    async () => {
      try {
        const { data } = await repos.createRelease(params);
        info2(JSON.stringify(data, null, 2));
        return data;
      } catch (error2) {
        if (!isRequestError(error2)) throw error2;
        const errors = error2.response.data.errors ?? [];
        const isExisting = errors.some(
          ({ resource, code }) => resource === "Release" && code === "already_exists"
        );
        if (!isExisting) throw error2;
        info2(JSON.stringify(error2.response.data, null, 2));
      }
      return void 0;
    }
  );
  if (createdRelease) return [createdRelease, true];
  info2("Existing release detected");
  const existingRelease = await group2(
    "Fetching the existing release",
    async () => {
      const { data } = await repos.getReleaseByTag({ owner, repo, tag });
      info2(JSON.stringify(data, null, 2));
      return data;
    }
  );
  const updatedRelease = await group2(
    "Updating the existing release",
    async () => {
      const { data } = await repos.updateRelease({
        ...params,
        release_id: existingRelease.id
      });
      info2(JSON.stringify(data, null, 2));
      return data;
    }
  );
  return [updatedRelease, false];
}

// src/summary.ts
import { gfmToMarkdown } from "mdast-util-gfm";
import { toMarkdown } from "mdast-util-to-markdown";
var BODY_TOKEN = "{{GITHUB_RELEASE_ACTION_BODY}}";
function renderSummary({
  release,
  tagger,
  tagHtmlUrl,
  wasCreated
}) {
  const { discussion_url, draft, html_url, prerelease, tag_name } = release;
  const body = release.body ?? "";
  const name = release.name ?? "";
  const hasTagger = tagger?.avatarUrl && tagger?.login;
  const rendered = toMarkdown(
    {
      type: "root",
      children: [
        ...titleAST(),
        ...taggerAST(),
        ...detailsAST(),
        ...bodyAST(),
        ...definitionsAST()
      ]
    },
    {
      extensions: [gfmToMarkdown()]
    }
  );
  return rendered.replace(BODY_TOKEN, body);
  function titleAST() {
    const action = (() => {
      if (draft) return wasCreated ? "Drafted release " : "Re-drafted release ";
      return wasCreated ? "Released " : "Re-released ";
    })();
    return [
      {
        type: "heading",
        depth: 3,
        children: [
          {
            type: "text",
            value: action
          },
          {
            type: "linkReference",
            identifier: "release-url",
            label: "release-url",
            referenceType: "full",
            children: [
              {
                type: "text",
                value: name
              }
            ]
          }
        ]
      }
    ];
  }
  function taggerAST() {
    if (!hasTagger) return [];
    const { avatarUrl, login } = tagger;
    return [
      createTableAST(
        void 0,
        [
          [
            {
              type: "html",
              value: `<img alt="@${login}" src="${avatarUrl}" width="32">`
            }
          ],
          [
            {
              type: "text",
              value: "Tagged by "
            },
            {
              type: "text",
              value: `@${login}`
            }
          ]
        ],
        []
      )
    ];
  }
  function detailsAST() {
    const headings = [
      [
        {
          type: "text",
          value: "Tag"
        }
      ],
      [
        {
          type: "text",
          value: "Stability"
        }
      ]
    ];
    const cells = [
      [
        {
          type: "linkReference",
          identifier: "tag-url",
          label: "tag-url",
          referenceType: "full",
          children: [
            {
              type: "inlineCode",
              value: tag_name
            }
          ]
        }
      ],
      [
        {
          type: "text",
          value: prerelease ? "\u26A0\uFE0F Pre-release" : "\u2705 Stable"
        }
      ]
    ];
    if (discussion_url) {
      headings.push([
        {
          type: "text",
          value: "Discussion"
        }
      ]);
      cells.push([
        {
          type: "linkReference",
          identifier: "discussion-url",
          label: "discussion-url",
          referenceType: "full",
          children: [
            {
              type: "text",
              value: `#${getDiscussionNumberByUrl(discussion_url)}`
            }
          ]
        }
      ]);
    }
    const align = headings.map(() => "left");
    return [createTableAST(align, headings, [cells])];
  }
  function bodyAST() {
    if (!body.trim()) return [];
    return createDetailsAST("<strong>Release body</strong>", [
      {
        type: "html",
        value: BODY_TOKEN
      }
    ]);
  }
  function definitionsAST() {
    const definitions = [];
    if (discussion_url) {
      definitions.push({
        type: "definition",
        identifier: "discussion-url",
        label: "discussion-url",
        url: discussion_url,
        title: null
      });
    }
    definitions.push(
      {
        type: "definition",
        identifier: "release-url",
        label: "release-url",
        url: html_url,
        title: null
      },
      {
        type: "definition",
        identifier: "tag-url",
        label: "tag-url",
        url: tagHtmlUrl,
        title: null
      }
    );
    return definitions;
  }
  function createDetailsAST(summaryHTML, children) {
    return [
      {
        type: "html",
        value: `<details><summary>${summaryHTML}</summary>`
      },
      ...children,
      {
        type: "html",
        value: "</details>"
      }
    ];
  }
  function createTableAST(align, headings, rows) {
    return {
      type: "table",
      align,
      children: [
        {
          type: "tableRow",
          children: headings.map((heading) => ({
            type: "tableCell",
            children: heading
          }))
        },
        ...rows.map(
          (row) => ({
            type: "tableRow",
            children: row.map(
              (children) => ({
                type: "tableCell",
                children
              })
            )
          })
        )
      ]
    };
  }
}

// src/tags.ts
import { join } from "path";
async function getTagger({
  graphql,
  owner,
  repo,
  tag
}) {
  const query = `
    query getTaggerByRef ($owner: String!, $repo: String!, $ref: String!) {
      repository (owner: $owner, name: $repo) {
        ref(qualifiedName: $ref) {
          target {
            ...on Tag {
              tagger {
                user {
                  login
                  avatarUrl
                }
              }
            }
          }
        }
      }
    }
  `;
  const result = await graphql({
    query,
    owner,
    repo,
    ref: `refs/tags/${tag}`
  });
  return result.repository.ref.target?.tagger?.user;
}
async function getTagHtmlUrl({
  repos,
  owner,
  repo,
  tag
}) {
  const { data } = await repos.get({ owner, repo });
  const url = new URL(data.html_url);
  url.pathname = join(url.pathname, "tree", tag);
  return url.toString();
}

// src/main.ts
main().catch((error2) => {
  const stack = isError(error2) ? error2.stack : void 0;
  setFailed(stack ?? "unknown cause");
});
async function main() {
  const config2 = await readConfig({ getInput, group, info });
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
  if (!await fetchTagAnnotation({ group, tag })) {
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
  if (typeof config2.prerelease === "boolean") {
    info(
      `Release has been explicitly configured to be a ${config2.prerelease ? "pre-release" : "stable release"}`
    );
    if (isStable === config2.prerelease) {
      info(
        `Normally, ${tagSemVerLabel} tag would have been treated as a ${tagStabilityLabel}`
      );
    }
  } else {
    info(`${tagSemVerLabel} tag will be treated as a ${tagStabilityLabel}`);
  }
  const [isTagAnnotationReadSuccess, tagSubject, tagBody] = await readTagAnnotation({ group, tag });
  if (!isTagAnnotationReadSuccess) {
    setFailed("Unable to read the tag annotation");
    return;
  }
  setOutput(TAG_BODY, tagBody);
  setOutput(TAG_SUBJECT, tagSubject);
  const {
    graphql,
    request,
    rest: { reactions, repos }
  } = createOctokit(getInput("token"));
  const tagger = await getTagger({ graphql, owner, repo, tag });
  if (tagger) {
    setOutput(TAGGER_AVATAR_URL, tagger.avatarUrl);
    setOutput(TAGGER_LOGIN, tagger.login);
  }
  const releaseBody = await renderReleaseBody({
    config: config2,
    env,
    group,
    info,
    owner,
    repo,
    repos,
    setOutput,
    tag,
    tagBody
  });
  setOutput(RELEASE_BODY, releaseBody);
  const [release, wasCreated] = await createOrUpdateRelease({
    config: config2,
    group,
    info,
    isStable,
    owner,
    releaseBody,
    repo,
    repos,
    tag,
    tagSubject
  });
  setOutput(RELEASE_ID, release.id);
  setOutput(RELEASE_NAME, release.name);
  setOutput(RELEASE_UPLOAD_URL, release.upload_url);
  setOutput(RELEASE_URL, release.html_url);
  setOutput(RELEASE_WAS_CREATED, wasCreated ? "true" : "");
  info(`${wasCreated ? "Created" : "Updated"} ${release.html_url}`);
  const [assetResult, assets2] = await modifyReleaseAssets({
    config: config2,
    error,
    group,
    info,
    owner,
    release,
    repo,
    repos,
    request,
    warning
  });
  if (!assetResult) setFailed("Unable to modify release assets");
  setOutput(ASSETS, JSON.stringify(assets2));
  await createReleaseReactions({
    config: config2,
    group,
    info,
    owner,
    reactions,
    release,
    repo
  });
  await createDiscussionReactions({
    config: config2,
    graphql,
    group,
    info,
    owner,
    release,
    repo,
    setOutput
  });
  if (config2.summary.enabled) {
    const tagHtmlUrl = await getTagHtmlUrl({ repos, owner, repo, tag });
    await summary.addRaw(renderSummary({ release, tagger, tagHtmlUrl, wasCreated })).write();
  }
}
//# sourceMappingURL=main.js.map
