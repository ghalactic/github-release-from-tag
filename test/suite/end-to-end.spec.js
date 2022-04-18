import {resolve} from 'path'

import {buildTagName, readSuccessFixtures} from '../helpers/fixture.js'
import {readRunId} from '../helpers/gha.js'

import {
  createAnnotatedTag,
  createLightweightTag,
  createOrphanBranchForCi,
  getReleaseByTag,
  waitForCompletedTagWorkflowRuns,
} from '../helpers/octokit.js'

const SETUP_TIMEOUT = 3 * 60 * 1000 // 3 minutes
const describeOrSkip = process.env.GITHUB_ACTIONS == 'true' ? describe : describe.skip

describeOrSkip('End-to-end tests', () => {
  // read file-based fixtures
  const runId = readRunId()
  const successFixtures = readSuccessFixtures(resolve(__dirname, '../fixture/success'), runId)

  const workflowRun = {}
  const tagRelease = {}

  beforeAll(async () => {
    const lightweightTagName = buildTagName('0.1.0', runId, 'lightweight')

    // create a new branch
    const {workflowFile} = await createOrphanBranchForCi()
    const workflowFileName = workflowFile.content.name
    const headSha = workflowFile.commit.sha

    // create all tags in parallel
    await Promise.all([
      createLightweightTag(headSha, lightweightTagName),
      ...fixtures.map(async ({tagAnnotation, tagName}) => createAnnotatedTag(headSha, tagName, tagAnnotation)),
    ])

    // wait for all workflow runs to finish, and read completed runs into an object
    async function workflowRunsTask () {
      const [
        lightweightRun,
        ...fixtureRuns
      ] = await waitForCompletedTagWorkflowRuns(workflowFileName, [
        lightweightTagName,
        ...fixtures.map(fixture => fixture.tagName),
      ])

      workflowRun.lightweight = lightweightRun
      fixtures.forEach((fixture, index) => {
        workflowRun[fixture.name] = fixtureRuns[index]
      })
    }

    await workflowRunsTask()

    // read all tag releases into an object
    async function tagReleaseTask (fixtureName, tagName) {
      tagRelease[fixtureName] = await getReleaseByTag(tagName)
    }

    await Promise.all(fixtures.map(async ({name, tagName}) => tagReleaseTask(name, tagName)))
  }, SETUP_TIMEOUT)

  describe('for lightweight tags', () => {
    it('should conclude in failure', () => {
      expect(workflowRun.lightweight.conclusion).toBe('failure')
    })
  })

  describe.each(Object.entries(successFixtures))('for workflows that succeed (%s)', (name, fixture) => {
    beforeAll(async () => {
      await page.goto(tagRelease[name].html_url)
    })

    it('should produce the expected release attributes', () => {
      expect(tagRelease[name]).toMatchObject(fixture.releaseAttributes)
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
