import { defineConfig } from "vitest/config";

const { GITHUB_ACTIONS } = process.env;
const isGHA = GITHUB_ACTIONS === "true";

export default defineConfig({
  test: {
    watch: false,

    include: [
      "test/suite/unit/**/*.spec.ts",
      // only run E2E tests on GitHub Actions
      ...(isGHA ? ["test/suite/e2e/**/*.spec.ts"] : []),
    ],

    pool: "forks",
    // allow all E2E tests to run in parallel, since they are mostly idle
    maxWorkers: isGHA ? 20 : undefined,

    coverage: {
      include: ["src/**/*.ts"],
      exclude: ["src/type/**"],
    },
  },
});
