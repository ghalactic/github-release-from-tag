import { dump } from "js-yaml";
import * as outputs from "../../src/outputs.js";

const { GITHUB_SHA } = process.env;

export const SETUP_TIMEOUT = 3 * 60 * 1000; // 3 minutes

export function buildBodyExpression(expression) {
  return `//*[@data-test-selector="body-content"]${expression}`;
}

export function buildBranchName(runId, label) {
  return `ci-${runId}-${label}`;
}

export function buildTagName(version, runId, label) {
  return `${version}+ci-${runId}-${label}`;
}

export function buildWorkflow(branchName, publishOptions = {}, preSteps = []) {
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
        "runs-on": "ubuntu-latest",
        name: "Publish release",
        steps: [
          {
            name: "Checkout",
            uses: "actions/checkout@v3",
          },

          ...preSteps,

          {
            name: "Publish release",
            uses: `eloquent/github-release-action@${GITHUB_SHA || "main"}`,
            with: publishOptions,
            id: "publishRelease",
          },

          ...exposeSteps,
        ],
      },
    },
  });
}
