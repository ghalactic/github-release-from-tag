import {Octokit} from 'octokit'

import {readRunId} from './gha.js'
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
  const {GITHUB_SHA: sha = 'main'} = process.env

  const branch = `ci-${readRunId()}-${suffix}`
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

export async function findWorkflowByPath (path) {
  const octokit = createOctokit()

  const workflowPages = octokit.paginate.iterator(
    octokit.rest.actions.listRepoWorkflows,
    {
      owner,
      repo,
    },
  )

  for await (const {data} of workflowPages) {
    for (const workflow of data) {
      if (workflow.path === path) return workflow
    }
  }

  throw new Error(`Unable to find a workflow with the path ${JSON.stringify(path)}`)
}

// export async function waitForTagCheckRuns (tag) {
//   for (let i = 0; i < 10; ++i) {
//     if (i > 0) {
//       console.log(`No checks detected for tag ${JSON.stringify(tag)}. Trying again in 1 second.`)
//       await sleep(1000)
//     }

//     console.log(`Detecting checks for tag ${JSON.stringify(tag)}.`)

//     const checks = await octokit.rest.checks.listForRef({
//       owner,
//       repo,
//       ref: `refs/tags/${tag}`,
//     })
//     const count = checks?.data?.total_count ?? 0

//     if (count > 0) return checks
//   }

//   throw new Error(`No checks detected for tag ${JSON.stringify(tag)}.`)
// }

// function sleep (delay) {
//   return new Promise((resolve) => {
//     setTimeout(() => { resolve() }, delay)
//   })
// }
