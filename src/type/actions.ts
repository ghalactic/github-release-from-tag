import {
  error,
  getInput,
  group,
  info,
  setOutput,
  warning,
} from "@actions/core";

export type ErrorFn = typeof error;
export type GetInputFn = typeof getInput;
export type GroupFn = typeof group;
export type InfoFn = typeof info;
export type SetOutputFn = typeof setOutput;
export type WarningFn = typeof warning;
