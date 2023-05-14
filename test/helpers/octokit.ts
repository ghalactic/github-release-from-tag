import { RestEndpointMethodTypes } from "@octokit/action";
import { Octokit } from "octokit";
import { getDiscussionNumberByUrl } from "../../src/discussion.js";
import { ReleaseData } from "../../src/type/octokit.js";
import { owner, repo } from "./fixture-repo.js";
import { readEmptyTreeHash } from "./git.js";
import { sleep } from "./timers.js";

let octokit: Octokit;

export function createOctokit(): Octokit {
  if (octokit == null) {
    octokit = new Octokit({ auth: process.env.FIXTURE_GITHUB_TOKEN });
  }

  return octokit;
}

export async function createFile(
  branch: string,
  path: string,
  content: string
): Promise<FileContentsData> {
  const octokit = createOctokit();

  const { data } = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    branch,
    path,
    message: `Create ${path}`,
    content: Buffer.from(content).toString("base64"),
  });

  return data;
}

export async function createBranchForCi(
  branch: string,
  workflow: string,
  options: {
    commit?: string;
    files?: {
      path: string;
      content: string;
    }[];
  } = {}
): Promise<{
  headSha: string | undefined;
  ref: RefData;
  workflowFile: FileContentsData;
  workflowFileName: string;
}> {
  const { files = [] } = options;

  let ref: RefData;

  if (options.commit == null) {
    const orphan = await createOrphanBranch(branch);
    ref = orphan.ref;
  } else {
    ref = await createBranch(branch, options.commit);
  }

  // each of these creates a commit, so do them sequentially
  for (const { path, content } of files) {
    await createFile(branch, path, content);
  }

  const workflowFile = await createFile(
    branch,
    `.github/workflows/publish-release.${branch}.yml`,
    workflow
  );

  const headSha = workflowFile.commit.sha;
  const workflowFileName = workflowFile.content?.name ?? "";

  return { headSha, ref, workflowFile, workflowFileName };
}

export async function createOrphanBranch(
  branch: string
): Promise<{ commit: CommitData; ref: RefData }> {
  const octokit = createOctokit();

  const { data: commit } = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: "Create an empty initial commit",
    tree: await readEmptyTreeHash(),
  });

  const { data: ref } = await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branch}`,
    sha: commit.sha,
  });

  return { commit, ref };
}

export async function createBranch(
  branch: string,
  commit: string
): Promise<RefData> {
  const octokit = createOctokit();

  const { data: ref } = await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branch}`,
    sha: commit,
  });

  return ref;
}

export async function createTag(
  sha: string,
  tag: string,
  annotation?: string
): Promise<{ object: TagData | undefined; ref: RefData }> {
  const octokit = createOctokit();

  let targetSha = sha;
  let object;

  if (typeof annotation === "string" && annotation.length > 0) {
    const { data } = await octokit.rest.git.createTag({
      owner,
      repo,
      type: "commit",
      object: sha,
      tag,
      message: annotation,
    });

    object = data;
    targetSha = object.sha;
  }

  const { data: ref } = await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/tags/${tag}`,
    sha: targetSha,
  });

  return { object, ref };
}

export async function getDiscussionReactionGroupsByRelease(
  owner: string,
  repo: string,
  release: ReleaseData
): Promise<ReactionGroupData[]> {
  const { graphql } = createOctokit();

  const { discussion_url: url } = release;

  if (!url) throw new Error(`Release ${release.id} has no linked discussion`);

  const query = `
    query getDiscussionReactionsByNumber ($owner: String!, $repo: String!, $number: Int!) {
      repository (owner: $owner, name: $repo) {
        discussion (number: $number) {
          reactionGroups {
            content
            reactors {
              totalCount
            }
          }
        }
      }
    }
  `;

  const result = (await graphql({
    query,
    owner,
    repo,
    number: getDiscussionNumberByUrl(url),
  })) as {
    repository: {
      discussion: {
        reactionGroups: ReactionGroupData[];
      };
    };
  };

  return result.repository.discussion.reactionGroups;
}

/**
 * Yet another function that has to do everything the hard way because of
 * GitHub's API. Unfortunately, you cannot look up a draft release by tag, so
 * this function must list all releases, and find the release manually.
 */
export async function getReleaseByTag(tag: string): Promise<ReleaseData> {
  const octokit = createOctokit();

  const pages = octokit.paginate.iterator(octokit.rest.repos.listReleases, {
    owner,
    repo,
  });

  for await (const { data: tags } of pages) {
    for (const data of tags) {
      if (data.tag_name === tag) return data;
    }
  }

  throw new Error(`Unable to find release for tag ${JSON.stringify(tag)}`);
}

export async function listAnnotationsByWorkflowRun(
  workflowRun: WorkflowRunData
): Promise<AnnotationData[]> {
  const octokit = createOctokit();

  const { check_suite_id: checkSuiteId } = workflowRun;

  if (!checkSuiteId) {
    throw new Error(`Workflow run ${workflowRun.id} has no check suite ID`);
  }

  const {
    data: { check_runs: checkRuns },
  } = await octokit.rest.checks.listForSuite({
    owner,
    repo,
    check_suite_id: checkSuiteId,
    per_page: 30,
  });

  if (checkRuns.length < 1)
    throw new Error(
      `Unable to locate check runs for check suite ${checkSuiteId}`
    );

  return octokit.paginate(octokit.rest.checks.listAnnotations, {
    owner,
    repo,
    check_run_id: checkRuns[0].id,
  });
}

/**
 * This function is a mess. Originally I was trying to use GitHub's API in a
 * "sane" way, searching only for workflow runs related to each specific tag,
 * using query parameters that made sense, restricting the results to completed
 * runs, etc.
 *
 * Unfortunately, GitHub's API starting omitting workflow runs when specifying
 * simple filters like "status=completed" - including workflow runs that
 * definitely matched the filters. No idea why this should be the case. So
 * instead, I was forced to use a unique workflow filename for each test branch,
 * and manually filter the workflow runs myself.
 */
export async function waitForCompletedTagWorkflowRun(
  fileName: string,
  tag: string
): Promise<WorkflowRunData> {
  const octokit = createOctokit();

  while (true) {
    await sleep(15 * 1000);

    const {
      data: {
        workflow_runs: [run],
      },
    } = await octokit.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: fileName, // fileName does not include a path
      per_page: 1, // fileName is unique - there should only ever be one run
    });

    // run has not yet been created
    if (run == null) continue;

    const {
      event,
      head_branch: runTag, // note that GitHub also uses this property for the tag name in a tag push run
      status,
    } = run;

    // skip incomplete or unrelated workflow runs
    if (event !== "push" || status !== "completed" || runTag !== tag) continue;

    return run;
  }
}

export type AnnotationData =
  OctokitChecks["listAnnotations"]["response"]["data"][number];
export type CommitData = OctokitGit["createCommit"]["response"]["data"];
export type FileContentsData =
  OctokitRepos["createOrUpdateFileContents"]["response"]["data"];
export type ReactionGroupData = {
  content: string;
  reactors: {
    totalCount: number;
  };
};
export type RefData = OctokitGit["createRef"]["response"]["data"];
export type TagData = OctokitGit["createTag"]["response"]["data"];
export type WorkflowRunData =
  OctokitActions["getWorkflowRun"]["response"]["data"];

type OctokitActions = RestEndpointMethodTypes["actions"];
type OctokitChecks = RestEndpointMethodTypes["checks"];
type OctokitGit = RestEndpointMethodTypes["git"];
type OctokitRepos = RestEndpointMethodTypes["repos"];
