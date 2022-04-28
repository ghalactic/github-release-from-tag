import Ajv from 'ajv'

import {schema} from './schema.js'

export function validateConfig (config) {
  const ajv = new Ajv({allErrors: true, useDefaults: true})
  const validator = ajv.compile(schema)
  const isValid = validator(config)

  if (isValid) return config

  const {errors} = validator

  const error = new Error(`Invalid release configuration:\n${renderErrors(errors)}`)
  error.errors = errors

  throw error
}

function renderErrors (errors) {
  return `  - ${errors.map(renderError).join('\n  - ')}\n`
}

function renderError (error) {
  const {instancePath} = error
  const subject = instancePath === '' ? 'the config' : `the value at '${instancePath}'`

  return `${subject} ${renderErrorMessage(error)}`
}

function renderErrorMessage (error) {
  const {keyword, params} = error

  switch (keyword) {
    case 'additionalProperties': return `must NOT have additional property '${params.additionalProperty}'`
    case 'type': return `should be of type '${params.type}'`
  }

  return error.message
}
