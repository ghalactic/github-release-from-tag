import {readRunId} from '../helpers/gha.js'
import {createAnnotatedTag, createLightweightTag, createOrphanBranchForCi, findWorkflowByPath} from '../helpers/octokit.js'

describe('Temporary', () => {
  it('should be able to create stuff', async () => {
    // const tag = `0.1.0+ci-${readRunId()}-a`
    // const {commit, ref, workflow} = await createOrphanBranchForCi('a')
    // const headSha = workflow.data.commit.sha
    // const annotatedTag = await createAnnotatedTag(headSha, tag, '0.1.0\nsubject-a\nsubject-b\n\nbody-a\nbody-b\n')
    // const lightweightTag = await createLightweightTag(headSha, `0.1.0+ci-${readRunId()}-b`)

    const workflow = await findWorkflowByPath('.github/workflows/publish-release.yml')

    console.log(JSON.stringify({workflow}, null, 2))
  }) //, 60000)
})
