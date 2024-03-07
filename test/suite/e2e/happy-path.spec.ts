import escapeStringRegExp from "escape-string-regexp";
import { launch } from "puppeteer";
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
import { getDiscussionNumberByUrl } from "../../../src/discussion.js";
import { isError } from "../../../src/guard.js";
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
  AnnotationData,
  ReactionGroupData,
  WorkflowRunData,
  createBranchForCi,
  createTag,
  getDiscussionReactionGroupsByRelease,
  getReleaseByTag,
  listAnnotationsByWorkflowRun,
  waitForCompletedTagWorkflowRun,
} from "../../helpers/octokit.js";

describe("End-to-end tests", () => {
  const regExpOwner = escapeStringRegExp(owner);
  const regExpRepo = escapeStringRegExp(repo);

  describe("Happy path", () => {
    const label = "happy-path";
    const runId = readRunId();
    const branchName = buildBranchName(runId, label);
    const tagName = buildTagName("1.0.0", runId, label);
    const workflow = buildWorkflow(branchName, {
      discussionCategory: "releases",
      discussionReactions: "+1,-1,laugh,hooray,confused,heart,rocket,eyes",
      generateReleaseNotes: "true",
      reactions: "+1,laugh,hooray,heart,rocket,eyes",
    });

    const tagAnnotation = `1.0.0
this
should
form
the
release
name

# Heading 1
## Heading 2

this
should
form
one
paragraph

@actions

> [!IMPORTANT]
> this should be an alert
`;

    const config = `assets:
  - path: assets/json/file-b.json
    name: custom-name-b.json
    label: Label for file-b.json, which will download as custom-name-b.json
  - path: assets/text/file-c.*.txt
    name: custom-name-c.txt
  - path: assets/text/file-a.txt
  - path: assets/json/file-d.*.json
  - path: assets/optional/*
    optional: true
`;

    const files = [
      {
        path: ".github/github-release-from-tag.yml",
        content: config,
      },
      {
        path: "assets/text/file-a.txt",
        content: "file-a\n",
      },
      {
        path: "assets/json/file-b.json",
        content: '{"file-b":true}\n',
      },
      {
        // makes a filename like "file-c.2572064453.txt"
        path: `assets/text/file-c.${Math.floor(
          Math.random() * 10000000000,
        )}.txt`,
        content: "file-c\n",
      },
      {
        path: "assets/json/file-d.0.json",
        content: '{"file-d":0}\n',
      },
      {
        path: "assets/json/file-d.1.json",
        content: '{"file-d":1}\n',
      },
    ];

    // points to a commit history with PRs for generating release notes
    const parentCommit = "9db47d2f820af6941f9ccbb9885898fce0cc760a";

    let workflowRun: WorkflowRunData;
    let annotations: AnnotationData[];
    let release: ReleaseData;
    let discussionReactionGroups: ReactionGroupData[];
    let outputs: Record<string, unknown>;

    beforeAll(async () => {
      const { headSha = "", workflowFileName } = await createBranchForCi(
        branchName,
        workflow,
        {
          commit: parentCommit,
          files,
        },
      );

      await createTag(headSha, tagName, tagAnnotation);

      workflowRun = await waitForCompletedTagWorkflowRun(
        workflowFileName,
        tagName,
      );
      annotations = await listAnnotationsByWorkflowRun(workflowRun);
      release = await getReleaseByTag(tagName);
      discussionReactionGroups = await getDiscussionReactionGroupsByRelease(
        owner,
        repo,
        release,
      );

      const outputsPrefix = "outputs.";
      outputs = {};

      for (const { title, message } of annotations) {
        if (!title?.startsWith(outputsPrefix)) continue;

        try {
          outputs[title.substring(outputsPrefix.length)] = JSON.parse(
            message ?? "null",
          );
        } catch (error) {
          const message = isError(error) ? error.message : "unknown cause";
          throw new Error(`Unable to parse ${title}: ${message}`);
        }
      }
    }, SETUP_TIMEOUT);

    it("should produce a workflow run that concludes in success", () => {
      expect(workflowRun.conclusion).toBe("success");
    });

    it("should produce a stable release", () => {
      expect(release.prerelease).toBe(false);
    });

    it("should produce a published release", () => {
      expect(release.draft).toBe(false);
    });

    it("should produce the expected release name", () => {
      expect(release.name).toBe("1.0.0 this should form the release name");
    });

    it.each`
      description              | expression
      ${"markdown heading 1"}  | ${`//h1[normalize-space()='Heading 1']`}
      ${"markdown heading 2"}  | ${`//h2[normalize-space()='Heading 2']`}
      ${"markdown paragraphs"} | ${`//*[normalize-space()='this should form one paragraph']`}
      ${"mention"}             | ${`//a[@href='https://github.com/actions'][normalize-space()='@actions']`}
      ${"alert"}               | ${`//*[contains(concat(' ', normalize-space(@class), ' '), ' markdown-alert-important ')]/p[not(contains(concat(' ', normalize-space(@class), ' '), ' markdown-alert-title '))][normalize-space()='this should be an alert']`}
      ${"release notes"}       | ${`//*[normalize-space()='Full Changelog: https://github.com/${owner}/${repo}/commits/${tagName}']`}
    `(
      "should produce the expected release body elements ($description)",
      async ({ expression }) => {
        expect(release).toBeDefined();

        const browser = await launch();
        const page = await browser.newPage();
        await page.goto(release?.html_url);

        expect(await page.$$(buildBodyExpression(expression))).not.toHaveLength(
          0,
        );
      },
    );

    it.each`
      name                    | size  | contentType           | label
      ${"file-a.txt"}         | ${7}  | ${"text/plain"}       | ${""}
      ${"custom-name-b.json"} | ${16} | ${"application/json"} | ${"Label for file-b.json, which will download as custom-name-b.json"}
      ${"custom-name-c.txt"}  | ${7}  | ${"text/plain"}       | ${""}
      ${"file-d.0.json"}      | ${13} | ${"application/json"} | ${""}
      ${"file-d.1.json"}      | ${13} | ${"application/json"} | ${""}
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

    it("should produce the expected release discussion", () => {
      expect(release.discussion_url).toMatch(
        new RegExp(
          `^https://github.com/${regExpOwner}/${regExpRepo}/discussions/\\d+$`,
        ),
      );
    });

    it.each([
      [THUMBS_UP],
      [LAUGH],
      [HOORAY],
      [HEART],
      [ROCKET],
      [EYES],
    ] as const)(
      "should produce the expected release reactions (%s)",
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
      "should produce the expected release discussion reactions (%s)",
      (reaction) => {
        const group = discussionReactionGroups.find(
          (group) => group.content === REACTION_NAMES[reaction],
        );

        expect(group?.reactors?.totalCount ?? 0).toBeGreaterThan(0);
      },
    );

    describe("Outputs", () => {
      it("should produce the correct assets output", () => {
        const downloadUrlPrefix = `https://github.com/${owner}/${repo}/releases/download/${encodeURIComponent(
          tagName,
        )}`;
        const commonFields = {
          apiUrl: expect.stringMatching(
            new RegExp(
              `^https://api.github.com/repos/${regExpOwner}/${regExpRepo}/releases/assets/\\d+$`,
            ),
          ),
          id: expect.any(Number),
          nodeId: expect.any(String),
          state: "uploaded",
          downloadCount: expect.any(Number),
          createdAt: expect.stringMatching(
            /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ$/,
          ),
          updatedAt: expect.stringMatching(
            /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ$/,
          ),
        };

        expect(outputs.assets).toBeTypeOf("string");
        expect(JSON.parse(outputs.assets as string)).toEqual([
          {
            ...commonFields,
            downloadUrl: `${downloadUrlPrefix}/custom-name-b.json`,
            name: "custom-name-b.json",
            label:
              "Label for file-b.json, which will download as custom-name-b.json",
            contentType: "application/json",
            size: 16,
          },
          {
            ...commonFields,
            downloadUrl: `${downloadUrlPrefix}/custom-name-c.txt`,
            name: "custom-name-c.txt",
            label: "",
            contentType: "text/plain",
            size: 7,
          },
          {
            ...commonFields,
            downloadUrl: `${downloadUrlPrefix}/file-a.txt`,
            name: "file-a.txt",
            label: "",
            contentType: "text/plain",
            size: 7,
          },
          {
            ...commonFields,
            downloadUrl: `${downloadUrlPrefix}/file-d.0.json`,
            name: "file-d.0.json",
            label: "",
            contentType: "application/json",
            size: 13,
          },
          {
            ...commonFields,
            downloadUrl: `${downloadUrlPrefix}/file-d.1.json`,
            name: "file-d.1.json",
            label: "",
            contentType: "application/json",
            size: 13,
          },
        ]);
      });

      it("should produce the correct generatedReleaseNotes output", () => {
        expect(outputs.generatedReleaseNotes).toContain("Full Changelog");
      });

      it("should produce the correct discussionId output", () => {
        expect(outputs.discussionId).toMatch(/^D_/);
      });

      it("should produce the correct discussionNumber output", () => {
        expect(outputs.discussionNumber).toBe(
          String(getDiscussionNumberByUrl(release.discussion_url ?? "")),
        );
      });

      it("should produce the correct discussionUrl output", () => {
        expect(outputs.discussionUrl).toBe(release.discussion_url);
      });

      it("should produce the correct releaseBody output", () => {
        expect(outputs.releaseBody).toBe(release.body);
      });

      it("should produce the correct releaseId output", () => {
        expect(outputs.releaseId).toBe(String(release.id));
      });

      it("should produce the correct releaseName output", () => {
        expect(outputs.releaseName).toBe(release.name);
      });

      it("should produce the correct releaseUploadUrl output", () => {
        expect(outputs.releaseUploadUrl).toBe(release.upload_url);
      });

      it("should produce the correct releaseUrl output", () => {
        expect(outputs.releaseUrl).toBe(release.html_url);
      });

      it("should produce the correct releaseWasCreated output", () => {
        expect(outputs.releaseWasCreated).toBe("true");
      });

      it("should produce the correct taggerAvatarUrl output", () => {
        expect(outputs.taggerAvatarUrl).toContain(
          "https://avatars.githubusercontent.com/",
        );
      });

      it("should produce the correct taggerLogin output", () => {
        expect(outputs.taggerLogin).toMatch(/^.+$/);
      });

      it("should produce the correct tagBody output", () => {
        expect(outputs.tagBody).toContain("# Heading 1");
      });

      it("should produce the correct tagBodyRendered output", () => {
        expect(outputs.tagBodyRendered).toContain(
          "this should form one paragraph",
        );
      });

      it("should produce the correct tagIsSemVer output", () => {
        expect(outputs.tagIsSemVer).toBe("true");
      });

      it("should produce the correct tagIsStable output", () => {
        expect(outputs.tagIsStable).toBe("true");
      });

      it("should produce the correct tagName output", () => {
        expect(outputs.tagName).toBe(tagName);
      });

      it("should produce the correct tagSubject output", () => {
        expect(outputs.tagSubject).toBe(
          "1.0.0 this should form the release name",
        );
      });
    });
  });
});
