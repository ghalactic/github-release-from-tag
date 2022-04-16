import {readdirSync, readFileSync} from 'fs'
import {join} from 'path'

import {owner, repo} from './fixture-repo.js'

export function buildTagName (version, runId, label) {
  return `${version}+ci-${runId}-${label}`
}

export function readFixtures (fixturesPath, runId) {
  const entries = readdirSync(fixturesPath, {withFileTypes: true})
  const fixtures = []

  for (const entry of entries) {
    if (entry.isDirectory()) fixtures.push(readFixture(runId, join(fixturesPath, entry.name), entry.name))
  }

  fixtures.sort(({name: a}, {name: b}) => a.localeCompare(b))

  return fixtures
}

function readFixture (runId, fixturePath, name) {
  const releaseAttributes = JSON.parse(readFileSync(join(fixturePath, 'release-attributes.json')))
  const releaseBody = readFileSync(join(fixturePath, 'release-body.html'))
  const releaseLinks = JSON.parse(readFileSync(join(fixturePath, 'release-links.json')))
  const releaseName = readFileSync(join(fixturePath, 'release-name'))
  const tagAnnotation = readFileSync(join(fixturePath, 'tag-annotation'))
  const tagName = readFileSync(join(fixturePath, 'tag-name'))

  for (const text in releaseLinks) {
    releaseLinks[text] = releaseLinks[text]
      .replace('{owner}', owner)
      .replace('{repo}', repo)
  }

  return {
    name,
    releaseAttributes,
    releaseBody: releaseBody.toString(),
    releaseLinks,
    releaseName: releaseName.toString().trim(),
    tagAnnotation: tagAnnotation.toString(),
    tagName: buildTagName(tagName.toString().trim(), runId, name),
  }
}
