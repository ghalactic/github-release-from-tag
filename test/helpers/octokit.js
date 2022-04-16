import {Octokit} from 'octokit'

import {readRunId} from './gha.js'
import {readEmptyTreeHash} from './git.js'
import {sleep} from './timers.js'

const owner = 'eloquent-fixtures'
const repo = 'github-release-action-ci'
let octokit

export function createOctokit () {
  if (octokit == null) octokit = new Octokit({auth: process.env.FIXTURE_GITHUB_TOKEN})

  return octokit
}

export async function createFile (branch, path, content) {
  const octokit = createOctokit()

  return octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    branch,
    path,
    message: `Create ${path}`,
    content: Buffer.from(content).toString('base64'),
  })
}

export async function createOrphanBranch (branch) {
  const octokit = createOctokit()

  const commit = await octokit.rest.git.createCommit({
    owner,
    repo,
    message: 'Create an empty initial commit',
    tree: await readEmptyTreeHash(),
  })

  const ref = await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branch}`,
    sha: commit.data.sha,
  })

  return {commit, ref}
}

export async function createOrphanBranchForCi (suffix) {
  const {GITHUB_SHA: sha = 'main'} = process.env

  const branch = `ci-${readRunId()}-${suffix}`
  const {commit, ref} = await createOrphanBranch(branch)

  const workflowFile = await createFile(
    branch,
    '.github/workflows/publish-release.yml',
    `name: Publish release
on:
  push:
    tags:
    - '*'
jobs:
  publish:
    runs-on: ubuntu-latest
    name: Publish release
    steps:
    - name: Checkout
      uses: actions/checkout@v2
    - name: Publish release
      uses: eloquent/github-release-action@${sha}
`
  )

  return {commit, ref, workflowFile}
}

export async function createAnnotatedTag (sha, tag, message) {
  const octokit = createOctokit()

  const object = await octokit.rest.git.createTag({
    owner,
    repo,
    type: 'commit',
    object: sha,
    tag,
    message,
  })

  const ref = await createLightweightTag(object.data.sha, tag)

  return {object, ref}
}

export async function createLightweightTag (sha, tag) {
  const octokit = createOctokit()

  return octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/tags/${tag}`,
    sha,
  })
}

export async function getReleaseByTag (tag) {
  const octokit = createOctokit()

  return octokit.rest.repos.getReleaseByTag({
    owner,
    repo,
    tag,
  })
}

const COMPLETED_WORKFLOW_RUN_CUTOFF =  60 * 60 * 1000 // 1 hour

export async function waitForCompletedTagWorkflowRuns (fileName, tags) {
  const octokit = createOctokit()
  const cutoff = new Date(Date.now() - COMPLETED_WORKFLOW_RUN_CUTOFF)

  while (true) {
    await sleep(15 * 1000)

    const pages = octokit.paginate.iterator(
      octokit.rest.actions.listWorkflowRuns,
      {
        owner,
        repo,
        workflow_id: fileName, // fileName does not include a path
        event: 'push',
        status: 'completed',
        created: `>${cutoff.toISOString()}`,
        exclude_pull_requests: true,
      },
    )

    const tagRuns = {}

    pagination: for await (const {data: {workflow_runs: runs}} of pages) {
      for (const run of runs) {
        // note that GitHub also uses the "head_branch" property for the tag name in a tag push run
        const {head_branch: runTag} = run

        // skip unrelated workflow runs
        if (!tags.includes(runTag)) continue

        tagRuns[runTag] = run

        // stop paginating as soon as all tag runs have been found
        if (Object.keys(tagRuns).length >= tags.length) break pagination
      }
    }

    // haven't found all tag runs yet
    if (Object.keys(tagRuns).length < tags.length) continue

    const tagRunsOrdered = []
    for (const tag of tags) tagRunsOrdered = tagRuns[tag]

    return tagRunsOrdered
  }
}
