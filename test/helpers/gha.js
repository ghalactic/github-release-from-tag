export function readRunId () {
  const {
    GITHUB_RUN_ID: id = '',
    GITHUB_RUN_NUMBER: number = '',
    GITHUB_RUN_ATTEMPT: attempt = '',
  } = process.env

  if (id === '' || number === '' || attempt === '') return undefined

  return `${id}.${number}.${attempt}`
}
