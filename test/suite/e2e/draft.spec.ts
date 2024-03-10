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
        workflow,
      );
      await createTag(headSha, tagName, tagAnnotation);

      workflowRun = await waitForCompletedTagWorkflowRun(
        workflowFileName,
        tagName,
      );
      release = await getReleaseByTag(tagName);
    }, SETUP_TIMEOUT);

    it("produces a workflow run that concludes in success", () => {
      expect(workflowRun.conclusion).toBe("success");
    });

    it("produces a draft release", () => {
      expect(release.draft).toBe(true);
    });
  });
});
