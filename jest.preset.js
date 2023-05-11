import esPreset from "es-jest/jest-preset.js";
import puppeteerPreset from "jest-puppeteer/jest-preset.js";

const { GITHUB_ACTIONS } = process.env;

export default {
  ...(GITHUB_ACTIONS == "true" ? { ...puppeteerPreset } : {}),
  ...esPreset,
};
