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

  const workflowRun = {}
  const tagRelease = {}

  beforeAll(async () => {
    // create a new branch
    const {workflowFile} = await createOrphanBranchForCi()
    const workflowFileName = workflowFile.content.name
    const headSha = workflowFile.commit.sha

    // create all tags in parallel
    await Promise.all(allFixtureEntries.map(
      ([, {tagAnnotation, tagName}]) => createTag(headSha, tagName, tagAnnotation)
    ))

    // wait for all workflow runs to finish, and read completed runs into an object
    async function workflowRunsTask () {
      const runs = await waitForCompletedTagWorkflowRuns(
        workflowFileName,
        allFixtureEntries.map(([, fixture]) => fixture.tagName),
      )

      allFixtureEntries.forEach(([fixtureName], index) => {
        workflowRun[fixtureName] = runs[index]
      })
    }

    await workflowRunsTask()

    // read all tag releases into an object
    async function tagReleaseTask (fixtureName, tagName) {
      tagRelease[fixtureName] = await getReleaseByTag(tagName)
    }

    await Promise.all(successFixtureEntries.map(([fixtureName, {tagName}]) => tagReleaseTask(fixtureName, tagName)))
  }, SETUP_TIMEOUT)

  describe.each(failureFixtureEntries)('for workflows that fail (%s)', (fixtureName, fixture) => {
    it('should produce a workflow run that concludes in failure', () => {
      expect(workflowRun[fixtureName].conclusion).toBe('failure')
    })
  })

  describe.each(successFixtureEntries)('for workflows that succeed (%s)', (fixtureName, fixture) => {
    beforeAll(async () => {
      await page.goto(tagRelease[fixtureName].html_url)
    })

    it('should produce a workflow run that concludes in success', () => {
      expect(workflowRun[fixtureName].conclusion).toBe('success')
    })

    it('should produce the expected release attributes', () => {
      expect(tagRelease[fixtureName]).toMatchObject(fixture.releaseAttributes)
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
