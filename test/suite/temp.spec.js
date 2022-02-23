import {readRunId} from '../helpers/gha.js'
import {createAnnotatedTag, createLightweightTag, createOrphanBranchForCi} from '../helpers/octokit.js'

describe('Temporary', () => {
  it('should be able to create stuff', async () => {
    const {commit, ref, workflow} = await createOrphanBranchForCi('a')
    const headSha = workflow.data.commit.sha
    const annotatedTag = await createAnnotatedTag(headSha, `0.1.0+ci-${readRunId()}-a`, '0.1.0\nsubject-a\nsubject-b\n\nbody-a\nbody-b\n')
    const lightweightTag = await createLightweightTag(headSha, `0.1.0+ci-${readRunId()}-b`)

    console.log(JSON.stringify({annotatedTag, commit, lightweightTag, ref, workflow}, null, 2))
  })
})
