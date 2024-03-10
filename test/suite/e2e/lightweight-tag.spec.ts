import { beforeAll, describe, expect, it } from "vitest";
import {
  SETUP_TIMEOUT,
  buildBranchName,
  buildTagName,
  buildWorkflow,
} from "../../helpers/e2e.js";
import { readRunId } from "../../helpers/gha.js";
import {
  AnnotationData,
  WorkflowRunData,
  createBranchForCi,
  createTag,
  listAnnotationsByWorkflowRun,
  waitForCompletedTagWorkflowRun,
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

    it("produces a workflow run that concludes in failure", () => {
      expect(workflowRun.conclusion).toBe("failure");
    });

    it("annotates the workflow run with a reason for the failure", () => {
      expect(annotations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            annotation_level: "failure",
            message: "Unable to create a release from a lightweight tag",
          }),
        ]),
      );
    });
  });
});
