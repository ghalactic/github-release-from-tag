import Ajv from "ajv";
import {
  ASSETS,
  assets as assetsSchema,
  CONFIG,
  config as configSchema,
} from "./schema.js";

const ajv = new Ajv({
  schemas: [assetsSchema, configSchema],
  allErrors: true,
  useDefaults: true,
});

export const validateConfig = createValidate(CONFIG, "release configuration");
export const validateAssets = createValidate(
  ASSETS,
  "release assets configuration"
);

function createValidate(schema, label) {
  return function validate(value) {
    const validator = ajv.getSchema(schema);
    const isValid = validator(value);

    if (isValid) return value;

    const { errors } = validator;

    const error = new Error(`Invalid ${label}:\n${renderErrors(errors)}`);
    error.errors = errors;

    throw error;
  };
}

function renderErrors(errors) {
  return `  - ${errors.map(renderError).join("\n  - ")}\n`;
}

function renderError(error) {
  const { instancePath, message } = error;
  const subject = instancePath && ` (${instancePath})`;

  return `${message}${subject}`;
}
