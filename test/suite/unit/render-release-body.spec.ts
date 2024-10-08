import { describe, expect, it } from "vitest";
import { renderReleaseBody } from "../../../src/body.js";
import { validateConfig } from "../../../src/config/validation.js";
import { group, info, setOutput } from "../../mocks/actions-core.js";
import { createRepos } from "../../mocks/oktokit-repos.js";

describe("renderReleaseBody()", () => {
  const repos = createRepos();
  const owner = "owner-org";
  const repo = "owner-repo";
  const tag = "tag-a";
  const env = {
    GITHUB_ACTION_REPOSITORY: "action-org/action-repo",
  };

  it("renders release bodies", async () => {
    const tagBody = `### This should be a heading

This paragraph should have
no line breaks.

This should be a separate paragraph.

#### Duplicate heading

#### Duplicate *heading*`;

    const expected = `### <a id="this-should-be-a-heading"></a>This should be a heading

This paragraph should have no line breaks.

This should be a separate paragraph.

#### <a id="duplicate-heading"></a>Duplicate heading

#### <a id="duplicate-heading-1"></a>Duplicate *heading*

<!-- published by action-org/action-repo -->`;

    const actual = await renderReleaseBody({
      config: validateConfig({
        generateReleaseNotes: false,
      }),
      env,
      group,
      info,
      owner,
      repo,
      repos,
      setOutput,
      tag,
      tagBody,
    });

    expect(actual).toBe(expected);
  });

  it("appends release notes when there is a tag body", async () => {
    const tagBody = `body-a`;

    const expected = `body-a

{
  "releaseNotesBody": true,
  "owner": "owner-org",
  "repo": "owner-repo",
  "tag_name": "tag-a"
}

<!-- published by action-org/action-repo -->`;

    const actual = await renderReleaseBody({
      config: validateConfig({
        generateReleaseNotes: true,
      }),
      env,
      group,
      info,
      owner,
      repo,
      repos,
      setOutput,
      tag,
      tagBody,
    });

    expect(actual).toBe(expected);
  });

  it("appends release notes when there is no tag body", async () => {
    const tagBody = "";

    const expected = `{
  "releaseNotesBody": true,
  "owner": "owner-org",
  "repo": "owner-repo",
  "tag_name": "tag-a"
}

<!-- published by action-org/action-repo -->`;

    const actual = await renderReleaseBody({
      config: validateConfig({
        generateReleaseNotes: true,
      }),
      env,
      group,
      info,
      owner,
      repo,
      repos,
      setOutput,
      tag,
      tagBody,
    });

    expect(actual).toBe(expected);
  });

  it("supports empty tag bodies with no release notes", async () => {
    const tagBody = "";
    const expected = "";

    const actual = await renderReleaseBody({
      config: validateConfig({
        generateReleaseNotes: false,
      }),
      env,
      group,
      info,
      owner,
      repo,
      repos,
      setOutput,
      tag,
      tagBody,
    });

    expect(actual).toBe(expected);
  });
});
