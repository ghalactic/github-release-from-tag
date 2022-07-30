import { dump } from "js-yaml";

const OUTPUT_NAMES = [
  "assets",
  "discussionId",
  "discussionNumber",
  "discussionUrl",
  "generatedReleaseNotes",
  "releaseBody",
  "releaseId",
  "releaseName",
  "releaseUploadUrl",
  "releaseUrl",
  "releaseWasCreated",
  "tagBody",
  "tagBodyRendered",
  "tagIsSemVer",
  "tagIsStable",
  "tagName",
  "tagSubject",
];

const { GITHUB_ACTIONS, GITHUB_SHA } = process.env;

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

export function buildWorkflow(branchName, publishOptions = {}) {
  const exposeSteps = [];

  for (const name of OUTPUT_NAMES) {
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
            uses: "actions/checkout@v2",
          },
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

export const describeOrSkip =
  GITHUB_ACTIONS == "true" ? describe : describe.skip;
