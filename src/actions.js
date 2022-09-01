import { issueCommand } from "@actions/core/lib/command.js";

// FIXME: See https://github.com/actions/toolkit/issues/777
export function setOutput(name, value) {
  issueCommand("set-output", { name }, value);
}
