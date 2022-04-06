import {readRunId} from '../helpers/gha.js'

import {
  createAnnotatedTag,
  createLightweightTag,
  createOrphanBranchForCi,
  getReleaseByTag,
  waitForCompletedTagWorkflowRun,
} from '../helpers/octokit.js'

const SETUP_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const describeOrSkip = process.env.GITHUB_ACTIONS == 'true' ? describe : describe.skip

describeOrSkip('End-to-end tests (only runs under GHA)', () => {
  let annotatedTagRelease, annotatedTagWorkflowRun, lightweightTagWorkflowRun

  beforeAll(async () => {
    const runId = readRunId()
    const annotatedTagName = `0.1.0+ci-${runId}-annotated`
    const lightweightTagName = `0.1.0+ci-${runId}-lightweight`

    const {workflowFile} = await createOrphanBranchForCi('a')
    const headSha = workflowFile.data.commit.sha

    await Promise.all([
      createAnnotatedTag(headSha, annotatedTagName, '0.1.0\nsubject-a\nsubject-b\n\nbody-a\nbody-b\n'),
      createLightweightTag(headSha, lightweightTagName),
    ])

    const workflowRuns = await Promise.all([
      waitForCompletedTagWorkflowRun('publish-release.yml', annotatedTagName),
      waitForCompletedTagWorkflowRun('publish-release.yml', lightweightTagName),
    ])
    annotatedTagWorkflowRun = workflowRuns[0]
    lightweightTagWorkflowRun = workflowRuns[1]

    annotatedTagRelease = await getReleaseByTag(annotatedTagName)
  }, SETUP_TIMEOUT)

  describe('for lightweight tags', () => {
    it('should conclude in failure', () => {
      expect(lightweightTagWorkflowRun.conclusion).toBe('failure')
    })
  })

  describe('for annotated tags', () => {
    it('should conclude in success', () => {
      expect(annotatedTagWorkflowRun.conclusion).toBe('success')
    })

    it('should produce the expected release title', () => {
      console.log(JSON.stringify({annotatedTagRelease}, null, 2))
    })
  })
})
