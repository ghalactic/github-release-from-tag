import {exec, getExecOutput} from '@actions/exec'

/**
 * Fetch the real tag, because GHA creates a fake lightweight tag, and we need
 * the tag annotation to build our release content.
 */
export async function fetchTagAnnotation ({
  group,
  silent = false,
  tag,
}) {
  try {
    const fetchTagExitCode = await group(
      'Fetching the tag annotation',
      async () =>
        exec('git', ['fetch', 'origin', '--no-tags', '--force', `refs/tags/${tag}:refs/tags/${tag}`], {silent}),
    )

    return fetchTagExitCode === 0
  } catch {
    return false
  }
}

export async function readTagAnnotation ({
  group,
  silent = false,
  tag,
}) {
  try {
    const {stdout: tagSubject} = await group('Reading the tag annotation subject', async () => {
      return getExecOutput('git', ['tag', '-n1', '--format', '%(contents:subject)', tag], {silent})
    })
    const {stdout: tagBody} = await group('Reading the tag annotation body', async () => {
      return getExecOutput('git', ['tag', '-n1', '--format', '%(contents:body)', tag], {silent})
    })

    return [
      true,
      tagSubject.trim(),
      tagBody.trim(),
    ]
  } catch {
    return [
      false,
      '',
      '',
    ]
  }
}
