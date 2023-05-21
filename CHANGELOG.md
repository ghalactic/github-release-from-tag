# Changelog

All notable changes to this project will be documented in this file. The format
is based on [Keep a Changelog], and this project adheres to [Semantic
Versioning].

[keep a changelog]: https://keepachangelog.com/
[semantic versioning]: https://semver.org/

## [v4.0.1] - 2023-05-21

[v4.0.1]: https://github.com/ghalactic/github-release-from-tag/releases/v4.0.1

### Fixed

- Updated examples in the README to reference `v4`.

## [v4.0.0] - 2023-05-21

[v4.0.0]: https://github.com/ghalactic/github-release-from-tag/releases/v4.0.0

This action has been migrated to a new organization named [Ghalactic] that is
dedicated to housing high-quality GitHub actions. Please update your workflows
to reference the action's new location at
`ghalactic/github-release-from-tag@v4`.

[ghalactic]: https://ghalactic.github.io/

### Migrating from `v3` to `v4`

- Update the [uses] value from `eloquent/github-release-action@v3` to
  `ghalactic/github-release-from-tag@v4`.
- Rename any [configuration files] from `.github/release.eloquent.yml` to
  `.github/github-release-from-tag.yml`.

[uses]: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsuses
[configuration files]: https://github.com/ghalactic/github-release-from-tag/tree/v4.0.0#the-configuration-file

### Backwards-compatibility breaks

- Configuration files must now be located at
  `.github/github-release-from-tag.yml`.

### Changed

- The repo was moved to `ghalactic/github-release-from-tag`.

## [v3.2.1] - 2023-05-14

[v3.2.1]: https://github.com/ghalactic/github-release-from-tag/releases/v3.2.1

### Other

- Converted to TypeScript.

## [v3.2.0] - 2023-04-06

[v3.2.0]: https://github.com/ghalactic/github-release-from-tag/releases/v3.2.0

### Improved

- Switched from Docker to Node.js runtime for faster startup times.
- Added [`@octokit/plugin-retry`] to improve resilience against transient
  network issues.

[`@octokit/plugin-retry`]: https://github.com/octokit/plugin-retry.js

## [v3.1.4] - 2023-02-06

[v3.1.4]: https://github.com/ghalactic/github-release-from-tag/releases/v3.1.4

### Fixed

- Fixed Git "dubious ownership" error that occurs due to the way GitHub Actions
  sets up ownership of the workspace directory. This action now explicitly adds
  the workspace directory to Git's list of "safe" directories to avoid the
  error.

## [v3.1.3] - 2023-01-17

[v3.1.3]: https://github.com/ghalactic/github-release-from-tag/releases/v3.1.3

### Fixed

- Fixed rendering of workflow summaries.

## [v3.1.2] - 2022-11-21

[v3.1.2]: https://github.com/ghalactic/github-release-from-tag/releases/v3.1.2

### Fixed

- Replaced usage of [deprecated `set-output`] GitHub Actions command.

[deprecated `set-output`]: https://github.blog/changelog/2022-10-11-github-actions-deprecating-save-state-and-set-output-commands/

## [v3.1.1] - 2022-09-13

[v3.1.1]: https://github.com/ghalactic/github-release-from-tag/releases/v3.1.1

### Changed

- The attribution comment will now be appended to the end of the release body
  instead of the beginning. This is a precaution, in case having the comment at
  the beginning of the body might cause Dependabot to truncate more of the
  actual release notes.

## [v3.1.0] - 2022-09-11

[v3.1.0]: https://github.com/ghalactic/github-release-from-tag/releases/v3.1.0

### Added

- Actions [job summaries][v3.1-job-summaries] will now include information about
  the user that created the tag.
- Added the `summaryEnabled` input, which can be used to disable
  [job summary][v3.1-job-summaries] creation.
- Added the `summary.enabled` config option, which can be used to disable
  [job summary][v3.1-job-summaries] creation.
- Added the `taggerAvatarUrl` output, which contains the avatar URL of the
  GitHub user who created the tag.
- Added the `taggerLogin` output, which contains the username of the GitHub user
  who created the tag.

[v3.1-job-summaries]: https://github.com/ghalactic/github-release-from-tag/tree/v3.1.0#job-summaries

### Changed

- Removed [`remark-github`] from the Markdown processor. It was causing user
  mentions and other references to render without hover cards in release bodies.
  It was also likely to cause more trouble when integrating with GitHub
  Enterprise Server.

