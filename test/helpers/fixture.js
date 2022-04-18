import {readdirSync, readFileSync} from 'fs'
import {join} from 'path'

import {owner, repo} from './fixture-repo.js'

export function readFailureFixtures (fixturesPath, runId) {
  const entries = readdirSync(fixturesPath, {withFileTypes: true})
  const fixtures = {}

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const name = `failure-${entry.name}`
    fixtures[name] = readFixture(runId, join(fixturesPath, entry.name), name)
  }

  return fixtures
}

export function readSuccessFixtures (fixturesPath, runId) {
  const entries = readdirSync(fixturesPath, {withFileTypes: true})
  const fixtures = {}

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const name = `success-${entry.name}`
    fixtures[name] = readSuccessFixture(runId, join(fixturesPath, entry.name), name)
  }

  return fixtures
}

function buildTagName (version, runId, label) {
  return `${version}+ci-${runId}-${label}`
}

function readFixture (runId, fixturePath, name) {
  const tagAnnotation = readFileSync(join(fixturePath, 'tag-annotation')).toString().trim()
  const tagName = buildTagName(readFileSync(join(fixturePath, 'tag-name')).toString().trim(), runId, name)

  return {
    name,
    tagAnnotation,
    tagName,
  }
}

function readSuccessFixture (runId, fixturePath, name) {
  const fixture = readFixture(runId, fixturePath, name)
  const releaseAttributes = JSON.parse(readFileSync(join(fixturePath, 'release-attributes.json')))
  const releaseBody = JSON.parse(readFileSync(join(fixturePath, 'release-body.json')))

  for (const label in releaseBody) {
    releaseBody[label] = releaseBody[label]
      .replace('{owner}', owner)
      .replace('{repo}', repo)
  }

  return {
    ...fixture,
    releaseAttributes,
    releaseBody,
  }
}
