import {Octokit} from 'octokit'

import {readEmptyTreeHash} from './git.js'

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
  const {
    GITHUB_RUN_ID: runId = 'x',
    GITHUB_RUN_NUMBER: runNumber = 'x',
    GITHUB_RUN_ATTEMPT: runAttempt = 'x',
    GITHUB_SHA: sha = 'main',
  } = process.env

  const branch = `ci-${runId}.${runNumber}.${runAttempt}-${suffix}`
  const {commit, ref} = await createOrphanBranch(branch)

  const workflow = await createFile(
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

  return {commit, ref, workflow}
}
