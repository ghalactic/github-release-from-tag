import {
  buildBodyExpression,
  buildBranchName,
  buildTagName,
  buildWorkflow,
  describeOrSkip,
  SETUP_TIMEOUT,
} from '../../../helpers/e2e.js'

import {owner, repo} from '../../../helpers/fixture-repo.js'
import {readRunId} from '../../../helpers/gha.js'

import {
  createOrphanBranchForCi,
  createTag,
  getReleaseByTag,
  listAnnotationsByWorkflowRun,
  waitForCompletedTagWorkflowRun,
} from '../../../helpers/octokit.js'

describeOrSkip('End-to-end tests', () => {
  describe('Happy path', () => {
    const label = 'success-happy-path'
    const runId = readRunId()
    const branchName = buildBranchName(runId, label)
    const tagName = buildTagName('1.0.0', runId, label)
    const workflow = buildWorkflow(branchName)

    const tagAnnotation = `1.0.0
this
should
form
the
release
name

# Heading 1
## Heading 2

this
should
form
one
paragraph

#1
`

    let workflowRun, annotations, release

    beforeAll(async () => {
      const {headSha, workflowFileName} = await createOrphanBranchForCi(branchName, workflow)
      await createTag(headSha, tagName, tagAnnotation)

      workflowRun = await waitForCompletedTagWorkflowRun(workflowFileName, tagName)
      annotations = await listAnnotationsByWorkflowRun(workflowRun)
      release = await getReleaseByTag(tagName)

      if (release?.html_url != null) await page.goto(release?.html_url)
    }, SETUP_TIMEOUT)

    it('should produce a workflow run that concludes in success', () => {
      expect(workflowRun.conclusion).toBe('success')
    })

    it('should annotate the workflow run with a link to the release', () => {
      expect(annotations).toPartiallyContain({
        annotation_level: 'notice',
        title: `Released - ${release.name}`,
        message: `Created ${release.html_url}`,
      })
    })

    it('should produce a stable release', () => {
      expect(release.prerelease).toBe(false)
    })

    it('should produce a published release', () => {
      expect(release.draft).toBe(false)
    })

    it('should produce the expected release name', () => {
      expect(release.name).toBe('1.0.0 this should form the release name')
    })

    it.each`
      description              | expression
      ${'markdown heading 1'}  | ${`//h1[normalize-space()='Heading 1']`}
      ${'markdown heading 2'}  | ${`//h2[normalize-space()='Heading 2']`}
      ${'markdown paragraphs'} | ${`//*[normalize-space()='this should form one paragraph']`}
      ${'issue link'}          | ${`//a[@href='https://github.com/${owner}/${repo}/issues/1'][normalize-space()='#1']`}
    `('should produce the expected release body elements ($description)', async ({expression}) => {
      expect(await page.$x(buildBodyExpression(expression))).not.toBeEmpty()
    })
  })
})
