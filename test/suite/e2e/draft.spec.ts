import { ReleaseData } from "../../../src/type/octokit.js";
import {
  buildBranchName,
  buildTagName,
  buildWorkflow,
  SETUP_TIMEOUT,
} from "../../helpers/e2e.js";
import { readRunId } from "../../helpers/gha.js";
import {
  createBranchForCi,
  createTag,
  getReleaseByTag,
  waitForCompletedTagWorkflowRun,
  WorkflowRunData,
} from "../../helpers/octokit.js";

describe("End-to-end tests", () => {
  describe("Draft", () => {
    const label = "draft";
    const runId = readRunId();
    const branchName = buildBranchName(runId, label);
    const tagName = buildTagName("1.0.0", runId, label);
    const workflow = buildWorkflow(branchName, {
      draft: true,
    });

    const tagAnnotation = "1.0.0";

    let workflowRun: WorkflowRunData;
    let release: ReleaseData;

    beforeAll(async () => {
      const { headSha = "", workflowFileName } = await createBranchForCi(
        branchName,
        workflow
      );
      await createTag(headSha, tagName, tagAnnotation);

      workflowRun = await waitForCompletedTagWorkflowRun(
        workflowFileName,
        tagName
      );
      release = await getReleaseByTag(tagName);
    }, SETUP_TIMEOUT);

    it("should produce a workflow run that concludes in success", () => {
      expect(workflowRun.conclusion).toBe("success");
    });

    it("should produce a draft release", () => {
      expect(release.draft).toBe(true);
    });
  });
});
