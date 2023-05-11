const { GITHUB_ACTIONS } = process.env;
const isGHA = GITHUB_ACTIONS === "true";

const common = {
  setupFilesAfterEnv: ["jest-extended/all"],
  transformIgnorePatterns: [
    "src/main.js",
    "signal-exit", // see https://github.com/facebook/jest/issues/9503#issuecomment-708507112
  ],
};

/** @type {import('jest').Config} */
const config = {
  collectCoverageFrom: ["src/**/*"],
  coverageDirectory: "artifacts/coverage/jest",
  projects: [
    {
      ...common,
      displayName: "unit",
      preset: "es-jest",
      testMatch: ["<rootDir>/test/suite/unit/**/*.spec.*"],
    },
  ],
};

if (isGHA) {
  Object.assign(config, {
    // allow all E2E tests to run in parallel, since they are mostly idle
    maxWorkers: 20,
  });

  config.projects.push({
    ...common,
    displayName: "e2e",
    preset: "./jest.preset.e2e.js",
    testMatch: ["<rootDir>/test/suite/e2e/**/*.spec.*"],
  });
}

export default config;
