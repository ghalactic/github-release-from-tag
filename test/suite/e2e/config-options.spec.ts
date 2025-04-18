import escapeStringRegExp from "escape-string-regexp";
import { launch, type Page } from "puppeteer";
import { beforeAll, describe, expect, it } from "vitest";
import {
  CONFUSED,
  EYES,
  HEART,
  HOORAY,
  LAUGH,
  REACTION_NAMES,
  ROCKET,
  THUMBS_DOWN,
  THUMBS_UP,
} from "../../../src/constant/reaction.js";
import { ReleaseData } from "../../../src/type/octokit.js";
import {
  SETUP_TIMEOUT,
  buildBodyExpression,
  buildBranchName,
  buildTagName,
  buildWorkflow,
} from "../../helpers/e2e.js";
import { owner, repo } from "../../helpers/fixture-repo.js";
import { readRunId } from "../../helpers/gha.js";
import {
  ReactionGroupData,
  WorkflowRunData,
  createBranchForCi,
  createTag,
  getDiscussionReactionGroupsByRelease,
  getReleaseByTag,
  waitForCompletedTagWorkflowRun,
} from "../../helpers/octokit.js";

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
      path: ".github/github-release-from-tag.yml",
      content: config,
    },
  ];

  let workflowRun: WorkflowRunData;
  let release: ReleaseData;
  let discussionReactionGroups: ReactionGroupData[];

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
    discussionReactionGroups = await getDiscussionReactionGroupsByRelease(
      owner,
      repo,
      release,
    );
  }, SETUP_TIMEOUT);

  it("produces a workflow run that concludes in success", () => {
    expect(workflowRun.conclusion).toBe("success");
  });

  it("produces the expected release discussion", () => {
    expect(release.discussion_url).toMatch(
      new RegExp(
        `^https://github.com/${regExpOwner}/${regExpRepo}/discussions/\\d+$`,
      ),
    );
  });

  it.each([[THUMBS_UP], [LAUGH], [HOORAY], [HEART], [ROCKET], [EYES]] as const)(
    "produces the expected release reactions (%s)",
    (reaction) => {
      const { reactions: { [reaction]: actual = 0 } = {} } = release;

      expect(actual).toBeGreaterThan(0);
    },
  );

  it.each([
    [THUMBS_UP],
    [THUMBS_DOWN],
    [LAUGH],
    [HOORAY],
    [CONFUSED],
    [HEART],
    [ROCKET],
    [EYES],
  ] as const)(
    "produces the expected release discussion reactions (%s)",
    (reaction) => {
      const group = discussionReactionGroups.find(
        (group) => group.content === REACTION_NAMES[reaction],
      );

      expect(group?.reactors?.totalCount ?? 0).toBeGreaterThan(0);
    },
  );

  describe("Browser-based tests", () => {
    let page: Page | undefined;

    beforeAll(async () => {
      if (!release) return;

      const browser = await launch({ args: ["--no-sandbox"] });
      page = await browser.newPage();
      await page.goto(release?.html_url);
    }, SETUP_TIMEOUT);

    it("appends generated release notes to the release body", async () => {
      expect(page).toBeDefined();

      expect(
        await page?.$$(
          buildBodyExpression(
            `//*[starts-with(normalize-space(), 'Full Changelog: ')]`,
          ),
        ),
      ).not.toHaveLength(0);
    });
  });
});
