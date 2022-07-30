export function readRunId() {
  const {
    GITHUB_RUN_ID: id = "",
    GITHUB_RUN_NUMBER: number = "",
    GITHUB_RUN_ATTEMPT: attempt = "",
  } = process.env;

  if (id !== "" && number !== "" && attempt !== "")
    return `${id}.${number}.${attempt}`;

  return `manual.${(Math.random() + 1).toString(36).substring(2)}`;
}
