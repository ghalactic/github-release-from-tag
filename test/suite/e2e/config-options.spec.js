import escapeStringRegExp from "escape-string-regexp";
import { GRAPHQL_REACTION_CONTENT } from "../../../src/reaction.js";
import {
  buildBodyExpression,
  buildBranchName,
  buildTagName,
  buildWorkflow,
  SETUP_TIMEOUT,
} from "../../helpers/e2e.js";
import { owner, repo } from "../../helpers/fixture-repo.js";
import { readRunId } from "../../helpers/gha.js";
import {
  createBranchForCi,
  createTag,
  getDiscussionReactionGroupsByRelease,
  getReleaseByTag,
  waitForCompletedTagWorkflowRun,
} from "../../helpers/octokit.js";

describe("End-to-end tests", () => {
  const regExpOwner = escapeStringRegExp(owner);
  const regExpRepo = escapeStringRegExp(repo);

  describe("Config options", () => {
    const label = "config-options";
    const runId = readRunId();
    const branchName = buildBranchName(runId, label);
    const tagName = buildTagName("1.0.0", runId, label);
    const workflow = buildWorkflow(branchName);

    const tagAnnotation = "1.0.0";

    const config = `discussion:
  category: releases
  reactions:
    - "+1"
    - "-1"
    - laugh
    - hooray
    - confused
    - heart
    - rocket
    - eyes
generateReleaseNotes: true
reactions:
  - "+1"
  - laugh
  - hooray
  - heart
  - rocket
  - eyes
summary:
  enabled: false
`;

    const files = [
      {
        path: ".github/release.eloquent.yml",
        content: config,
      },
    ];

    let workflowRun, release, discussionReactionGroups;

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
      discussionReactionGroups = await getDiscussionReactionGroupsByRelease(
        owner,
        repo,
        release
      );

      if (release?.html_url != null) await page.goto(release?.html_url);
    }, SETUP_TIMEOUT);

    it("should produce a workflow run that concludes in success", () => {
      expect(workflowRun.conclusion).toBe("success");
    });

    it("should append generated release notes to the release body", async () => {
      const expression = `//*[normalize-space()='Full Changelog: https://github.com/${owner}/${repo}/commits/${tagName}']`;

      expect(await page.$x(buildBodyExpression(expression))).not.toBeEmpty();
    });

    it("should produce the expected release discussion", () => {
      expect(release.discussion_url).toMatch(
        new RegExp(
          `^https://github.com/${regExpOwner}/${regExpRepo}/discussions/\\d+$`
        )
      );
    });

    it.each([["+1"], ["laugh"], ["hooray"], ["heart"], ["rocket"], ["eyes"]])(
      "should produce the expected release reactions (%s)",
      (reaction) => {
        const { reactions: { [reaction]: actual = 0 } = {} } = release;

        expect(actual).toBeGreaterThan(0);
      }
    );

    it.each([
      ["+1"],
      ["-1"],
      ["laugh"],
      ["hooray"],
      ["confused"],
      ["heart"],
      ["rocket"],
      ["eyes"],
    ])(
      "should produce the expected release discussion reactions (%s)",
      (reaction) => {
        const group = discussionReactionGroups.find(
          (group) => group.content === GRAPHQL_REACTION_CONTENT[reaction]
        );

        expect(group?.reactors?.totalCount ?? 0).toBeGreaterThan(0);
      }
    );
  });
});
