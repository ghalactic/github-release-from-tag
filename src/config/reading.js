import {readFile} from 'fs/promises'
import {load} from 'js-yaml'

import {validateConfig} from './validation.js'

export async function readConfig ({
  getInput,
  group,
  info,
}) {
  return group('Reading release configuration', async () => {
    const [hasYaml, yaml] = await readConfigFile()

    if (!hasYaml) info('No configuration found at .github/release.eloquent.yml')

    const base = validateConfig(hasYaml ? load(yaml) : {})
    const [overrides, hasOverrides] = getConfigOverrides(getInput)

    if (hasOverrides) {
      info(`Base configuration: ${JSON.stringify(base, null, 2)}`)
      info(`Configuration overrides: ${JSON.stringify(overrides, null, 2)}`)
    }

    const effective = {...base, ...overrides}
    info(`Effective configuration: ${JSON.stringify(effective, null, 2)}`)

    return effective
  })
}

async function readConfigFile () {
  let data

  try {
    data = await readFile('.github/release.eloquent.yml')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error

    return [false, undefined]
  }

  const yaml = data.toString().trim()

  return [yaml.length > 0, yaml]
}

function getConfigOverrides (getInput) {
  const overrides = {}

  const discussionCategory = getInput('discussionCategory')
  const draft = getInput('draft')
  const generateReleaseNotes = getInput('generateReleaseNotes')

  if (discussionCategory) overrides.discussionCategory = discussionCategory
  if (draft) overrides.draft = draft === 'true'
  if (generateReleaseNotes) overrides.generateReleaseNotes = generateReleaseNotes === 'true'

  return [overrides, Object.keys(overrides).length > 0]
}
