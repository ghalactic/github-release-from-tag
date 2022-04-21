import {readFile} from 'fs/promises'
import {load} from 'js-yaml'

const ENOENT = 'ENOENT'

export async function readConfig ({
  group,
  info,
}) {
  return group('Reading release configuration', async () => {
    let config

    try {
      config = load(await readFile('.github/release.eloquent.yml'))
    } catch (error) {
      if (error.code !== ENOENT) throw error

      info('No release configuration found at .github/release.eloquent.yml')
    }

    if (typeof config === 'undefined') {
      config = {
        assets: [],
      }
    }

    info(`Effective configuration: ${JSON.stringify(config, null, 2)}`)

    return config
  })
}
