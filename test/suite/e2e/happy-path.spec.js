import escapeStringRegExp from 'escape-string-regexp'

import {getDiscussionNumberByUrl} from '../../../src/discussion.js'
import {GRAPHQL_REACTION_CONTENT} from '../../../src/reaction.js'

import {
  buildBodyExpression,
  buildBranchName,
  buildTagName,
  buildWorkflow,
  describeOrSkip,
  SETUP_TIMEOUT,
} from '../../helpers/e2e.js'

import {owner, repo} from '../../helpers/fixture-repo.js'
import {readRunId} from '../../helpers/gha.js'

import {
  createBranchForCi,
  createTag,
  getDiscussionReactionGroupsByRelease,
  getReleaseByTag,
  listAnnotationsByWorkflowRun,
  waitForCompletedTagWorkflowRun,
} from '../../helpers/octokit.js'

describeOrSkip('End-to-end tests', () => {
  const regExpOwner = escapeStringRegExp(owner)
  const regExpRepo = escapeStringRegExp(repo)

  describe('Happy path', () => {
    const label = 'happy-path'
    const runId = readRunId()
    const branchName = buildBranchName(runId, label)
    const tagName = buildTagName('1.0.0', runId, label)
    const workflow = buildWorkflow(branchName, {
      discussionCategory: 'releases',
      discussionReactions: '+1,-1,laugh,hooray,confused,heart,rocket,eyes',
      generateReleaseNotes: 'true',
      reactions: '+1,laugh,hooray,heart,rocket,eyes',
    })

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

    const config = `assets:
  - path: assets/json/file-b.json
    name: custom-name-b.json
    label: Label for file-b.json, which will download as custom-name-b.json
  - path: assets/text/file-c.*.txt
    name: custom-name-c.txt
  - path: assets/text/file-a.txt
  - path: assets/json/file-d.*.json
`

    const files = [
      {
        path: '.github/release.eloquent.yml',
        content: config,
      },
      {
        path: 'assets/text/file-a.txt',
        content: 'file-a\n',
      },
      {
        path: 'assets/json/file-b.json',
        content: '{"file-b":true}\n',
      },
      {
        // makes a filename like "file-c.2572064453.txt"
        path: `assets/text/file-c.${Math.floor(Math.random() * 10000000000)}.txt`,
        content: 'file-c\n',
      },
      {
        path: 'assets/json/file-d.0.json',
        content: '{"file-d":0}\n',
      },
      {
        path: 'assets/json/file-d.1.json',
        content: '{"file-d":1}\n',
      },
    ]

    // points to a commit history with PRs for generating release notes
    const parentCommit = '4b8277d28bee33b7c323164b2f2750adf98917be'

    let workflowRun, annotations, release, discussionReactionGroups, outputs

    beforeAll(async () => {
      const {headSha, workflowFileName} = await createBranchForCi(branchName, workflow, {
        commit: parentCommit,
        files,
      })

      await createTag(headSha, tagName, tagAnnotation)

      workflowRun = await waitForCompletedTagWorkflowRun(workflowFileName, tagName)
      annotations = await listAnnotationsByWorkflowRun(workflowRun)
      release = await getReleaseByTag(tagName)
      discussionReactionGroups = await getDiscussionReactionGroupsByRelease(owner, repo, release)

      if (release?.html_url != null) await page.goto(release?.html_url)

      const {message: outputsJson} = annotations.find(({title}) => title === 'Outputs')
      outputs = JSON.parse(outputsJson)
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
      ${'release notes'}       | ${`//*[normalize-space()='Full Changelog: https://github.com/${owner}/${repo}/commits/${tagName}']`}
    `('should produce the expected release body elements ($description)', async ({expression}) => {
      expect(await page.$x(buildBodyExpression(expression))).not.toBeEmpty()
    })

    it.each`
      name                    | size  | contentType           | label
      ${'file-a.txt'}         | ${7}  | ${'text/plain'}       | ${''}
      ${'custom-name-b.json'} | ${16} | ${'application/json'} | ${'Label for file-b.json, which will download as custom-name-b.json'}
      ${'custom-name-c.txt'}  | ${7}  | ${'text/plain'}       | ${''}
      ${'file-d.0.json'}      | ${13} | ${'application/json'} | ${''}
      ${'file-d.1.json'}      | ${13} | ${'application/json'} | ${''}
    `('should produce the expected release assets ($name)', ({name, size, contentType, label}) => {
      expect(release.assets).toPartiallyContain({
        state: 'uploaded',
        name,
        size,
        content_type: contentType,
        label,
      })
    })

    it('should produce the expected release discussion', () => {
      expect(release.discussion_url).toMatch(new RegExp(`^https://github.com/${regExpOwner}/${regExpRepo}/discussions/\d+$`))
    })

    it.each([
      ['+1'],
      ['laugh'],
      ['hooray'],
      ['heart'],
      ['rocket'],
      ['eyes'],
    ])('should produce the expected release reactions (%s)', reaction => {
      const {reactions: {[reaction]: actual = 0} = {}} = release

      expect(actual).toBeGreaterThan(0)
    })

    it.each([
      ['+1'],
      ['-1'],
      ['laugh'],
      ['hooray'],
      ['confused'],
      ['heart'],
      ['rocket'],
      ['eyes'],
    ])('should produce the expected release discussion reactions (%s)', reaction => {
      const group = discussionReactionGroups.find(group => group.content === GRAPHQL_REACTION_CONTENT[reaction])

      expect(group?.reactors?.totalCount ?? 0).toBeGreaterThan(0)
    })

    describe('Outputs', () => {
      it('should produce the correct assets output', () => {
        const apiUrlPattern = `^https://api.github.com/repos/${regExpOwner}/${regExpRepo}/releases/assets/\d+$`
        const downloadUrlPrefix = `https://github.com/${owner}/${repo}/releases/download/${encodeURIComponent(tagName)}`

        expect(JSON.parse(outputs.assets)).toEqual([
          {
            apiUrl: expect.stringMatching(apiUrlPattern),
            downloadUrl: `${downloadUrlPrefix}/custom-name-b.json`,
            id: expect.any(Number),
            nodeId: expect.any(String),
            name: 'custom-name-b.json',
            label: 'Label for file-b.json, which will download as custom-name-b.json',
            state: 'uploaded',
            contentType: 'application/json',
            size: 16,
            downloadCount: expect.any(Number),
            createdAt: expect.stringMatching(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ$/),
            updatedAt: expect.stringMatching(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ$/),
          },
          {
            apiUrl: expect.stringMatching(apiUrlPattern),
            downloadUrl: `${downloadUrlPrefix}/custom-name-c.txt`,
            id: expect.any(Number),
            nodeId: expect.any(String),
            name: 'custom-name-c.txt',
            label: '',
            state: 'uploaded',
            contentType: 'text/plain',
            size: 7,
            downloadCount: expect.any(Number),
            createdAt: expect.stringMatching(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ$/),
            updatedAt: expect.stringMatching(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ$/),
          },
          {
            apiUrl: expect.stringMatching(apiUrlPattern),
            downloadUrl: `${downloadUrlPrefix}/file-a.txt`,
            id: expect.any(Number),
            nodeId: expect.any(String),
            name: 'file-a.txt',
            label: '',
            state: 'uploaded',
            contentType: 'text/plain',
            size: 7,
            downloadCount: expect.any(Number),
            createdAt: expect.stringMatching(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ$/),
            updatedAt: expect.stringMatching(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ$/),
          },
          {
            apiUrl: expect.stringMatching(apiUrlPattern),
            downloadUrl: `${downloadUrlPrefix}/file-d.0.json`,
            id: expect.any(Number),
            nodeId: expect.any(String),
            name: 'file-d.0.json',
            label: '',
            state: 'uploaded',
            contentType: 'application/json',
            size: 13,
            downloadCount: expect.any(Number),
            createdAt: expect.stringMatching(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ$/),
            updatedAt: expect.stringMatching(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ$/),
          },
          {
            apiUrl: expect.stringMatching(apiUrlPattern),
            downloadUrl: `${downloadUrlPrefix}/file-d.1.json`,
            id: expect.any(Number),
            nodeId: expect.any(String),
            name: 'file-d.0.json',
            label: '',
            state: 'uploaded',
            contentType: 'application/json',
            size: 13,
            downloadCount: expect.any(Number),
            createdAt: expect.stringMatching(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ$/),
            updatedAt: expect.stringMatching(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ$/),
          },
        ])
      })

      it('should produce the correct generatedReleaseNotes output', () => {
        expect(outputs.generatedReleaseNotes).toContain('Full Changelog')
      })

      it('should produce the correct discussionId output', () => {
        expect(outputs.discussionId).toMatch(/^D_/)
      })

      it('should produce the correct discussionNumber output', () => {
        expect(outputs.discussionNumber).toBe(String(getDiscussionNumberByUrl(release.discussion_url)))
      })

      it('should produce the correct discussionUrl output', () => {
        expect(outputs.discussionUrl).toBe(release.discussion_url)
      })

      it('should produce the correct releaseBody output', () => {
        expect(outputs.releaseBody).toBe(release.body)
      })

      it('should produce the correct releaseId output', () => {
        expect(outputs.releaseId).toBe(String(release.id))
      })

      it('should produce the correct releaseName output', () => {
        expect(outputs.releaseName).toBe(release.name)
      })

      it('should produce the correct releaseUploadUrl output', () => {
        expect(outputs.releaseUploadUrl).toBe(release.upload_url)
      })

      it('should produce the correct releaseUrl output', () => {
        expect(outputs.releaseUrl).toBe(release.html_url)
      })

      it('should produce the correct releaseWasCreated output', () => {
        expect(outputs.releaseWasCreated).toBe('true')
      })

      it('should produce the correct tagBody output', () => {
        expect(outputs.tagBody).toContain('# Heading 1')
      })

      it('should produce the correct tagBodyRendered output', () => {
        expect(outputs.tagBodyRendered).toMatch(/<h1>.*Heading 1.*<\/h1>/s)
      })

      it('should produce the correct tagIsSemVer output', () => {
        expect(outputs.tagIsSemVer).toBe('true')
      })

      it('should produce the correct tagIsStable output', () => {
        expect(outputs.tagIsStable).toBe('true')
      })

      it('should produce the correct tagName output', () => {
        expect(outputs.tagName).toBe(tagName)
      })

      it('should produce the correct tagSubject output', () => {
        expect(outputs.tagSubject).toBe('1.0.0 this should form the release name')
      })
    })
  })
})
