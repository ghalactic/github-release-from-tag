import {buildBranchName, buildTagName, buildWorkflow, describeOrSkip, SETUP_TIMEOUT} from '../../helpers/e2e.js'
import {readRunId} from '../../helpers/gha.js'

import {
  createTag,
  createBranchForCi,
  listAnnotationsByWorkflowRun,
  waitForCompletedTagWorkflowRun,
} from '../../helpers/octokit.js'

describeOrSkip('End-to-end tests', () => {
  describe('Lightweight tag', () => {
    const label = 'lightweight-tag'
    const runId = readRunId()
    const branchName = buildBranchName(runId, label)
    const tagName = buildTagName('0.1.0', runId, label)
    const workflow = buildWorkflow(branchName)

    let workflowRun, annotations

    beforeAll(async () => {
      const {headSha, workflowFileName} = await createBranchForCi(branchName, workflow)
      await createTag(headSha, tagName)

      workflowRun = await waitForCompletedTagWorkflowRun(workflowFileName, tagName)
      annotations = await listAnnotationsByWorkflowRun(workflowRun)
    }, SETUP_TIMEOUT)

    it('should produce a workflow run that concludes in failure', () => {
      expect(workflowRun.conclusion).toBe('failure')
    })

    it('should annotate the workflow run with a reason for the failure', () => {
      expect(annotations).toPartiallyContain({
        annotation_level: 'failure',
        message: 'Unable to create a release from a lightweight tag',
      })
    })
  })
})
