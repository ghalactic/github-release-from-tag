# Changelog

All notable changes to this project will be documented in this file. The format
is based on [Keep a Changelog], and this project adheres to [Semantic
Versioning].

[keep a changelog]: https://keepachangelog.com/
[semantic versioning]: https://semver.org/

## Unreleased

### Changed

- **[BC BREAK]** Release bodies will no longer be rendered as HTML, and instead
  will undergo Markdown parsing and transformation to address the handling of
  [Markdown line breaks][v2.0-markdown-line-breaks].
  - This is primarily to address [#36] and [#37].
  - Most Markdown / GFM features are now handled by [Remark] (with
    [`remark-gfm`] and [`remark-github`]) instead of GitHub's own Markdown API.
  - There could be lots of subtle changes to the way release bodies are
    rendered. In practice, you will probably not even notice the difference (I
    hope).
- **[BC BREAK]** The `tagBodyRendered` output will no longer contain HTML, but
  instead will contain a transformed version of the Markdown from the tag
  annotation body.

[`remark-gfm`]: https://github.com/remarkjs/remark-gfm
[`remark-github`]: https://github.com/remarkjs/remark-github
[remark]: https://remark.js.org/

### Fixed

- Dependabot should no longer render empty release notes inside of dependency
  update pull request descriptions for dependencies that use this action to
  manage their releases ([#36]).
- Issue links in release bodies should no longer fail to render ([#37]).

[#36]: https://github.com/eloquent/github-release-action/issues/36
[#37]: https://github.com/eloquent/github-release-action/issues/37

## [v2.1.2]

[v2.1.2]: https://github.com/eloquent/github-release-action/releases/v2.1.2

### Fixed

- Fixed stripping of SSH signatures from tag annotation bodies (the previous fix
  did not actually work).

## [v2.1.1]

[v2.1.1]: https://github.com/eloquent/github-release-action/releases/v2.1.1

### Fixed

- Fixed stripping of SSH signatures from tag annotation bodies.
- Fixed excessive newlines being printed because of
  [an issue in `@actions/toolkit`].

[an issue in `@actions/toolkit`]: https://github.com/actions/toolkit/issues/777

## [v2.1.0]

[v2.1.0]: https://github.com/eloquent/github-release-action/releases/v2.1.0

### Added

- Support for specifying [release assets][v2.1-release-assets] to upload via
  the new `assets` action input.
- Support for [optional release assets][v2.1-optional-release-assets].

[v2.1-release-assets]: https://github.com/eloquent/github-release-action/tree/v2.1.0#release-assets
[v2.1-optional-release-assets]: https://github.com/eloquent/github-release-action/tree/v2.1.0#optional-release-assets

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
