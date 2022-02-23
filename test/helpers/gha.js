let runId

export async function readRunId (suffix) {
  if (runId == null) {
    const {
      GITHUB_RUN_ID: runId = 'x',
      GITHUB_RUN_NUMBER: runNumber = 'x',
      GITHUB_RUN_ATTEMPT: runAttempt = 'x',
    } = process.env

    runId = `${runId}.${runNumber}.${runAttempt}`
  }

  return runId
}
