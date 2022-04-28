import {validateConfig} from '../../src/config/validation.js'

const nonArrayData = [
  ['a'],
  [null],
  [true],
  [false],
  [111],
  [{}],
]

const nonObjectData = [
  ['a'],
  [null],
  [true],
  [false],
  [111],
  [[]],
]

describe('validateConfig()', () => {
  it('should not throw for minimal valid configs', () => {
    expect(() => { validateConfig({}) }).not.toThrow()
  })

  it('should not throw for comprehensive valid configs', () => {
    const config = {
      assets: [
        {
          path: 'assets/text/file-a.txt',
        },
        {
          path: 'assets/json/file-b.json',
        },
      ],
    }

    expect(() => { validateConfig(config) }).not.toThrow()
  })

  it('should not throw for configs with an explicitly specified empty assets list', () => {
    const config = {
      assets: [],
    }

    expect(() => { validateConfig(config) }).not.toThrow()
  })

  it('should apply the default value for assets', () => {
    expect(validateConfig({})).toMatchObject({
      assets: [],
    })
  })

  it('should produce errors that describe all problems', () => {
    const config = {
      additional: true,
      assets: [
        {},
      ],
    }

    let actual

    try {
      validateConfig(config)
    } catch (error) {
      actual = error.message
    }

    expect(actual).toMatch(`  - the config must NOT have additional property 'additional'`)
    expect(actual).toMatch(`  - the value at '/assets/0' must have required property 'path'`)
  })

  it.each(nonObjectData)('should throw for non-object configs (%j)', config => {
    expect(() => { validateConfig(config) }).toThrow(
      `the config should be of type 'object'`
    )
  })

  it('should throw for configs with additional properties', () => {
    const config = {
      additional: true,
    }

    expect(() => { validateConfig(config) }).toThrow(
      `the config must NOT have additional property 'additional'`,
    )
  })

  it.each(nonArrayData)('should throw for non-array asset lists (%j)', assets => {
    const config = {
      assets,
    }

    expect(() => { validateConfig(config) }).toThrow(
      `the value at '/assets' should be of type 'array'`,
    )
  })

  it.each(nonObjectData)('should throw for non-object assets (%j)', asset => {
    const config = {
      assets: [
        asset,
      ],
    }

    expect(() => { validateConfig(config) }).toThrow(
      `the value at '/assets/0' should be of type 'object'`,
    )
  })

  it('should throw for assets with missing paths', () => {
    const config = {
      assets: [
        {},
      ],
    }

    expect(() => { validateConfig(config) }).toThrow(
      `the value at '/assets/0' must have required property 'path'`,
    )
  })

  it('should throw for assets with empty paths', () => {
    const config = {
      assets: [
        {
          path: '',
        },
      ],
    }

    expect(() => { validateConfig(config) }).toThrow(
      `the value at '/assets/0/path' must NOT have fewer than 1 characters`,
    )
  })

  it('should throw for assets with additional properties', () => {
    const config = {
      assets: [
        {
          path: '.',
          additional: true,
        },
      ],
    }

    expect(() => { validateConfig(config) }).toThrow(
      `the value at '/assets/0' must NOT have additional property 'additional'`,
    )
  })
})
