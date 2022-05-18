import {mockProcessStdout} from 'jest-mock-process'
import {join} from 'path'

import {findAssets} from '../../src/asset.js'
import {warning} from '../mocks/actions-core.js'

const {chdir, cwd} = process
const fixturesPath = join(__dirname, '../fixture/find-assets')

describe('findAssets()', () => {
  let mockStdout, originalCwd

  beforeEach(async () => {
    mockStdout = mockProcessStdout()
    originalCwd = cwd()
  })

  afterEach(async () => {
    chdir(originalCwd)
    mockStdout.mockRestore()
  })

  it('should find assets when the pattern matches a single file', async () => {
    const fixturePath = join(fixturesPath, 'singular')
    chdir(fixturePath)

    const actual = await findAssets(warning, [
      {
        path: 'path/to/file-a.txt',
      },
      {
        path: 'path/to/file-b.*.txt',
      },
    ])

    const expected = [
      {
        path: join(fixturePath, 'path/to/file-a.txt'),
        name: 'file-a.txt',
        label: '',
      },
      {
        path: join(fixturePath, 'path/to/file-b.243980118.txt'),
        name: 'file-b.243980118.txt',
        label: '',
      },
    ]

    expect(actual).toEqual(expected)
  })

  it('should apply custom names and labels when the pattern matches a single file', async () => {
    const fixturePath = join(fixturesPath, 'singular')
    chdir(fixturePath)

    const actual = await findAssets(warning, [
      {
        path: 'path/to/file-b.*.txt',
        name: 'custom-name.txt',
        label: 'label for file b',
      },
    ])

    const expected = [
      {
        path: join(fixturePath, 'path/to/file-b.243980118.txt'),
        name: 'custom-name.txt',
        label: 'label for file b',
      },
    ]

    expect(actual).toEqual(expected)
  })

  it('should find assets when the pattern matches multiple files', async () => {
    const fixturePath = join(fixturesPath, 'multiple')
    chdir(fixturePath)

    const actual = await findAssets(warning, [
      {
        path: 'path/to/file-a.*.txt',
      },
    ])

    const expected = [
      {
        path: join(fixturePath, 'path/to/file-a.1468898034.txt'),
        name: 'file-a.1468898034.txt',
        label: '',
      },
      {
        path: join(fixturePath, 'path/to/file-a.4228738524.txt'),
        name: 'file-a.4228738524.txt',
        label: '',
      },
    ]

    expect(actual).toEqual(expected)
  })

  it('should not apply custom names or labels when the pattern matches multiple files', async () => {
    const fixturePath = join(fixturesPath, 'multiple')
    chdir(fixturePath)

    const actual = await findAssets(warning, [
      {
        path: 'path/to/file-a.*.txt',
        name: 'custom-name.txt',
        label: 'label for file a',
      },
    ])

    const expected = [
      {
        path: join(fixturePath, 'path/to/file-a.1468898034.txt'),
        name: 'file-a.1468898034.txt',
        label: '',
      },
      {
        path: join(fixturePath, 'path/to/file-a.4228738524.txt'),
        name: 'file-a.4228738524.txt',
        label: '',
      },
    ]

    expect(actual).toEqual(expected)
  })

  it('should warn about duplicate assets', async () => {
    const fixturePath = join(fixturesPath, 'multiple')
    chdir(fixturePath)

    const actual = []
    const warning = message => {
      actual.push(message)
    }

    await findAssets(warning, [
      {
        path: 'path/to/file-a.*.txt',
      },
      {
        path: 'path/to/file-a.*.txt',
      },
    ])

    expect(actual)
      .toContain('Release asset "file-a.1468898034.txt" found multiple times. Only the first instance will be used.')
    expect(actual)
      .toContain('Release asset "file-a.4228738524.txt" found multiple times. Only the first instance will be used.')
  })

  it('should fail when the pattern matches no files', async () => {
    chdir(fixturesPath)

    async function actual () {
      await findAssets(warning, [
        {
          path: 'path/to/nonexistent.*',
        },
      ])
    }

    await expect(actual).rejects.toThrow('No release assets found for path "path/to/nonexistent.*"')
  })
})
