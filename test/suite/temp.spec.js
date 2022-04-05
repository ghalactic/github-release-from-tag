import {readRunId} from '../helpers/gha.js'
import {createAnnotatedTag, createLightweightTag, createOrphanBranchForCi, waitForTagWorkflowRun} from '../helpers/octokit.js'
import {sleep} from '../helpers/timers.js'

describe('Temporary', () => {
  it('should be able to create stuff', async () => {
    const tag = `0.1.0+ci-${readRunId()}-a`
    const {commit, ref, workflowFile} = await createOrphanBranchForCi('a')
    const headSha = workflowFile.data.commit.sha
    const annotatedTag = await createAnnotatedTag(headSha, tag, '0.1.0\nsubject-a\nsubject-b\n\nbody-a\nbody-b\n')
    // const lightweightTag = await createLightweightTag(headSha, `0.1.0+ci-${readRunId()}-b`)

    await sleep(5000) // allow time to pass so that the workflow run is likely to be found on the 1st attempt
    const {workflowRun, retryCount} = await waitForTagWorkflowRun('publish-release.yml', tag)

    console.log(JSON.stringify({workflowRun, retryCount}, null, 2))
  }, 30000)
})
