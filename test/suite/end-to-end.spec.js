import {resolve} from 'path'

import {readFailureFixtures, readSuccessFixtures} from '../helpers/fixture.js'
import {readRunId} from '../helpers/gha.js'

import {
  createTag,
  createOrphanBranchForCi,
  getReleaseByTag,
  waitForCompletedTagWorkflowRuns,
} from '../helpers/octokit.js'

const SETUP_TIMEOUT = 3 * 60 * 1000 // 3 minutes
const describeOrSkip = process.env.GITHUB_ACTIONS == 'true' ? describe : describe.skip

describeOrSkip('End-to-end tests', () => {
  // read file-based fixtures
  const runId = readRunId()
  const failureFixtures = readFailureFixtures(resolve(__dirname, '../fixture/failure'), runId)
  const failureFixtureEntries = Object.entries(failureFixtures)
  const successFixtures = readSuccessFixtures(resolve(__dirname, '../fixture/success'), runId)
  const successFixtureEntries = Object.entries(successFixtures)
  const allFixtureEntries = [...failureFixtureEntries, ...successFixtureEntries]

  const branchData = {}
  const tagData = {}
  const workflowRunData = {}
  const tagReleaseData = {}

  beforeAll(async () => {
    // create all branches
    async function createBranchTask ({name, workflowSteps}) {
      branchData[name] = await createOrphanBranchForCi(name, workflowSteps)
    }
    await Promise.all(allFixtureEntries.map(([, fixture]) => createBranchTask(fixture)))

    // create all tags
    async function createTagTask ({name, tagName, tagAnnotation}) {
      tagData[fixtureName] = await createTag(branchData[name].headSha, tagName, tagAnnotation)
    }
    await Promise.all(allFixtureEntries.map(([, fixture]) => createTagTask(fixture)))

    // wait for all workflow runs to finish, and read completed runs into an object
    async function workflowRunTask ({name, tagName}) {
      const workflowFileName = branchData[name].workflowFile.content.name
      workflowRunData[name] = await waitForCompletedTagWorkflowRun(workflowFileName, tagName)
    }
    await Promise.all(allFixtureEntries.map(([, fixture]) => workflowRunTask(fixture)))

    // read all tag releases into an object
    async function tagReleaseTask ({name, tagName}) {
      tagReleaseData[name] = await getReleaseByTag(tagName)
    }
    await Promise.all(successFixtureEntries.map(([, fixture]) => tagReleaseTask(fixture)))
  }, SETUP_TIMEOUT)

  describe.each(failureFixtureEntries)('for workflows that fail (%s)', (fixtureName, fixture) => {
    it('should produce a workflow run that concludes in failure', () => {
      expect(workflowRunData[fixtureName].conclusion).toBe('failure')
    })
  })

  describe.each(successFixtureEntries)('for workflows that succeed (%s)', (fixtureName, fixture) => {
    beforeAll(async () => {
      await page.goto(tagReleaseData[fixtureName].html_url)
    })

    it('should produce a workflow run that concludes in success', () => {
      expect(workflowRunData[fixtureName].conclusion).toBe('success')
    })

    it('should produce the expected release attributes', () => {
      expect(tagReleaseData[fixtureName]).toMatchObject(fixture.releaseAttributes)
    })

    it.each(Object.entries(fixture.releaseBody))(
      'should produce the expected release body elements (%s)',
      async (_, expression) => {
        const elements = await page.$x(`//*[@data-test-selector="body-content"]${expression}`)

        expect(elements.length).toBeGreaterThan(0)
      },
    )
  })
})
