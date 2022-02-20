import {exec, getExecOutput} from '@actions/exec'
import {mkdtemp, rm} from 'fs/promises'
import {tmpdir} from 'os'
import {join} from 'path'

import {fetchTagAnnotation} from '../../src/git.js'
import {group} from '../mocks/actions-core.js'

const {chdir, cwd} = process
const execGit = async (...args) => exec('git', args, {silent: true})
const getExecGitOutput = async (...args) => (await getExecOutput('git', args, {silent: true})).stdout.trim()

describe('fetchTagAnnotation()', () => {
  let originalCwd
  const paths = {}

  beforeEach(async () => {
    originalCwd = cwd()

    paths.main = await mkdtemp(join(tmpdir(), 'lqnt-'))
    paths.origin = join(paths.main, 'origin')
    paths.clone = join(paths.main, 'clone')
  })

  afterEach(async () => {
    chdir(originalCwd)

    await rm(paths.main, {recursive: true})
  })

  describe('Happy path', () => {
    beforeEach(async () => {
      // create an origin repo with annotated tags
      await execGit('-C', paths.main, 'init', '--quiet', '--initial-branch=main', paths.origin)
      await execGit('-C', paths.origin, 'commit', '--quiet', '--allow-empty', '--message=commit-message-a')
      await execGit('-C', paths.origin, 'tag', '--annotate', '--message=tag-message-a', 'tag-a')
      await execGit('-C', paths.origin, 'tag', '--annotate', '--message=tag-message-b', 'tag-b')

      // create a shallow clone repo with a single lightweight tag, and switch to it
      await execGit('-C', paths.main, 'clone', '--quiet', '--depth=1', '--no-tags', paths.origin, paths.clone)
      await execGit('-C', paths.clone, 'tag', '--no-sign', 'tag-a') // signing would create annotated tags
      await execGit('-C', paths.clone, 'switch', '--quiet', '--detach', 'tag-a')

      chdir(paths.clone)
    })

    it('should fetch the annotated tag from origin', async () => {
      // first prove that the tag is lightweight
      expect(await getExecGitOutput('cat-file', '-t', 'tag-a')).toBe('commit')

      // fetch should succeed
      expect(await fetchTagAnnotation({group, tag: 'tag-a', silent: true})).toBe(true)

      // the tag should now be annotated
      expect(await getExecGitOutput('cat-file', '-t', 'tag-a')).toBe('tag')
      expect(await getExecGitOutput('tag', '-n1', '--format', '%(contents:subject)', 'tag-a')).toBe('tag-message-a')

      // other tags should not have been fetched
      await expect(async () => execGit('cat-file', '-t', 'tag-b')).rejects.toThrow()
    })
  })

  describe('Unhappy path', () => {
    beforeEach(async () => {
      // create an origin repo with no tags
      await execGit('-C', paths.main, 'init', '--quiet', '--initial-branch=main', paths.origin)
      await execGit('-C', paths.origin, 'commit', '--quiet', '--allow-empty', '--message=commit-message-a')

      // create a shallow clone repo with a single lightweight tag, and switch to it
      await execGit('-C', paths.main, 'clone', '--quiet', '--depth=1', '--no-tags', paths.origin, paths.clone)
      await execGit('-C', paths.clone, 'tag', '--no-sign', 'tag-a') // signing would create annotated tags
      await execGit('-C', paths.clone, 'switch', '--quiet', '--detach', 'tag-a')

      chdir(paths.clone)
    })

    it('should fail to fetch the annotated tag from origin', async () => {
      expect(await fetchTagAnnotation({group, tag: 'tag-a', silent: true})).toBe(false)
    })
  })
})
