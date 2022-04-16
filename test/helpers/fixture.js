import {readdir, readFile} from 'fs/promises'
import {join} from 'path'

export function buildTagName (version, runId, label) {
  return `${version}+ci-${runId}-${label}`
}

export async function readFixtures (fixturesPath, runId) {
  const entries = await readdir(fixturesPath, {withFileTypes: true})
  const fixtures = []

  await Promise.all(entries.map(async entry => {
    if (entry.isDirectory()) fixtures.push(await readFixture(runId, join(fixturesPath, entry.name), entry.name))
  }))

  fixtures.sort(({name: a}, {name: b}) => a.localeCompare(b))

  return fixtures
}

async function readFixture (runId, fixturePath, name) {
  const [
    releaseBody,
    releaseName,
    tagAnnotation,
    tagName,
  ] = await Promise.all([
    readFile(join(fixturePath, 'release-body.html')),
    readFile(join(fixturePath, 'release-name')),
    readFile(join(fixturePath, 'tag-annotation')),
    readFile(join(fixturePath, 'tag-name')),
  ])

  return {
    name,
    releaseBody: releaseBody.toString(),
    releaseName: releaseName.toString().trim(),
    tagAnnotation: tagAnnotation.toString(),
    tagName: buildTagName(tagName.toString().trim(), runId, name),
  }
}
