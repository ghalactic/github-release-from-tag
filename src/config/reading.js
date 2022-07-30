import { readFile } from "fs/promises";
import { load } from "js-yaml";

import { validateAssets, validateConfig } from "./validation.js";

export async function readConfig({ getInput, group, info }) {
  return group("Reading release configuration", async () => {
    const [hasYaml, yaml] = await readConfigFile();

    if (!hasYaml)
      info("No configuration found at .github/release.eloquent.yml");

    const base = validateConfig(hasYaml ? load(yaml) : {});
    const [overrides, hasOverrides] = getConfigOverrides(getInput, base);

    if (hasOverrides) {
      info(`Base configuration: ${JSON.stringify(base, null, 2)}`);
      info(`Configuration overrides: ${JSON.stringify(overrides, null, 2)}`);
    }

    const effective = {
      ...base,
      ...overrides,
      discussion: { ...base.discussion, ...overrides.discussion },
    };

    info(`Effective configuration: ${JSON.stringify(effective, null, 2)}`);

    return effective;
  });
}

async function readConfigFile() {
  let data;

  try {
    data = await readFile(".github/release.eloquent.yml");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;

    return [false, undefined];
  }

  const yaml = data.toString().trim();

  return [yaml.length > 0, yaml];
}

function getConfigOverrides(getInput, base) {
  const discussionOverrides = {};
  const discussionCategory = getInput("discussionCategory");
  const discussionReactions = getInput("discussionReactions");

  if (discussionCategory) discussionOverrides.category = discussionCategory;
  if (discussionReactions)
    discussionOverrides.reactions = discussionReactions.split(",");

  const overrides = {};
  const inputAssets = parseAssetsJSON(getInput);
  const draft = getInput("draft");
  const generateReleaseNotes = getInput("generateReleaseNotes");
  const prerelease = getInput("prerelease");
  const reactions = getInput("reactions");

  if (inputAssets.length > 0)
    overrides.assets = [...base.assets, ...inputAssets];
  if (Object.keys(discussionOverrides).length > 0)
    overrides.discussion = discussionOverrides;
  if (draft) overrides.draft = draft === "true";
  if (generateReleaseNotes)
    overrides.generateReleaseNotes = generateReleaseNotes === "true";
  if (prerelease) overrides.prerelease = prerelease === "true";
  if (reactions) overrides.reactions = reactions.split(",");

  return [overrides, Object.keys(overrides).length > 0];
}

function parseAssetsJSON(getInput) {
  const json = getInput("assetsJSON");

  return json ? validateAssets(JSON.parse(json)) : [];
}
