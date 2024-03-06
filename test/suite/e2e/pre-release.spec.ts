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
  describe("Pre-release", () => {
    const label = "pre-release";
    const runId = readRunId();
    const branchName = buildBranchName(runId, label);
    const tagName = buildTagName("0.1.0", runId, label);
    const workflow = buildWorkflow(branchName);

    const tagAnnotation = "0.1.0";

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

    it("should produce a workflow run that concludes in success", () => {
      expect(workflowRun.conclusion).toBe("success");
    });

    it("should produce a pre-release", () => {
      expect(release.prerelease).toBe(true);
    });
  });
});
