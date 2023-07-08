import {
  buildBranchName,
  buildTagName,
  buildWorkflow,
  SETUP_TIMEOUT,
} from "../../helpers/e2e.js";
import { readRunId } from "../../helpers/gha.js";
import {
  AnnotationData,
  createBranchForCi,
  createTag,
  listAnnotationsByWorkflowRun,
  waitForCompletedTagWorkflowRun,
  WorkflowRunData,
} from "../../helpers/octokit.js";

describe("End-to-end tests", () => {
  describe("Lightweight tag", () => {
    const label = "lightweight-tag";
    const runId = readRunId();
    const branchName = buildBranchName(runId, label);
    const tagName = buildTagName("0.1.0", runId, label);
    const workflow = buildWorkflow(branchName);

    let workflowRun: WorkflowRunData;
    let annotations: AnnotationData[];

    beforeAll(async () => {
      const { headSha = "", workflowFileName } = await createBranchForCi(
        branchName,
        workflow,
      );
      await createTag(headSha, tagName);

      workflowRun = await waitForCompletedTagWorkflowRun(
        workflowFileName,
        tagName,
      );
      annotations = await listAnnotationsByWorkflowRun(workflowRun);
    }, SETUP_TIMEOUT);

    it("should produce a workflow run that concludes in failure", () => {
      expect(workflowRun.conclusion).toBe("failure");
    });

    it("should annotate the workflow run with a reason for the failure", () => {
      expect(annotations).toPartiallyContain({
        annotation_level: "failure",
        message: "Unable to create a release from a lightweight tag",
      });
    });
  });
});
