export default {
  maxWorkers: 100,
  preset: "./jest.preset.js",
  setupFilesAfterEnv: ["jest-extended/all"],
  transformIgnorePatterns: [
    "src/main.js",
    "signal-exit", // see https://github.com/facebook/jest/issues/9503#issuecomment-708507112
  ],
  collectCoverageFrom: ["src/**/*"],
  coverageDirectory: "artifacts/coverage/jest",
  testMatch: ["**/test/**/*.spec.*"],
};
