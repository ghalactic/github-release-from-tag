import {readdir, readFile} from 'fs/promises'
import {join, resolve} from 'path'
import {fileURLToPath} from 'url'

export async function readFixtures () {
  const fixturesPath = resolve(fileURLToPath(import.meta.url), '../../fixture')
  const entries = await readdir(fixturesPath, {withFileTypes: true})
  const fixtures = {}

  await Promise.all(entries.map(async entry => {
    if (entry.isDirectory()) fixtures[entry.name] = await readFixture(join(fixturesPath, entry.name))
  }))

  return fixtures
}

async function readFixture (fixturePath) {
  const [
    releaseBody,
    releaseName,
    tagAnnotation,
  ] = await Promise.all([
    readFile(join(fixturePath, 'release-body.html')),
    readFile(join(fixturePath, 'release-name')),
    readFile(join(fixturePath, 'tag-annotation')),
  ])

  return {
    releaseBody: releaseBody.toString(),
    releaseName: releaseName.toString().trim(),
    tagAnnotation: tagAnnotation.toString(),
  }
}
