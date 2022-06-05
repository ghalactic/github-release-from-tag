# Changelog

All notable changes to this project will be documented in this file. The format
is based on [Keep a Changelog], and this project adheres to [Semantic
Versioning].

[keep a changelog]: https://keepachangelog.com/
[semantic versioning]: https://semver.org/

## [Unreleased]

[unreleased]: https://github.com/eloquent/github-release-action

_There are currently no unreleased changes._

## [v2.0.0]

[v2.0.0]: https://github.com/eloquent/github-release-action/releases/v2.0.0

### Changed

- **[BC BREAK]** This action was completely re-written in `v2` with support for
  many new features. With that being said, it _should_ be pretty much 100%
  compatible with `v1`.
- **[BC BREAK]** Improved the rendering of line breaks in tag annotation message
  bodies. See [Markdown line breaks] for more information.
- **[BC BREAK]** Tag names like `v1` and `v1.2` are now considered "stable" as
  per [GitHub's recommendations for action versioning].

[markdown line breaks]: README.md#markdown-line-breaks
[github's recommendations for action versioning]: https://github.com/actions/toolkit/blob/%40actions/core%401.1.0/docs/action-versioning.md#recommendations

### Added

- Support for uploading [release assets].
- Support for appending [automated release notes].
- Support for creating [release discussions].
- Support for creating [draft releases].
- Support for creating [reactions] for releases and release discussions.
- Support for overriding [release stability] detection.

[release assets]: README.md#release-assets
[automated release notes]: README.md#automated-release-notes
[release discussions]: README.md#release-discussions
[draft releases]: README.md#draft-releases
[reactions]: README.md#reactions
[release stability]: README.md#release-stability
