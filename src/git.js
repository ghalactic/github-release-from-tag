import {exec} from '@actions/exec'

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
      async () => exec('git', ['fetch', 'origin', '--no-tags', '--force', `refs/tags/${tag}:refs/tags/${tag}`], {silent}),
    )

    return fetchTagExitCode === 0
  } catch {
    return false
  }
}
