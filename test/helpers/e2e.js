import {dump} from 'js-yaml'

const {
  GITHUB_ACTIONS,
  GITHUB_SHA,
} = process.env

export const SETUP_TIMEOUT = 3 * 60 * 1000 // 3 minutes

export function buildBranchName (runId, label) {
  return `ci-${runId}-${label}`
}

export function buildTagName (version, runId, label) {
  return `${version}+ci-${runId}-${label}`
}

export function buildWorkflow (branchName, publishOptions = {}) {
  return dump({
    name: branchName,
    on: {
      push: {
        tags: ['*'],
      },
    },
    jobs: {
      publish: {
        'runs-on': 'ubuntu-latest',
        name: 'Publish release',
        steps: [
          {
            name: 'Checkout',
            uses: 'actions/checkout@v2',
          },
          {
            name: 'Publish release',
            uses: `eloquent/github-release-action@${GITHUB_SHA || 'main'}`,
            with: publishOptions,
          },
        ],
      },
    },
  })
}

export const describeOrSkip = GITHUB_ACTIONS == 'true' ? describe : describe.skip
