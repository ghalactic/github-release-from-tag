# Changelog

All notable changes to this project will be documented in this file. The format
is based on [Keep a Changelog], and this project adheres to [Semantic
Versioning].

[keep a changelog]: https://keepachangelog.com/
[semantic versioning]: https://semver.org/

## [Unreleased]

[unreleased]: https://github.com/eloquent/github-release-action

<!-- _There are currently no unreleased changes._ -->

### Added

- Support for specifying [release assets][v2.1-release-assets] to upload via
  the new `assetsYAML` action input.

[v2.1-release-assets]: https://github.com/eloquent/github-release-action/tree/v2.1.0#release-assets

## [v2.0.0]

[v2.0.0]: https://github.com/eloquent/github-release-action/releases/v2.0.0

### Changed

- **[BC BREAK]** This action was completely re-written in `v2` with support for
  many new features. With that being said, it _should_ be pretty much 100%
  compatible with `v1`.
- **[BC BREAK]** The `GITHUB_TOKEN` environment variable can no longer be used
  to supply a custom GitHub token. Use the
  [`token` action input][v2.0-token-action-input] instead.
- **[BC BREAK]** Improved the rendering of line breaks in tag annotation message
  bodies. See [Markdown line breaks][v2.0-markdown-line-breaks] for more
  information.
- **[BC BREAK]** Tag names like `v1` and `v1.2` are now considered "stable" as
  per [GitHub's recommendations for action versioning].

[v2.0-token-action-input]: https://github.com/eloquent/github-release-action/tree/v2.0.0#action-inputs
[v2.0-markdown-line-breaks]: https://github.com/eloquent/github-release-action/tree/v2.0.0#markdown-line-breaks
[github's recommendations for action versioning]: https://github.com/actions/toolkit/blob/%40actions/core%401.1.0/docs/action-versioning.md#recommendations

### Added

- Support for uploading [release assets][v2.0-release-assets].
- Support for appending [automated release notes][v2.0-automated-release-notes].
- Support for creating [release discussions][v2.0-release-discussions].
- Support for creating [draft releases][v2.0-draft-releases].
- Support for creating [reactions][v2.0-reactions] for releases and release
  discussions.
- Support for overriding [release stability][v2.0-release-stability] detection.

[v2.0-release-assets]: https://github.com/eloquent/github-release-action/tree/v2.0.0#release-assets
[v2.0-automated-release-notes]: https://github.com/eloquent/github-release-action/tree/v2.0.0#automated-release-notes
[v2.0-release-discussions]: https://github.com/eloquent/github-release-action/tree/v2.0.0#release-discussions
[v2.0-draft-releases]: https://github.com/eloquent/github-release-action/tree/v2.0.0#draft-releases
[v2.0-reactions]: https://github.com/eloquent/github-release-action/tree/v2.0.0#reactions
[v2.0-release-stability]: https://github.com/eloquent/github-release-action/tree/v2.0.0#release-stability
