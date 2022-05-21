import {join} from 'path'

import {readConfig} from '../../src/config/reading.js'
import {group, info} from '../mocks/actions-core.js'

const {chdir, cwd} = process
const fixturesPath = join(__dirname, '../fixture/config')

describe('readConfig()', () => {
  let originalCwd

  beforeEach(async () => {
    originalCwd = cwd()
  })

  afterEach(async () => {
    chdir(originalCwd)
  })

  it('should be able to read comprehensive valid configs', async () => {
    chdir(join(fixturesPath, 'comprehensive'))
    const actual = await readConfig({group, info})

    const expected = {
      assets: [
        {
          path: 'assets/text/file-a.txt',
        },
        {
          path: 'assets/json/file-b.json',
          name: 'custom-name-b.json',
          label: 'Label for file-b.json',
        },
      ],
    }

    expect(actual).toEqual(expected)
  })

  it('should return a default config the config file is empty', async () => {
    chdir(join(fixturesPath, 'empty'))
    const actual = await readConfig({group, info})

    const expected = {
      assets: [],
    }

    expect(actual).toEqual(expected)
  })

  it('should return a default config when no config file exists', async () => {
    chdir(join(fixturesPath, 'none'))
    const actual = await readConfig({group, info})

    const expected = {
      assets: [],
    }

    expect(actual).toEqual(expected)
  })

  it('should throw an error if the config file contains invalid YAML', async () => {
    chdir(join(fixturesPath, 'invalid-yaml'))

    await expect(() => readConfig({group, info})).rejects.toThrow()
  })
})
