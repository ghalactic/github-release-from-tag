import {Octokit} from 'octokit'

import {owner, repo} from './fixture-repo.js'
import {readEmptyTreeHash} from './git.js'
import {sleep} from './timers.js'

let octokit

export function createOctokit () {
  if (octokit == null) octokit = new Octokit({auth: process.env.FIXTURE_GITHUB_TOKEN})

  return octokit
}

export async function createFile (branch, path, content) {
  const octokit = createOctokit()

  const {data} = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    branch,
    path,
    message: `Create ${path}`,
    content: Buffer.from(content).toString('base64'),
  })

  return data
}

export async function createOrphanBranch (branch) {
  const octokit = createOctokit()

  const {data: commit} = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: 'Create an empty initial commit',
    tree: await readEmptyTreeHash(),
  })

  const {data: ref} = await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branch}`,
    sha: commit.sha,
  })

  return {commit, ref}
}

export async function createOrphanBranchForCi (branch, workflow, files = []) {
  const {commit, ref} = await createOrphanBranch(branch)

  // each of these creates a commit, so do them sequentially
  for (const {path, content} of files) await createFile(branch, path, content)

  const workflowFile = await createFile(
    branch,
    `.github/workflows/publish-release.${branch}.yml`,
    workflow,
  )

  const headSha = workflowFile.commit.sha
  const workflowFileName = workflowFile.content.name

  return {commit, headSha, ref, workflowFile, workflowFileName}
}

export async function createTag(sha, tag, annotation) {
  const octokit = createOctokit()

  let targetSha = sha
  let object

  if (typeof annotation === 'string' && annotation.length > 0) {
    const {data} = await octokit.rest.git.createTag({
      owner,
      repo,
      type: 'commit',
      object: sha,
      tag,
      message: annotation,
    })

    object = data
    targetSha = object.sha
  }

  const {data: ref} = await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/tags/${tag}`,
    sha: targetSha,
  })

  return {object, ref}
}

/**
 * Yet another function that has to do everything the hard way because of
 * GitHub's API. Unfortunately, you cannot look up a draft release by tag, so
 * this function must list all releases, and find the release manually.
 */
export async function getReleaseByTag (tag) {
  const octokit = createOctokit()

  const pages = octokit.paginate.iterator(
    octokit.rest.repos.listReleases,
    {
      owner,
      repo,
    },
  )

  for await (const {data: tags} of pages) {
    for (const data of tags) {
      if (data.tag_name === tag) return data
    }
  }

  throw new Error(`Unable to find release for tag ${JSON.stringify(tag)}`)
}

export async function listAnnotationsByWorkflowRun (workflowRun) {
  const octokit = createOctokit()

  const {check_suite_id} = workflowRun
  const {data: {check_runs: checkRuns}} = await octokit.rest.checks.listForSuite({
    owner,
    repo,
    check_suite_id,
    per_page: 1,
  })

  if (checkRuns.length < 1) throw new Error(`Unable to locate check runs for check suite ${checkSuiteId}`)

  return octokit.paginate(
    octokit.rest.checks.listAnnotations,
    {
      owner,
      repo,
      check_run_id: checkRuns[0].id,
    },
  )
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
 export async function waitForCompletedTagWorkflowRun (fileName, tag) {
  const octokit = createOctokit()

  while (true) {
    await sleep(15 * 1000)

    const {data: {workflow_runs: [run]}} = await octokit.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: fileName, // fileName does not include a path
      per_page: 1, // fileName is unique - there should only ever be one run
    })

    // run has not yet been created
    if (run == null) continue

    const {
      event,
      head_branch: runTag, // note that GitHub also uses this property for the tag name in a tag push run
      status,
    } = run

    // skip incomplete or unrelated workflow runs
    if (event !== 'push' || status !== 'completed' || runTag !== tag) continue

    return run
  }
}
