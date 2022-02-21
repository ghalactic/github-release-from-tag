import {Octokit} from 'octokit'

import {readEmptyTreeHash} from './git.js'

const owner = 'eloquent-fixtures'
const repo = 'github-release-action-ci'
let octokit

export function createOctokit () {
  if (octokit == null) octokit = new Octokit({auth: process.env.FIXTURE_GITHUB_TOKEN})

  return octokit
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
  } = process.env

  return createOrphanBranch(`ci-${runId}.${runNumber}.${runAttempt}-${suffix}`)
}
