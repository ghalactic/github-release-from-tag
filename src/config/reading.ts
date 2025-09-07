import { readFile } from "fs/promises";
import { load } from "js-yaml";
import { isError, isObject } from "../guard.js";
import configSchema from "../schema/config.v6.schema.json" with { type: "json" };
import type { GetInputFn, GroupFn, InfoFn } from "../type/actions.js";
import {
  AssetConfig,
  ChecksumConfig,
  Config,
  DiscussionConfig,
  SummaryConfig,
} from "../type/config.js";
import { DiscussionReaction, ReleaseReaction } from "../type/reaction.js";
import { validateAssets, validateConfig } from "./validation.js";

export async function readConfig({
  getInput,
  group,
  info,
}: {
  getInput: GetInputFn;
  group: GroupFn;
  info: InfoFn;
}): Promise<Config> {
  return group("Reading release configuration", async () => {
    const yaml = await readConfigFile();

    if (typeof yaml === "undefined") {
      info("No configuration found at .github/github-release-from-tag.yml");
    }

    const base = parseConfig(yaml);
    const overrides = getConfigOverrides(getInput, base);
    let checksum: ChecksumConfig,
      discussion: DiscussionConfig,
      summary: SummaryConfig;

    if (overrides) {
      info(`Base configuration: ${JSON.stringify(base, null, 2)}`);
      info(`Configuration overrides: ${JSON.stringify(overrides, null, 2)}`);

      checksum = { ...base.checksum, ...overrides.checksum };
      discussion = { ...base.discussion, ...overrides.discussion };
      summary = { ...base.summary, ...overrides.summary };
    } else {
      checksum = base.checksum;
      discussion = base.discussion;
      summary = base.summary;
    }

    const effective: Config = {
      ...base,
      ...overrides,
      checksum,
      discussion,
      summary,
    };

    info(`Effective configuration: ${JSON.stringify(effective, null, 2)}`);

    return effective;
  });
}

async function readConfigFile(): Promise<string | undefined> {
  let data;

  try {
    data = await readFile(".github/github-release-from-tag.yml");
  } catch (error) {
    if (!isFileNotFoundError(error)) throw error;

    return undefined;
  }

  return data.toString().trim();
}

function getConfigOverrides(
  getInput: GetInputFn,
  base: Config,
): ConfigOverrides | undefined {
  const checksumOverrides: ChecksumOverrides = {};

  const checksumGenerateAssets = getInput("checksumGenerateAssets");
  if (checksumGenerateAssets) {
    checksumOverrides.generateAssets = checksumGenerateAssets === "true";
  }

  const discussionOverrides: DiscussionOverrides = {};

  const discussionCategory = getInput("discussionCategory");
  if (discussionCategory) discussionOverrides.category = discussionCategory;

  const discussionReactions = getInput("discussionReactions");
  if (discussionReactions) {
    discussionOverrides.reactions =
      parseDiscussionReactions(discussionReactions);
  }

  const summaryOverrides: SummaryOverrides = {};

  const summaryEnabled = getInput("summaryEnabled");
  if (summaryEnabled) summaryOverrides.enabled = summaryEnabled === "true";

  const inputAssets = parseAssets(getInput);
  const draft = getInput("draft");
  const generateReleaseNotes = getInput("generateReleaseNotes");
  const prerelease = getInput("prerelease");
  const reactions = getInput("reactions");

  const overrides: ConfigOverrides = {};

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

  return Object.keys(overrides).length > 0 ? overrides : undefined;
}

function parseConfig(yaml: string | undefined): Config {
  if (!yaml) return validateConfig({});

  let parsed;

  try {
    parsed = load(yaml);
  } catch (error) {
    const message = isError(error)
      ? JSON.stringify(error.message)
      : "unknown cause";
    const original = JSON.stringify(yaml);

    throw new Error(
      `Parsing of release configuration failed with ${message}. Provided value: ${original}`,
    );
  }

  return validateConfig(parsed == null ? {} : parsed);
}

function parseAssets(getInput: GetInputFn): AssetConfig[] {
  const yaml = getInput("assets");

  if (!yaml) return [];

  let parsed;

  try {
    parsed = load(yaml);
  } catch (error) {
    const message = isError(error)
      ? JSON.stringify(error.message)
      : "unknown cause";
    const original = JSON.stringify(yaml);

    throw new Error(
      `Parsing of assets action input failed with ${message}. Provided value: ${original}`,
    );
  }

  try {
    return validateAssets(parsed);
  } catch (error) {
    if (!isError(error)) throw error;

    throw new Error(`Validation of assets action input failed: ${error.stack}`);
  }
}

function parseDiscussionReactions(reactionList: string): DiscussionReaction[] {
  const reactions: DiscussionReaction[] = [];

  for (const reaction of reactionList.split(",")) {
    if (!isDiscussionReaction(reaction)) {
      const quotedReaction = JSON.stringify(reaction);

      throw new Error(
        `Validation of discussionReactions action input failed. Invalid reaction ${quotedReaction}.`,
      );
    }

    reactions.push(reaction);
  }

  return reactions;
}

function parseReleaseReactions(reactionList: string): ReleaseReaction[] {
  const reactions: ReleaseReaction[] = [];

  for (const reaction of reactionList.split(",")) {
    if (!isReleaseReaction(reaction)) {
      const quotedReaction = JSON.stringify(reaction);

      throw new Error(
        `Validation of reactions action input failed. Invalid reaction ${quotedReaction}.`,
      );
    }

    reactions.push(reaction);
  }

  return reactions;
}

function isDiscussionReaction(
  reaction: string,
): reaction is DiscussionReaction {
  return configSchema.properties.discussion.properties.reactions.items.enum.includes(
    reaction,
  );
}

function isFileNotFoundError(value: unknown): value is { code: "ENOENT" } {
  if (!isObject(value)) return false;

  const code = value.code as string | undefined;

  return code === "ENOENT";
}

function isReleaseReaction(reaction: string): reaction is ReleaseReaction {
  return configSchema.properties.reactions.items.enum.includes(reaction);
}

type ConfigOverrides = {
  assets?: AssetConfig[];
  checksum?: ChecksumOverrides;
  discussion?: DiscussionOverrides;
  draft?: boolean;
  generateReleaseNotes?: boolean;
  prerelease?: boolean;
  reactions?: ReleaseReaction[];
  summary?: SummaryOverrides;
};

type ChecksumOverrides = {
  generateAssets?: boolean;
};

type DiscussionOverrides = {
  category?: string;
  reactions?: DiscussionReaction[];
};

type SummaryOverrides = {
  enabled?: boolean;
};
