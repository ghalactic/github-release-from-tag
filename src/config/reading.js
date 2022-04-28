import {readFile} from 'fs/promises'
import {load} from 'js-yaml'

import {validateConfig} from './validation.js'

export async function readConfig ({
  group,
  info,
}) {
  return group('Reading release configuration', async () => {
    const [hasYaml, yaml] = await readConfigFile()

    if (!hasYaml) info('No release configuration found at .github/release.eloquent.yml')

    const config = validateConfig(hasYaml ? load(yaml) : {})
    info(`Effective configuration: ${JSON.stringify(config, null, 2)}`)

    return config
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
