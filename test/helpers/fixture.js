import {readdirSync, readFileSync} from 'fs'
import {load} from 'js-yaml'
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
  const tagAnnotation = readFileSync(join(fixturePath, 'tag-annotation.md')).toString().trim()
  const tagName = buildTagName(readFileSync(join(fixturePath, 'tag-name')).toString().trim(), runId, name)
  const workflowSteps = readFileSync(join(fixturePath, 'workflow-steps.yml')).toString()

  return {
    name,
    tagAnnotation,
    tagName,
    workflowSteps,
  }
}

function readSuccessFixture (runId, fixturePath, name) {
  const fixture = readFixture(runId, fixturePath, name)
  const releaseAttributes = load(readFileSync(join(fixturePath, 'release-attributes.yml')))
  const releaseBody = load(readFileSync(join(fixturePath, 'release-body.yml')))

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
