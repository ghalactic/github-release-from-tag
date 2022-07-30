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
  describe("Stability override", () => {
    const label = "stability-override";
    const runId = readRunId();
    const branchName = buildBranchName(runId, label);
    const tagName = buildTagName("0.1.0", runId, label);
    const workflow = buildWorkflow(branchName, {
      prerelease: "false",
    });

    const tagAnnotation = "0.1.0";

    let workflowRun, release;

    beforeAll(async () => {
      const { headSha, workflowFileName } = await createBranchForCi(
        branchName,
        workflow
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

    it("should produce a stable release", () => {
      expect(release.prerelease).toBe(false);
    });
  });
});
