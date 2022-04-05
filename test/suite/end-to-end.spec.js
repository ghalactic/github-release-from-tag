import {readRunId} from '../helpers/gha.js'
import {createAnnotatedTag, createLightweightTag, createOrphanBranchForCi, waitForCompletedTagWorkflowRun} from '../helpers/octokit.js'

const describeOrSkip = process.env.GITHUB_ACTIONS == 'true' ? describe : describe.skip

describeOrSkip('End-to-end tests (only runs under GHA)', () => {
  it('should be able to create stuff', async () => {
    const runId = readRunId()
    const tag = `0.1.0+ci-${runId}-a`
    const {commit, ref, workflowFile} = await createOrphanBranchForCi('a')
    const headSha = workflowFile.data.commit.sha
    const annotatedTag = await createAnnotatedTag(headSha, tag, '0.1.0\nsubject-a\nsubject-b\n\nbody-a\nbody-b\n')
    // const lightweightTag = await createLightweightTag(headSha, `0.1.0+ci-${runId}-b`)

    const {workflowRun, retryCount} = await waitForCompletedTagWorkflowRun('publish-release.yml', tag)

    console.log(JSON.stringify({workflowRun, retryCount}, null, 2))
  }, 5 * 60 * 1000)
})
