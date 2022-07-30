import { dump } from "js-yaml";
import {
  buildBranchName,
  buildTagName,
  buildWorkflow,
  describeOrSkip,
  SETUP_TIMEOUT,
} from "../../helpers/e2e.js";
import { readRunId } from "../../helpers/gha.js";
import {
  createBranchForCi,
  createTag,
  getReleaseByTag,
  waitForCompletedTagWorkflowRun,
} from "../../helpers/octokit.js";

describeOrSkip("End-to-end tests", () => {
  describe("Asset merging", () => {
    const label = "asset-merging";
    const runId = readRunId();
    const branchName = buildBranchName(runId, label);
    const tagName = buildTagName("1.0.0", runId, label);
    const workflow = buildWorkflow(
      branchName,
      {
        assetsJSON: "${{ steps.listAssets.outputs.assets }}",
        assetsYAML: dump([
          {
            path: "assets/file-c.txt",
            name: "custom-name-c.txt",
            label:
              "Label for file-c.txt, which will download as custom-name-c.txt",
          },
        ]),
      },
      [
        {
          name: "List assets",
          id: "listAssets",
          run: `echo ::set-output name=assets::$(cat assets.json)`,
        },
      ]
    );

    const tagAnnotation = "1.0.0";

    const config = `assets:
  - path: assets/file-a.txt
    name: custom-name-a.txt
    label: Label for file-a.txt, which will download as custom-name-a.txt
`;

    const files = [
      {
        path: ".github/release.eloquent.yml",
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
      {
        path: "assets/file-c.txt",
        content: "file-c\n",
      },
    ];

    let workflowRun, release;

    beforeAll(async () => {
      const { headSha, workflowFileName } = await createBranchForCi(
        branchName,
        workflow,
        {
          files,
        }
      );

      await createTag(headSha, tagName, tagAnnotation);

      workflowRun = await waitForCompletedTagWorkflowRun(
        workflowFileName,
        tagName
      );
      release = await getReleaseByTag(tagName);

      if (release?.html_url != null) await page.goto(release?.html_url);
    }, SETUP_TIMEOUT);

    it("should produce a workflow run that concludes in success", () => {
      expect(workflowRun.conclusion).toBe("success");
    });

    it.each`
      name                   | size | contentType     | label
      ${"custom-name-a.txt"} | ${7} | ${"text/plain"} | ${"Label for file-a.txt, which will download as custom-name-a.txt"}
      ${"custom-name-b.txt"} | ${7} | ${"text/plain"} | ${"Label for file-b.txt, which will download as custom-name-b.txt"}
      ${"custom-name-c.txt"} | ${7} | ${"text/plain"} | ${"Label for file-c.txt, which will download as custom-name-c.txt"}
    `(
      "should produce the expected release assets ($name)",
      ({ name, size, contentType, label }) => {
        expect(release.assets).toPartiallyContain({
          state: "uploaded",
          name,
          size,
          content_type: contentType,
          label,
        });
      }
    );
  });
});
