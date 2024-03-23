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
import { getDiscussionNumberByUrl } from "../../../src/discussion.js";
import { isError } from "../../../src/guard.js";
import { AssetData, ReleaseData } from "../../../src/type/octokit.js";
import {
  SETUP_TIMEOUT,
  buildBodyExpression,
  buildBranchName,
  buildTagName,
  buildWorkflow,
} from "../../helpers/e2e.js";
import { owner, repo } from "../../helpers/fixture-repo.js";
import { readRunId } from "../../helpers/gha.js";
import { sha256Hex } from "../../helpers/hashing.js";
import {
  AnnotationData,
  ReactionGroupData,
  WorkflowRunData,
  createBranchForCi,
  createTag,
  getDiscussionReactionGroupsByRelease,
  getReleaseAssetContent,
  getReleaseByTag,
  listAnnotationsByWorkflowRun,
  waitForCompletedTagWorkflowRun,
} from "../../helpers/octokit.js";

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

  const fileA = {
    path: "assets/text/file-a.txt",
    content: "file-a\n",
  };
  const fileB = {
    path: "assets/json/file-b.json",
    content: '{"file-b":true}\n',
  };
  const fileC = {
    // makes a filename like "file-c.2572064453.txt"
    path: `assets/text/file-c.${Math.floor(Math.random() * 10000000000)}.txt`,
    content: "file-c\n",
  };
  const fileD0 = {
    path: "assets/json/file-d.0.json",
    content: '{"file-d":0}\n',
  };
  const fileD1 = {
    path: "assets/json/file-d.1.json",
    content: '{"file-d":1}\n',
  };
  const files = [
    {
      path: ".github/github-release-from-tag.yml",
      content: config,
    },
    fileA,
    fileB,
    fileC,
    fileD0,
    fileD1,
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

  it("produces a workflow run that concludes in success", () => {
    expect(workflowRun.conclusion).toBe("success");
  });

  it("produces a stable release", () => {
    expect(release.prerelease).toBe(false);
  });

  it("produces a published release", () => {
    expect(release.draft).toBe(false);
  });

  it("produces the expected release name", () => {
    expect(release.name).toBe("1.0.0 this should form the release name");
  });

  it.each`
    name                    | size  | contentType           | label
    ${"file-a.txt"}         | ${7}  | ${"text/plain"}       | ${""}
    ${"custom-name-b.json"} | ${16} | ${"application/json"} | ${"Label for file-b.json, which will download as custom-name-b.json"}
    ${"custom-name-c.txt"}  | ${7}  | ${"text/plain"}       | ${""}
    ${"file-d.0.json"}      | ${13} | ${"application/json"} | ${""}
    ${"file-d.1.json"}      | ${13} | ${"application/json"} | ${""}
  `(
    "produces the expected release assets ($name)",
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

  it("produces the expected release discussion", () => {
    expect(release.discussion_url).toMatch(
      new RegExp(
        `^https://github.com/${regExpOwner}/${regExpRepo}/discussions/\\d+$`,
      ),
    );
  });

  it("produces the expected release checksum assets", async () => {
    const plainChecksumAsset = release.assets.find(
      ({ name }) => name === "checksums.sha256",
    ) as AssetData;
    const jsonChecksumAsset = release.assets.find(
      ({ name }) => name === "checksums.json",
    ) as AssetData;

    expect(plainChecksumAsset).toMatchObject({
      state: "uploaded",
      name: "checksums.sha256",
      content_type: "text/plain",
      label: "Checksums (sha256sum)",
    });
    expect(jsonChecksumAsset).toMatchObject({
      state: "uploaded",
      name: "checksums.json",
      content_type: "application/json",
      label: "Checksums (JSON)",
    });

    const plainChecksums = await getReleaseAssetContent(plainChecksumAsset);
    const jsonChecksums = JSON.parse(
      await getReleaseAssetContent(jsonChecksumAsset),
    );

    const fileAChecksum = sha256Hex(fileA.content);
    const fileBChecksum = sha256Hex(fileB.content);
    const fileCChecksum = sha256Hex(fileC.content);
    const fileD0Checksum = sha256Hex(fileD0.content);
    const fileD1Checksum = sha256Hex(fileD1.content);

    expect(plainChecksums).toBe(
      [
        `${fileBChecksum}  custom-name-b.json`,
        `${fileCChecksum}  custom-name-c.txt`,
        `${fileAChecksum}  file-a.txt`,
        `${fileD0Checksum}  file-d.0.json`,
        `${fileD1Checksum}  file-d.1.json`,
      ].join("\n") + "\n",
    );
    expect(jsonChecksums).toEqual({
      sha256: {
        "custom-name-b.json": fileBChecksum,
        "custom-name-c.txt": fileCChecksum,
        "file-a.txt": fileAChecksum,
        "file-d.0.json": fileD0Checksum,
        "file-d.1.json": fileD1Checksum,
      },
    });
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

  describe("Outputs", () => {
    it("produces the assets output", () => {
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
          checksum: {
            sha256: sha256Hex(fileB.content),
          },
        },
        {
          ...commonFields,
          downloadUrl: `${downloadUrlPrefix}/custom-name-c.txt`,
          name: "custom-name-c.txt",
          label: "",
          contentType: "text/plain",
          size: 7,
          checksum: {
            sha256: sha256Hex(fileC.content),
          },
        },
        {
          ...commonFields,
          downloadUrl: `${downloadUrlPrefix}/file-a.txt`,
          name: "file-a.txt",
          label: "",
          contentType: "text/plain",
          size: 7,
          checksum: {
            sha256: sha256Hex(fileA.content),
          },
        },
        {
          ...commonFields,
          downloadUrl: `${downloadUrlPrefix}/file-d.0.json`,
          name: "file-d.0.json",
          label: "",
          contentType: "application/json",
          size: 13,
          checksum: {
            sha256: sha256Hex(fileD0.content),
          },
        },
        {
          ...commonFields,
          downloadUrl: `${downloadUrlPrefix}/file-d.1.json`,
          name: "file-d.1.json",
          label: "",
          contentType: "application/json",
          size: 13,
          checksum: {
            sha256: sha256Hex(fileD1.content),
          },
        },
      ]);
    });

    it("produces the generatedReleaseNotes output", () => {
      expect(outputs.generatedReleaseNotes).toContain("Full Changelog");
    });

    it("produces the discussionId output", () => {
      expect(outputs.discussionId).toMatch(/^D_/);
    });

    it("produces the discussionNumber output", () => {
      expect(outputs.discussionNumber).toBe(
        String(getDiscussionNumberByUrl(release.discussion_url ?? "")),
      );
    });

    it("produces the discussionUrl output", () => {
      expect(outputs.discussionUrl).toBe(release.discussion_url);
    });

    it("produces the releaseBody output", () => {
      expect(outputs.releaseBody).toBe(release.body);
    });

    it("produces the releaseId output", () => {
      expect(outputs.releaseId).toBe(String(release.id));
    });

    it("produces the releaseName output", () => {
      expect(outputs.releaseName).toBe(release.name);
    });

    it("produces the releaseUploadUrl output", () => {
      expect(outputs.releaseUploadUrl).toBe(release.upload_url);
    });

    it("produces the releaseUrl output", () => {
      expect(outputs.releaseUrl).toBe(release.html_url);
    });

    it("produces the releaseWasCreated output", () => {
      expect(outputs.releaseWasCreated).toBe("true");
    });

    it("produces the taggerAvatarUrl output", () => {
      expect(outputs.taggerAvatarUrl).toContain(
        "https://avatars.githubusercontent.com/",
      );
    });

    it("produces the taggerLogin output", () => {
      expect(outputs.taggerLogin).toMatch(/^.+$/);
    });

    it("produces the tagBody output", () => {
      expect(outputs.tagBody).toContain("# Heading 1");
    });

    it("produces the tagBodyRendered output", () => {
      expect(outputs.tagBodyRendered).toContain(
        "this should form one paragraph",
      );
    });

    it("produces the tagIsSemVer output", () => {
      expect(outputs.tagIsSemVer).toBe("true");
    });

    it("produces the tagIsStable output", () => {
      expect(outputs.tagIsStable).toBe("true");
    });

    it("produces the tagName output", () => {
      expect(outputs.tagName).toBe(tagName);
    });

    it("produces the tagSubject output", () => {
      expect(outputs.tagSubject).toBe(
        "1.0.0 this should form the release name",
      );
    });
  });

  describe("Browser-based tests", () => {
    let page: Page | undefined;

    beforeAll(async () => {
      if (!release) return;

      const browser = await launch();
      page = await browser.newPage();
      await page.goto(release?.html_url);
    }, SETUP_TIMEOUT);

    it.each`
      description              | expression
      ${"markdown heading 1"}  | ${`//h1[normalize-space()='Heading 1']`}
      ${"markdown heading 2"}  | ${`//h2[normalize-space()='Heading 2']`}
      ${"markdown paragraphs"} | ${`//*[normalize-space()='this should form one paragraph']`}
      ${"mention"}             | ${`//a[@href='https://github.com/actions'][normalize-space()='@actions']`}
      ${"alert"}               | ${`//*[contains(concat(' ', normalize-space(@class), ' '), ' markdown-alert-important ')]/p[not(contains(concat(' ', normalize-space(@class), ' '), ' markdown-alert-title '))][normalize-space()='this should be an alert']`}
      ${"release notes"}       | ${`//*[starts-with(normalize-space(), 'Full Changelog: ')]`}
    `(
      "produces the expected release body elements ($description)",
      async ({ expression }) => {
        expect(page).toBeDefined();

        expect(
          await page?.$$(buildBodyExpression(expression)),
        ).not.toHaveLength(0);
      },
    );
  });
});
