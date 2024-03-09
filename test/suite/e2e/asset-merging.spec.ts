import { beforeAll, describe, expect, it } from "vitest";
import { ReleaseData } from "../../../src/type/octokit.js";
import {
  SETUP_TIMEOUT,
  buildBranchName,
  buildTagName,
  buildWorkflow,
} from "../../helpers/e2e.js";
import { readRunId } from "../../helpers/gha.js";
import {
  WorkflowRunData,
  createBranchForCi,
  createTag,
  getReleaseByTag,
  waitForCompletedTagWorkflowRun,
} from "../../helpers/octokit.js";

describe("End-to-end tests", () => {
  describe("Asset merging", () => {
    const label = "asset-merging";
    const runId = readRunId();
    const branchName = buildBranchName(runId, label);
    const tagName = buildTagName("1.0.0", runId, label);
    const workflow = buildWorkflow(
      branchName,
      {
        assets: "${{ steps.listAssets.outputs.assets }}",
      },
      [
        {
          name: "List assets",
          id: "listAssets",
          run: `echo "assets=$(cat assets.json)" >> $GITHUB_OUTPUT`,
        },
      ],
    );

    const tagAnnotation = "1.0.0";

    const config = `checksum:
  generateAssets: false
assets:
  - path: assets/file-a.txt
    name: custom-name-a.txt
    label: Label for file-a.txt, which will download as custom-name-a.txt
`;

    const files = [
      {
        path: ".github/github-release-from-tag.yml",
        content: config,
      },
      {
        path: "assets.json",
        content: `${JSON.stringify([
          {
            path: "assets/file-b.txt",
            name: "custom-name-b.txt",
            label:
              "Label for file-b.txt, which will download as custom-name-b.txt",
          },
        ])}\n`,
      },
      {
        path: "assets/file-a.txt",
        content: "file-a\n",
      },
      {
        path: "assets/file-b.txt",
        content: "file-b\n",
      },
    ];

    let workflowRun: WorkflowRunData;
    let release: ReleaseData;

    beforeAll(async () => {
      const { headSha = "", workflowFileName } = await createBranchForCi(
        branchName,
        workflow,
        {
          files,
        },
      );

      await createTag(headSha, tagName, tagAnnotation);

      workflowRun = await waitForCompletedTagWorkflowRun(
        workflowFileName,
        tagName,
      );
      release = await getReleaseByTag(tagName);
    }, SETUP_TIMEOUT);

    it("should produce a workflow run that concludes in success", () => {
      expect(workflowRun.conclusion).toBe("success");
    });

    it.each`
      name                   | size | contentType     | label
      ${"custom-name-a.txt"} | ${7} | ${"text/plain"} | ${"Label for file-a.txt, which will download as custom-name-a.txt"}
      ${"custom-name-b.txt"} | ${7} | ${"text/plain"} | ${"Label for file-b.txt, which will download as custom-name-b.txt"}
    `(
      "should produce the expected release assets ($name)",
      ({ name, size, contentType, label }) => {
        expect(release.assets).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              state: "uploaded",
              name,
              size,
              content_type: contentType,
              label,
            }),
          ]),
        );
      },
    );

    it("should produce no sha256sum release checksum asset", async () => {
      expect(release.assets).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "checksums.sha256",
          }),
        ]),
      );
    });

    it("should produce no JSON release checksum asset", async () => {
      expect(release.assets).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: "checksums.json",
          }),
        ]),
      );
    });
  });
});
