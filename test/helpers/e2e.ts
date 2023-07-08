import { dump } from "js-yaml";
import * as outputs from "../../src/constant/output.js";

const { GITHUB_SHA } = process.env;

export const SETUP_TIMEOUT = 3 * 60 * 1000; // 3 minutes

export function buildBodyExpression(expression: string): string {
  return `//*[@data-test-selector="body-content"]${expression}`;
}

export function buildBranchName(runId: string, label: string): string {
  return `ci-${runId}-${label}`;
}

export function buildTagName(
  version: string,
  runId: string,
  label: string,
): string {
  return `${version}+ci-${runId}-${label}`;
}

export function buildWorkflow(
  branchName: string,
  publishOptions: unknown = {},
  preSteps: unknown[] = [],
): string {
  const exposeSteps = [];

  for (const name of Object.values(outputs)) {
    exposeSteps.push({
      name: `Expose outputs.${name}`,
      env: {
        PUBLISH_RELEASE_OUTPUT: `\${{ toJSON(steps.publishRelease.outputs.${name}) }}`,
      },
      run: `echo ::notice title=outputs.${name}::$PUBLISH_RELEASE_OUTPUT`,
    });
  }

  return dump({
    name: branchName,
    on: {
      push: {
        tags: ["*"],
      },
    },
    jobs: {
      publish: {
        name: "Publish release",
        "runs-on": "ubuntu-latest",
        permissions: {
          contents: "write",
          discussions: "write",
        },
        steps: [
          {
            name: "Checkout",
            uses: "actions/checkout@v3",
          },

          ...preSteps,

          {
            name: "Publish release",
            uses: `ghalactic/github-release-from-tag@${GITHUB_SHA || "main"}`,
            with: publishOptions,
            id: "publishRelease",
          },

          ...exposeSteps,
        ],
      },
    },
  });
}
