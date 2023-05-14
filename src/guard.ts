export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export function isObject(value: unknown): value is { [key: string]: unknown } {
  return typeof value === "object" && value != null;
}
