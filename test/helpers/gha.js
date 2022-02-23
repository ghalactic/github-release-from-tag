let runId

export async function readRunId (suffix) {
  if (runId == null) {
    const {
      GITHUB_RUN_ID: id = 'x',
      GITHUB_RUN_NUMBER: number = 'x',
      GITHUB_RUN_ATTEMPT: attempt = 'x',
    } = process.env

    runId = `${id}.${number}.${attempt}`
  }

  return runId
}