[`remark-github`]: https://github.com/remarkjs/remark-github

## [v3.0.0] - 2022-09-10

[v3.0.0]: https://github.com/ghalactic/github-release-from-tag/releases/v3.0.0

### Added

- Actions [job summaries][v3.0-job-summaries] will now be created when the
  action is successful.

[v3.0-job-summaries]: https://github.com/ghalactic/github-release-from-tag/tree/v3.0.0#job-summaries

### Removed

- Workflow annotations containing the release URL will no longer be created when
  the action is successful. This feature has been replaced by
  [job summaries][v3.0-job-summaries].

[v3.0-job-summaries]: https://github.com/ghalactic/github-release-from-tag/tree/v3.0.0#job-summaries

### Changed

- **[BC BREAK]** Release bodies will no longer be rendered as HTML, and instead
  will undergo Markdown parsing and transformation to address the handling of
  [Markdown line breaks][v3.0-markdown-line-breaks].
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
[v3.0-markdown-line-breaks]: https://github.com/ghalactic/github-release-from-tag/tree/v3.0.0#markdown-line-breaks

### Fixed

- Dependabot should no longer render empty release notes inside of dependency
  update pull request descriptions for dependencies that use this action to
  manage their releases ([#36]).
- Issue links in release bodies should no longer fail to render ([#37]).

[#36]: https://github.com/ghalactic/github-release-from-tag/issues/36
[#37]: https://github.com/ghalactic/github-release-from-tag/issues/37

## [v2.1.2] - 2022-09-01

[v2.1.2]: https://github.com/ghalactic/github-release-from-tag/releases/v2.1.2

### Fixed

- Fixed stripping of SSH signatures from tag annotation bodies (the previous fix
  did not actually work).

## [v2.1.1] - 2022-09-01

[v2.1.1]: https://github.com/ghalactic/github-release-from-tag/releases/v2.1.1

### Fixed

- Fixed stripping of SSH signatures from tag annotation bodies.
- Fixed excessive newlines being printed because of
  [an issue in `@actions/toolkit`].

[an issue in `@actions/toolkit`]: https://github.com/actions/toolkit/issues/777

## [v2.1.0] - 2022-08-03

[v2.1.0]: https://github.com/ghalactic/github-release-from-tag/releases/v2.1.0

### Added

- Support for specifying [release assets][v2.1-release-assets] to upload via
  the new `assets` action input.
- Support for [optional release assets][v2.1-optional-release-assets].

[v2.1-release-assets]: https://github.com/ghalactic/github-release-from-tag/tree/v2.1.0#release-assets
[v2.1-optional-release-assets]: https://github.com/ghalactic/github-release-from-tag/tree/v2.1.0#optional-release-assets

## [v2.0.0] - 2022-06-05

[v2.0.0]: https://github.com/ghalactic/github-release-from-tag/releases/v2.0.0

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

[v2.0-token-action-input]: https://github.com/ghalactic/github-release-from-tag/tree/v2.0.0#action-inputs
[v2.0-markdown-line-breaks]: https://github.com/ghalactic/github-release-from-tag/tree/v2.0.0#markdown-line-breaks
[github's recommendations for action versioning]: https://github.com/actions/toolkit/blob/%40actions/core%401.1.0/docs/action-versioning.md#recommendations

### Added

- Support for uploading [release assets][v2.0-release-assets].
- Support for appending [automated release notes][v2.0-automated-release-notes].
- Support for creating [release discussions][v2.0-release-discussions].
- Support for creating [draft releases][v2.0-draft-releases].
- Support for creating [reactions][v2.0-reactions] for releases and release
  discussions.
- Support for overriding [release stability][v2.0-release-stability] detection.

[v2.0-release-assets]: https://github.com/ghalactic/github-release-from-tag/tree/v2.0.0#release-assets
[v2.0-automated-release-notes]: https://github.com/ghalactic/github-release-from-tag/tree/v2.0.0#automated-release-notes
[v2.0-release-discussions]: https://github.com/ghalactic/github-release-from-tag/tree/v2.0.0#release-discussions
[v2.0-draft-releases]: https://github.com/ghalactic/github-release-from-tag/tree/v2.0.0#draft-releases
[v2.0-reactions]: https://github.com/ghalactic/github-release-from-tag/tree/v2.0.0#reactions
[v2.0-release-stability]: https://github.com/ghalactic/github-release-from-tag/tree/v2.0.0#release-stability
