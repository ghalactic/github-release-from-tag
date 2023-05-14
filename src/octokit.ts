import { Octokit } from "@octokit/action";
import { retry } from "@octokit/plugin-retry";
import { RequestError as RequestErrorData } from "@octokit/types";
import { isObject } from "./guard.js";

export function createOctokit(token: string) {
  const CustomOctokit = Octokit.plugin(retry);

  return new CustomOctokit({ auth: token });
}

export function isRequestError(value: unknown): value is RequestError {
  if (!isObject(value)) return false;

  const response = value.response as { data?: unknown } | undefined;
  const data = response?.data;

  return typeof data === "object" && data != null;
}

type RequestError = Error & { response: { data: RequestErrorData } };
