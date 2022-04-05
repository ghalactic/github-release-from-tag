import {readRunId} from '../helpers/gha.js'
import {createAnnotatedTag, createLightweightTag, createOrphanBranchForCi, waitForCompletedTagWorkflowRun} from '../helpers/octokit.js'

const SETUP_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const describeOrSkip = process.env.GITHUB_ACTIONS == 'true' ? describe : describe.skip

describeOrSkip('End-to-end tests (only runs under GHA)', () => {
  let annotatedTagWorkflowRun, lightweightTagWorkflowRun

  beforeAll(async () => {
    const runId = readRunId()
    const annotatedTagName = `0.1.0+ci-${runId}-annotated`
    const lightweightTagName = `0.1.0+ci-${runId}-lightweight`

    const {workflowFile} = await createOrphanBranchForCi('a')
    const headSha = workflowFile.data.commit.sha
    await createAnnotatedTag(headSha, annotatedTagName, '0.1.0\nsubject-a\nsubject-b\n\nbody-a\nbody-b\n')
    await createLightweightTag(headSha, lightweightTagName)

    const workflowRuns = await Promise.all([
      waitForCompletedTagWorkflowRun('publish-release.yml', annotatedTagName),
      waitForCompletedTagWorkflowRun('publish-release.yml', lightweightTagName),
    ])
    annotatedTagWorkflowRun = workflowRuns[0]
    lightweightTagWorkflowRun = workflowRuns[1]
  }, SETUP_TIMEOUT)

  it('should conclude in success for annotated tags', () => {
    expect(annotatedTagWorkflowRun.conclusion).toBe('success')
  })

  it('should conclude in failure for lightweight tags', () => {
    expect(lightweightTagWorkflowRun.conclusion).toBe('failure')
  })
})
