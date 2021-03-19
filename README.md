# GitHub Release from Tag

This action automatically creates GitHub releases from annotated Git tag
messages.

- The tag message "subject" (the first line) becomes the release title.
- The tag message "body" (everything after the first line) becomes the release
  description.
- Markdown in the tag message body is supported.
- The release will be marked as a pre-release unless the tag is a
  [stable SemVer version].
- Releases will be edited if the tag is updated.

## Usage

```yaml
# .github/workflows/publish-release.yml
name: Publish release
on:
  push:
    tags:
    - '*'
jobs:
  publish:
    runs-on: ubuntu-latest
    name: Publish release
    steps:
    - name: Checkout
      uses: actions/checkout@v2
    - name: Publish release
      uses: eloquent/github-release-action@v1
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

<!-- References -->

[stable semver version]: https://semver.org/#semantic-versioning-specification-semver
