import {renderReleaseBody} from '../../src/body.js'
import {group, info} from '../mocks/actions-core.js'
import {markdown} from '../mocks/oktokit-markdown.js'

describe('renderReleaseBody()', () => {
  const env = {
    GITHUB_ACTION_REPOSITORY: 'org-a/repo-a',
  }

  it('should render release bodies correctly', async () => {
    const tagBody = `### This should be a heading

This paragraph should have
no line breaks.

This should be a separate paragraph.`

    const expected = `<!-- generated by org-a/repo-a -->
<!-- original source:
### This should be a heading

This paragraph should have
no line breaks.

This should be a separate paragraph.
-->

{
  "markdown": true,
  "mode": "markdown",
  "text": "### This should be a heading\\n\\nThis paragraph should have\\nno line breaks.\\n\\nThis should be a separate paragraph."
}`

    const actual = await renderReleaseBody({
      env,
      group,
      info,
      markdown,
      tagBody,
    })

    expect(actual).toBe(expected)
  })
})