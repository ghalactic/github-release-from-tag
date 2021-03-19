# GitHub Release from Tag

This action automatically creates GitHub releases from annotated Git tag
messages.

- The tag message "subject" (the first line) becomes the release title.
- The tag message "body" (everything after the first line) becomes the release
  description.
- Markdown in the tag message body is supported.
- The release will be marked as a pre-release unless the tag is a
  [stable SemVer version].

<!-- References -->

[stable semver version]: https://semver.org/#semantic-versioning-specification-semver
