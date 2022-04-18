import {readdirSync, readFileSync} from 'fs'
import {join} from 'path'

import {owner, repo} from './fixture-repo.js'

export function buildTagName (version, runId, label) {
  return `${version}+ci-${runId}-${label}`
}

export function readSuccessFixtures (fixturesPath, runId) {
  const entries = readdirSync(fixturesPath, {withFileTypes: true})
  const fixtures = {}

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const {name} = entry
    fixtures[name] = readSuccessFixture(runId, join(fixturesPath, name), name)
  }

  return fixtures
}

function readSuccessFixture (runId, fixturePath, name) {
  const releaseAttributes = JSON.parse(readFileSync(join(fixturePath, 'release-attributes.json')))
  const releaseBody = JSON.parse(readFileSync(join(fixturePath, 'release-body.json')))
  const tagAnnotation = readFileSync(join(fixturePath, 'tag-annotation')).toString()
  const tagName = buildTagName(readFileSync(join(fixturePath, 'tag-name')).toString().trim(), runId, name)

  for (const label in releaseBody) {
    releaseBody[label] = releaseBody[label]
      .replace('{owner}', owner)
      .replace('{repo}', repo)
  }

  return {
    name,
    releaseAttributes,
    releaseBody,
    tagAnnotation,
    tagName,
  }
}
