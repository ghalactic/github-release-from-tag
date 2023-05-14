import {
  GetInputFn,
  GroupFn,
  InfoFn,
  SetOutputFn,
  WarningFn,
} from "../../src/type/actions.js";

export const getInput: GetInputFn = () => "";
export const group: GroupFn = async (_, fn) => fn();
export const info: InfoFn = () => {};
export const setOutput: SetOutputFn = () => {};
export const warning: WarningFn = () => {};
