import {mockProcessStdout} from 'jest-mock-process'
import {join} from 'path'

import {findAssets} from '../../src/asset.js'

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

  it('should be find assets when the pattern matches a single file', async () => {
    const fixturePath = join(fixturesPath, 'singular')
    chdir(fixturePath)

    const actual = await findAssets([
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
})
