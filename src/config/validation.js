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
  const {instancePath, message} = error
  const subject = instancePath && ` (${instancePath})`

  return `${message}${subject}`
}
