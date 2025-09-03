import ajvModule, { ErrorObject } from "ajv";
import assetsSchema from "../schema/assets.v6.schema.json" with { type: "json" };
import configSchema from "../schema/config.v6.schema.json" with { type: "json" };
import { AssetConfig, Config } from "../type/config.js";

// see https://github.com/ajv-validator/ajv/issues/2132
const Ajv = ajvModule.default;

const ajv = new Ajv({
  schemas: [assetsSchema, configSchema],
  allErrors: true,
  useDefaults: true,
});

export const validateConfig = createValidate<Config>(
  configSchema.$id,
  "release configuration",
);

export const validateAssets = createValidate<AssetConfig[]>(
  assetsSchema.$id,
  "release assets configuration",
);

class ValidateError extends Error {
  public errors: ErrorObject[];

  constructor(message: string, errors: ErrorObject[]) {
    super(message);

    this.errors = errors;
  }
}

function createValidate<T>(
  schemaId: string,
  label: string,
): (value: unknown) => T {
  return function validate(value) {
    const validator = ajv.getSchema(schemaId);
    if (!validator) throw new Error(`Undefined schema ${schemaId}`);

    if (validator(value)) return value as T;

    const errors = validator.errors ?? [];

    const error = new ValidateError(
      `Invalid ${label}:\n${renderErrors(errors)}`,
      errors,
    );

    throw error;
  };
}

function renderErrors(errors: ErrorObject[]): string {
  return `  - ${errors.map(renderError).join("\n  - ")}\n`;
}

function renderError(error: ErrorObject): string {
  const { instancePath, message } = error;
  const subject = instancePath && ` (${instancePath})`;

  return `${message}${subject}`;
}
