import {
  buildBranchName,
  buildTagName,
  buildWorkflow,
  describeOrSkip,
  SETUP_TIMEOUT,
} from '../../helpers/e2e.js'

import {readRunId} from '../../helpers/gha.js'

import {
  createOrphanBranchForCi,
  createTag,
  getReleaseByTag,
  waitForCompletedTagWorkflowRun,
} from '../../helpers/octokit.js'

describeOrSkip('End-to-end tests', () => {
  describe('Pre-release', () => {
    const label = 'pre-release'
    const runId = readRunId()
    const branchName = buildBranchName(runId, label)
    const tagName = buildTagName('0.1.0', runId, label)
    const workflow = buildWorkflow(branchName)

    const tagAnnotation = '0.1.0'

    let workflowRun, release

    beforeAll(async () => {
      const {headSha, workflowFileName} = await createOrphanBranchForCi(branchName, workflow)
      await createTag(headSha, tagName, tagAnnotation)

      workflowRun = await waitForCompletedTagWorkflowRun(workflowFileName, tagName)
      release = await getReleaseByTag(tagName)

      if (release?.html_url != null) await page.goto(release?.html_url)
    }, SETUP_TIMEOUT)

    it('should produce a workflow run that concludes in success', () => {
      expect(workflowRun.conclusion).toBe('success')
    })

    it('should produce a pre-release', () => {
      expect(release.prerelease).toBe(true)
    })
  })
})