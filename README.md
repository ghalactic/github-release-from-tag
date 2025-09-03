# GitHub Release from Tag

A [GitHub Action] that creates [GitHub Releases] from your Git tags. Does what
you _probably wish_ GitHub would just do without the need to use GitHub Actions.

[github action]: https://docs.github.com/actions
[github releases]: https://docs.github.com/repositories/releasing-projects-on-github/about-releases

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="/assets/images/release-summary-dark.svg">
  <img alt="Example release job summary" src="/assets/images/release-summary-light.svg#gh-light-mode-only">
</picture>

## Overview

This action creates releases by sourcing the release data from the place where
it makes the most sense to keep it — your Git tags. By harnessing [SemVer] to
determine pre-release status, and [Markdown] for formatting, your GitHub
Releases become a natural extension of your Git tags.

[semver]: https://semver.org/
[markdown]: https://docs.github.com/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github

In addition, this action has been designed to feel like it _could_ be a
first-party GitHub feature. Its feature set closely mirrors what you have access
to when you [publish a GitHub Release manually].

[publish a github release manually]: https://docs.github.com/repositories/releasing-projects-on-github/managing-releases-in-a-repository#creating-a-release

## Features

- [Minimal configuration, or often **zero** configuration](#configuration)
- [SemVer stability determines **pre-release** status](#release-stability)
- [**Markdown** support in tag annotation messages](#release-name-and-body)
- [Asset uploading with support for **labels** and **checksums**](#release-assets)
- [Automated **release notes** support](#automated-release-notes)
- [Release **discussion** creation](#release-discussions)
- [Releases can be created as **drafts**](#draft-releases)
- [Creation of initial **🚀 reactions ❤️** to promote engagement](#reactions)
- [Creation of **job summaries** for the Actions run summary page](#job-summaries)
- [Works with GitHub Enterprise Server (GHES)](#github-enterprise-server-support)

## Usage

### Workflow for tag creation

Most of the time you will want tag pushes to trigger release publishing:

```yaml
# .github/workflows/publish-release.yml
name: Publish release
on:
  push:
    tags:
      - "*"
jobs:
  publish:
    name: Publish release
    runs-on: ubuntu-latest
    permissions:
      contents: write
      discussions: write # (for release discussion creation)
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Publish release
        uses: ghalactic/github-release-from-tag@v6
```

It's also possible to use [`if` conditionals] to restrict the release publishing
step inside a multi-purpose workflow, so that it only runs on tag pushes:

[`if` conditionals]: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsif

```yaml
- name: Publish release
  uses: ghalactic/github-release-from-tag@v6
  if: github.ref_type == 'tag'
```

### Workflow for manual runs

You may also want to be able to manually publish releases for a specific tag.
This allows you to remedy failed publish attempts, or publish tags that were
created before automated release publishing was set up:

```yaml
# .github/workflows/publish-release-manual.yml
name: Publish release (manual)
on:
  workflow_dispatch:
    inputs:
      tag:
        description: The tag to publish
        required: true
jobs:
  publish:
    name: Publish release
    runs-on: ubuntu-latest
    permissions:
      contents: write
      discussions: write # (for release discussion creation)
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          ref: refs/tags/${{ inputs.tag }}
      - name: Publish release
        uses: ghalactic/github-release-from-tag@v6
```

### GitHub token

By default, this action uses [automatic token authentication] to obtain the
token used to manage releases. If for some reason you want to supply a different
token, you can do so via [action inputs]:

[automatic token authentication]: https://docs.github.com/actions/security-guides/automatic-token-authentication
[action inputs]: #action-inputs

```yaml
# In your workflow:
- uses: ghalactic/github-release-from-tag@v6
  with:
    token: ${{ secrets.CUSTOM_GITHUB_TOKEN }}
```

The token requires the following permissions:

- **Write** access to **repository contents**, in order to create releases.
- **Write** access to **discussions**, in order to create [release discussions].

[release discussions]: #release-discussions

For information on how to grant these permissions, see [Modifying the
permissions for the `GITHUB_TOKEN`].

[modifying the permissions for the `github_token`]: https://docs.github.com/actions/security-guides/automatic-token-authentication#modifying-the-permissions-for-the-github_token

> [!NOTE]
> In February 2023, the default token permissions for new repos
> [changed to be read-only]. If your repo was created before this time, the
> default token would have been pre-configured with write access.

[changed to be read-only]: https://github.blog/changelog/2023-02-02-github-actions-updating-the-default-github_token-permissions-to-read-only/

### Release stability

This action uses [SemVer] rules to determine whether a tag should be published
as a **pre-release**, or a **stable release**. The decision is made as follows:

- If the tag name is a **"stable"** SemVer version, it's considered a **stable
  release**.
- If the tag name is an **"unstable"** SemVer version, it's considered a
  **pre-release**.
- If the tag name is **not** a valid SemVer version, it's considered a
  **pre-release**.

[semver]: https://semver.org/

The standard SemVer rules are relaxed a bit to allow for tag names with a `v`
prefix (e.g. `v1.2.3`), as well as major/minor version tag names (e.g. `v1`,
`v1.2`) as per [GitHub's recommendations for action versioning].

[github's recommendations for action versioning]: https://github.com/actions/toolkit/blob/%40actions/core%401.1.0/docs/action-versioning.md#recommendations

It's also possible to [configure] an override for this behavior, and force a
release to be published as either a **pre-release** or **stable release**. This
can be done via the [configuration file], or via [action inputs]:

[configure]: #configuration
[configuration file]: #the-configuration-file
[action inputs]: #action-inputs

```yaml
# In .github/github-release-from-tag.yml:
prerelease: true # or false
```

```yaml
# In your workflow:
- uses: ghalactic/github-release-from-tag@v6
  with:
    prerelease: "true" # or "false"
```

#### Example release stabilities

| Tag name                             | Is SemVer? | Release stability |
| :----------------------------------- | :--------- | :---------------- |
| `1` / `v1`                           | no         | stable release    |
| `1.2` / `v1.2`                       | no         | stable release    |
| `1.2.3` / `v1.2.3`                   | yes        | stable release    |
| `1.2.3+21AF26D3` / `v1.2.3+21AF26D3` | yes        | stable release    |
| `0.1.0` / `v0.1.0`                   | yes        | pre-release       |
| `1.2.3-alpha` / `v1.2.3-alpha`       | yes        | pre-release       |
| `0` / `v0`                           | no         | pre-release       |
| `0.1` / `v0.1`                       | no         | pre-release       |
| `something-else`                     | no         | pre-release       |

### Draft releases

This action can be [configured] to create draft releases. These draft releases
can then be published manually at some later time via GitHub. You can enable
this feature via the [configuration file], or via [action inputs]:

[configured]: #configuration
[configuration file]: #the-configuration-file
[action inputs]: #action-inputs

```yaml
# In .github/github-release-from-tag.yml:
draft: true
```

```yaml
# In your workflow:
- uses: ghalactic/github-release-from-tag@v6
  with:
    draft: "true"
```

### Release name and body

This action generates a release **name** and **body** from your **tag annotation
message**. Git already breaks your tag annotation messages into two parts that
line up with each part of a GitHub release:

- The tag annotation **subject** becomes the release **name**.
- The tag annotation **body** is rendered as [Markdown], and used as the release
  **body**.

[markdown]: https://docs.github.com/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github

The tag annotation "subject" is just the first **paragraph** of the message. The
"body" is everything that follows:

    This is part of the subject.
    This is also considered part of the subject.

    This is the beginning of the body.
    This is also part of the body.

    The body can have multiple paragraphs.

#### Markdown support

For the most part, [Markdown] "just works" how you would expect. You can write
Markdown in the "body" portion of your tag annotations, and it will be rendered
in the body of the releases published by this action.

[markdown]: https://docs.github.com/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github

##### Markdown headings in tag annotation messages

When authoring tag annotation messages, you might run into the issue that
Markdown **headings** are lines that start with a `#` character, which Git
interprets as a **comment**. You can get around this limitation by using the
following Git command to create the tag:

    git tag --annotate --cleanup=whitespace --edit --message "" 1.0.0

You might want to add a **Git alias** to make it easier to remember the command:

    git config --global alias.tag-md 'tag --annotate --cleanup=whitespace --edit --message ""'

With the above alias configured, you can then use `git tag-md` to create tags
with Markdown tag annotation bodies:

    git tag-md 1.0.0

##### Markdown heading anchors

GitHub doesn't generate [section links] for Markdown headings in release bodies,
like it does for other Markdown content. This means that you normally can't link
directly to a heading in a release body, or include links to headings in your
release body markdown.

[section links]: https://docs.github.com/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#section-links

This action solves this issue by generating **heading anchors** for each heading
in the release body. These anchors work just like the ones generated for most
Markdown content on GitHub, and can be used to link directly to headings in your
release body.

For example, if you have a heading in your release body like this:

```markdown
#### Support for turbo-encabulators

For a number of years now, work has been proceeding in order to bring perfection
to the crudely conceived idea of a machine that would not only supply inverse
reactive current for use in unilateral phase detractors, but would also be
capable of automatically synchronizing cardinal grammeters. Such a machine is
the Turbo-Encabulator.
```

Then you can link directly to this heading in your release body like so:

```markdown
### Added

- Added support for [turbo-encabulators].

[turbo-encabulators]: #support-for-turbo-encabulators
```

And once the release is published, you can also link directly to the heading in
the release body from external sources by adding the anchor to the end of the
release URL, like so:

https://github.com/ghalactic/github-release-from-tag/releases/v5.3.0#markdown-heading-anchors

##### Markdown line breaks

It's common for tag annotation messages to be "wrapped" at a fixed column width,
for readability when viewed as plain text:

    1.0.0

    This provides an example of a Git tag annotation body that has been
    "hard wrapped". This is a very common practice.

If we were to copy the body from the tag annotation message above directly into
the GitHub release, the line breaks would be interpreted as explicit line breaks
in the final HTML, like so:

> This provides an example of a Git tag annotation body that has been\
> "hard wrapped". This is a very common practice.

Most people would probably consider this an undesirable result, and would rather
that the above two lines be combined into a single line in the resulting HTML,
similar to how GitHub behaves when rendering `README.md` files.

To avoid this issue, line breaks that are not followed by another line break
(also known as "soft" line breaks) are transformed into spaces before they are
used in GitHub release bodies. Meaning the above tag annotation body would be
rendered like so:

[github's api]: https://docs.github.com/rest/markdown#render-a-markdown-document

> This provides an example of a Git tag annotation body that has been
> "hard wrapped". This is a very common practice.

### Automated release notes

This action supports GitHub's [automatically generated release notes] feature.
You can enable this feature via the [configuration file], or via [action
inputs]:

[automatically generated release notes]: https://docs.github.com/repositories/releasing-projects-on-github/automatically-generated-release-notes
[configuration file]: #the-configuration-file
[action inputs]: #action-inputs

```yaml
# In .github/github-release-from-tag.yml:
generateReleaseNotes: true
```

```yaml
# In your workflow:
- uses: ghalactic/github-release-from-tag@v6
  with:
    generateReleaseNotes: "true"
```

When enabled, automated release notes will be generated and appended to each
release body. The release notes are based off of **pull requests**, and can be
[configured to customize how they are generated].

[configured to customize how they are generated]: https://docs.github.com/repositories/releasing-projects-on-github/automatically-generated-release-notes#configuring-automatically-generated-release-notes

<details>
<summary><strong>Example automated release notes</strong></summary>
<br>

> ## What's Changed
>
> - Add feature A by [@ezzatron] in [#5](#)
> - Add feature B by [@ezzatron] in [#6](#)
> - Fix bug A by [@ezzatron] in [#7](#)
> - Fix bug B by [@ezzatron] in [#8](#)
> - Add docs for feature A by [@ezzatron] in [#9](#)
> - Add docs for feature B by [@ezzatron] in [#10](#)
>
> ## New Contributors
>
> - [@ezzatron] made their first contribution in [#5](#)
>
> **Full Changelog**: https://github.com/owner/repo/commits/1.0.0

[@ezzatron]: https://github.com/ezzatron

</details>

### Release assets

This action supports uploading **release assets** — files that are associated
with a release, and made available for download from GitHub. Release assets
**must exist before this action is run**, and can be specified via the
[configuration file], or via [action inputs]:

[configuration file]: #the-configuration-file

```yaml
# In .github/github-release-from-tag.yml:
assets:
  - path: path/to/asset-a
  - path: path/to/asset-b-*
```

```yaml
# In your workflow:
- uses: ghalactic/github-release-from-tag@v6
  with:
    # Note the "|" character - this example uses a YAML multiline string.
    assets: |
      - path: path/to/asset-d
```

> [!CAUTION]
> This action will **overwrite existing release assets** if their names match
> the assets configured for upload, or if their names match the
> [checksum assets]. Assets other than these will not be modified or removed.

[checksum assets]: #checksum-assets

> [!TIP]
> Unlike other [action inputs], which typically override their equivalent
> [configuration file] options, assets specified via action inputs are
> **merged** with those specified in the configuration file.

[action inputs]: #action-inputs
[configuration file]: #the-configuration-file

Each asset must have a `path` property, which is a file glob pattern supported
by [`@actions/glob`]. If no matching file is found when the action is run, **the
workflow step will fail** (unless the asset is [configured to be optional]).

[`@actions/glob`]: https://github.com/actions/toolkit/tree/main/packages/glob
[configured to be optional]: #optional-release-assets

If **multiple files** match the `path` glob pattern, each file will be uploaded
individually. **This action does not handle archiving multiple assets for you.**
If you want to upload a `.zip` (or similar) file composed of multiple files, you
must build the archive yourself prior to running this action.

If **a single file** matches the `path` glob pattern, you can additionally
specify a custom `name` and/or `label` for the asset:

```yaml
# In .github/github-release-from-tag.yml:
assets:
  - path: path/to/asset-a.yaml
    name: custom-name.yml
    label: Labels can have spaces
```

```yaml
# In your workflow (using YAML):
- uses: ghalactic/github-release-from-tag@v6
  with:
    # Note the "|" character - this example uses a YAML multiline string.
    assets: |
      - path: path/to/asset-a.yaml
        name: custom-name.yml
        label: Labels can have spaces
```

```yaml
# In your workflow (using JSON):
- uses: ghalactic/github-release-from-tag@v6
  with:
    # Note the "|" character - this example uses a YAML multiline string.
    assets: |
      [{
        "path": "path/to/asset-a.yaml",
        "name: "custom-name.yml",
        "label": "Labels can have spaces"
      }]
```

The `name` property overrides the file name that will be used when the file is
uploaded (and hence the filename seen by users who download the asset). The
`label` property is a text field that gets used by GitHub when viewing a
release's assets.

#### Optional release assets

Assets can be made "optional" — that is, they will simply be skipped if the
`path` file glob pattern does not match any files. You can enable this behavior
by setting the `optional` property to `true`:

```yaml
# In .github/github-release-from-tag.yml:
assets:
  - path: path/to/assets/*
    optional: true
```

```yaml
# In your workflow:
- uses: ghalactic/github-release-from-tag@v6
  with:
    # Note the "|" character - this example uses a YAML multiline string.
    assets: |
      - path: path/to/assets/*
        optional: true
```

#### Dynamic release assets

If you need to dynamically specify a list of assets to upload, you can use the
`assets` [action input] with generated JSON (or YAML). How you generate the
value for this input is up to you, but any value from a [context] (e.g.
[an output from another step]) can be used, for example:

[action input]: #action-inputs
[context]: https://docs.github.com/actions/learn-github-actions/contexts
[an output from another step]: https://docs.github.com/actions/learn-github-actions/contexts#steps-context

```yaml
# Executing a script that outputs JSON describing the assets to upload.
- id: listAssets
  run: echo "assets=$(bash list-assets.sh)" >> $GITHUB_OUTPUT

- uses: ghalactic/github-release-from-tag@v6
  with:
    assets: ${{ steps.listAssets.outputs.assets }}
```

#### Checksum assets

By default, this action generates **checksum assets**. When a release has
associated assets specified, two checksum assets will be generated for the
release:

- `checksums.sha256` — A plaintext checksum file in [`sha256sum`] format.
- `checksums.json` — A JSON file containing checksums for each asset.

[`sha256sum`]: https://dashdash.io/1/sha256sum

You can disable this feature via the [configuration file], or via [action
inputs]:

[configuration file]: #the-configuration-file
[action inputs]: #action-inputs

```yaml
# In .github/github-release-from-tag.yml:
checksum:
  generateAssets: false
```

```yaml
# In your workflow:
- uses: ghalactic/github-release-from-tag@v6
  with:
    checksumGenerateAssets: "false"
```

Checksums for each asset are always included in the `assets` [action output],
even when **checksum asset** generation is disabled.

[action output]: #action-outputs

<details>
<summary>Example <code>checksums.sha256</code></summary>

```
3878a1aff7b0769be29e355922a89de794078db863cdc931d01e687168f06443  file-a.txt
f97a35fc9ddddd6bbfe0244e7608ec342dba9ed18e7227db061997d32133edeb  file-b.zip
```

</details>

<details>
<summary>Example <code>checksums.json</code></summary>

```json
{
  "sha256": {
    "file-a.txt": "3878a1aff7b0769be29e355922a89de794078db863cdc931d01e687168f06443",
    "file-b.zip": "f97a35fc9ddddd6bbfe0244e7608ec342dba9ed18e7227db061997d32133edeb"
  }
}
```

</details>

### Release discussions

This action supports creating [GitHub Discussions] for releases. You can enable
this feature via the [configuration file], or via [action inputs]:

[github discussions]: https://docs.github.com/discussions
[configuration file]: #the-configuration-file
[action inputs]: #action-inputs

```yaml
# In .github/github-release-from-tag.yml:
discussion:
  category: Announcements
```

```yaml
# In your workflow:
- uses: ghalactic/github-release-from-tag@v6
  with:
    discussionCategory: Announcements
```

> [!IMPORTANT]
> Release discussion creation also requires you to grant **write** access to
> **discussions** to the [GitHub token] used to manage releases:

[GitHub token]: #github-token

```yaml
# In your workflow:
permissions:
  contents: write
  discussions: write # required for release discussion creation
```

When enabled, discussions will automatically be created and linked to each
published release. The discussion **title** and **body** will match the release
**name** and **body**. The specified discussion category **must already exist**
in the repo.

### Reactions

In order to promote engagement with your releases, this action can create
**reactions** like 👍, 😄, 🎉, ❤️, 🚀, and 👀.

A typical user is more likely to add their own reaction if they can simply click
on an existing one — rather than be the first one to add a particular reaction,
which takes more effort. You can enable this feature via the [configuration
file], or via [action inputs]:

[configuration file]: #the-configuration-file
[action inputs]: #action-inputs

```yaml
# In .github/github-release-from-tag.yml:
reactions: ["+1", laugh, hooray, heart, rocket, eyes]
```

```yaml
# In your workflow:
- uses: ghalactic/github-release-from-tag@v6
  with:
    reactions: +1,laugh,hooray,heart,rocket,eyes
```

If you've enabled [release discussion creation], reactions can also be created
for release discussions (which support a couple of additional reactions like 👎
and 😕):

```yaml
# In .github/github-release-from-tag.yml:
discussion:
  category: Announcements
  reactions: ["+1", "-1", laugh, hooray, confused, heart, rocket, eyes]
```

```yaml
# In your workflow:
- uses: ghalactic/github-release-from-tag@v6
  with:
    discussionCategory: Announcements
    discussionReactions: +1,-1,laugh,hooray,confused,heart,rocket,eyes
```

[release discussion creation]: #release-discussions

### Job summaries

When a release is created or updated, a summary containing useful information
and links will be displayed on the Actions run summary page:

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="/assets/images/release-summary-dark.svg">
  <img alt="Example release job summary" src="/assets/images/release-summary-light.svg#gh-light-mode-only">
</picture>

You can disable this feature via the [configuration file], or via
[action inputs]:

[configuration file]: #the-configuration-file
[action inputs]: #action-inputs

```yaml
# In .github/github-release-from-tag.yml:
summary:
  enabled: false
```

```yaml
# In your workflow:
- uses: ghalactic/github-release-from-tag@v6
  with:
    summaryEnabled: "false"
```

## Configuration

> [!TIP]
> Try to use as _little_ configuration as possible. Everything here is
> **optional**, and **the less configuration the better**.

### The configuration file

This action supports an **optional** YAML configuration file, with options for
affecting how releases are published:

> [!TIP]
> These options can also be specified by [action inputs]. A
> [JSON Schema definition] is also available.

[action inputs]: #action-inputs
[json schema definition]: https://ghalactic.github.io/github-release-from-tag/schema/config.v6.schema.json

```yaml
# .github/github-release-from-tag.yml

# Get completion and validation when using the YAML extension for VS Code.
# yaml-language-server: $schema=https://ghalactic.github.io/github-release-from-tag/schema/config.v6.schema.json

# Set to true to produce releases in a draft state.
draft: true

# Set to true to append automatically generated release notes to release bodies.
generateReleaseNotes: true

# Set to true or false to override the automatic tag name based pre-release
# detection.
prerelease: false

# Reactions to create for releases.
reactions: ["+1", laugh, hooray, heart, rocket, eyes]

assets:
  # A path is required for each asset.
  - path: assets/text/file-a.txt

  # The "optional" flag, name, and label are optional.
  - path: assets/json/file-b.json
    optional: true
    name: custom-name-b.json
    label: Label for file-b.json

checksum:
  # Set to false to disable generation of checksum assets for releases.
  generateAssets: false

discussion:
  # The category to use when creating the discussion.
  category: category-a

  # Reactions to create for discussions linked to releases.
  reactions: ["+1", "-1", laugh, hooray, confused, heart, rocket, eyes]

summary:
  # Set to false to disable GitHub Actions job summary creation.
  enabled: false
```

### Action inputs

This action supports **optional** inputs for affecting how releases are
published:

> [!IMPORTANT]
> With the exception of `assets`, these inputs take precedence over any
> equivalent options specified in [the configuration file]. The
> [action metadata file] contains the actual definitions for these inputs.

[the configuration file]: #the-configuration-file
[action metadata file]: action.yml

```yaml
- uses: ghalactic/github-release-from-tag@v6
  with:
    # Set to "true" to produce releases in a draft state.
    draft: "true"

    # Set to "true" to append automatically generated release notes to the
    # release body.
    generateReleaseNotes: "true"

    # Set to "true" or "false" to override the automatic tag name based
    # pre-release detection.
    prerelease: "false"

    # Reactions to create for releases.
    reactions: +1,laugh,hooray,heart,rocket,eyes

    # Assets to be associated with releases, specified as YAML (or JSON), and
    # merged with assets specified elsewhere. If you need a dynamic list, this
    # input can be useful. See the section titled "Dynamic release assets".
    assets: |
      - path: assets/text/file-a.txt

      - path: assets/json/file-b.json
        optional: true
        name: custom-name-b.json
        label: Label for file-b.json

    # Set to "false" to disable generation of checksum assets for the release.
    generateChecksumAssets: "false"

    # Use a custom GitHub token.
    token: ${{ secrets.CUSTOM_GITHUB_TOKEN }}

    # The category to use when creating the discussion.
    discussionCategory: category-a

    # Reactions to create for discussions linked to releases.
    discussionReactions: +1,-1,laugh,hooray,confused,heart,rocket,eyes

    # Set to "false" to disable GitHub Actions job summary creation.
    summaryEnabled: "false"
```

## Action outputs

This action makes a number of outputs available:

> [!TIP]
> The [action metadata file] contains the actual definitions for these outputs.
> The example below should give you some idea what each output looks like. The
> outputs aren't actually YAML of course, it's just for explanatory purposes.

[action metadata file]: action.yml

```yaml
# The ID of the published release.
releaseId: "68429422"

# The URL of the published release.
releaseUrl: https://github.com/owner/repo/releases/tag/1.0.0

# The asset upload URL for the published release (as an RFC 6570 URI Template).
releaseUploadUrl: https://uploads.github.com/repos/owner/repo/releases/68429422/assets{?name,label}

# Contains "true" if a new release was created.
releaseWasCreated: "true"

# The name of the published release.
releaseName: 1.0.0 Leopard Venom 🐆

# The body of the published release.
releaseBody: |
  This is the first _stable_ release 🎉

  ## What's Changed ...

# The avatar URL of the GitHub user who created the tag.
taggerAvatarUrl: https://avatars.githubusercontent.com/u/100152?u=2d625417e12ad2b9cf55a3897e9a36b1bc145133&v=4

# The username of the GitHub user who created the tag.
taggerLogin: ezzatron

# The name of the tag that caused the release.
tagName: 1.0.0

# Contains "true" for any tag considered "stable".
tagIsStable: "true"

# Contains "true" for SemVer version tags.
tagIsSemVer: "true"

# The "subject" portion of the tag annotation.
tagSubject: |
  1.0.0
  Leopard Venom 🐆

# The "body" portion of the tag annotation.
tagBody: |
  This is the first
  _stable_
  release 🎉

# The "body" portion of the tag annotation, rendered as Markdown. This
# represents the Markdown after it has been "processed", and may differ greatly
# from the original input Markdown.
tagBodyRendered: This is the first _stable_ release 🎉

# The generated release notes produced by GitHub. See "Automated release notes".
generatedReleaseNotes: "## What's Changed ..."

# The ID of the release discussion.
discussionId: D_kwDOG4Ywls4APsqF

# The unique number of the release discussion.
discussionNumber: "93"

# The URL of the release discussion.
discussionUrl: https://github.com/owner/repo/discussions/93

# A JSON array of objects describing the release assets.
assets: |
  [
    {
      "apiUrl": "https://api.github.com/repos/owner/repo/releases/assets/67328106",
      "downloadUrl": "https://github.com/owner/repo/releases/download/1.0.0/file.txt",
      "id": 67328106,
      "nodeId": "RA_kwDOG4Ywls4EA1hq",
      "name": "file.txt",
      "label": "Label for file.txt",
      "state": "uploaded",
      "contentType": "application/json",
      "size": 16,
      "downloadCount": 0,
      "createdAt": "2022-06-02T09:37:56Z",
      "updatedAt": "2022-06-02T09:37:56Z",
      "checksum": {
        "sha256": "2fef44d096530d162c859b5b4ec0895c308845cad1eebd7ef582c5ebd2dd787d"
      }
    },
    ...
  ]
```

### Using action outputs

Action outputs can be used to integrate with other steps in a workflow. Simply
add an `id` to the step that uses this action, and reference the output you
need as demonstrated below:

```yaml
- uses: ghalactic/github-release-from-tag@v6
  id: publishRelease
- env:
    RELEASE_URL: ${{ steps.publishRelease.outputs.releaseUrl }}
  run: echo Released to $RELEASE_URL
```

The `assets` output is a JSON array, and needs to be decoded before its contents
can be accessed:

> [!TIP]
> The assets are ordered by their `name` property.

```yaml
- uses: ghalactic/github-release-from-tag@v6
  id: publishRelease
- env:
    DOWNLOAD_URL: ${{ fromJSON(steps.publishRelease.outputs.assets)[0].downloadUrl }}
  run: echo Download the first asset from $DOWNLOAD_URL
```

## GitHub Enterprise Server support

This action works with [GitHub Enterprise Server (GHES)]. Depending on how your
enterprise is configured, you may have to work with an administrator to either:

- [Use GitHub Connect to allow access to the action]; or
- [Manually sync the action to your enterprise].

[github enterprise server (ghes)]: https://docs.github.com/enterprise-server/admin/overview/about-github-enterprise-server
[use github connect to allow access to the action]: https://docs.github.com/enterprise-server/admin/github-actions/managing-access-to-actions-from-githubcom/enabling-automatic-access-to-githubcom-actions-using-github-connect
[manually sync the action to your enterprise]: https://docs.github.com/enterprise-server/admin/github-actions/managing-access-to-actions-from-githubcom/manually-syncing-actions-from-githubcom

### GitHub Enterprise Server version feature support

Feature support on GitHub Enterprise Server often lags behind other versions of
GitHub. This action may not work correctly if you try to use features on an
enterprise that does not have support for those features.

Here are some key features that can be used by this action, and which version of
GitHub Enterprise Server introduced support:

| Feature                                                     | 3.1 | 3.2 | 3.3 | 3.4 | 3.5 | 3.6 |
| :---------------------------------------------------------- | :-- | :-- | :-- | :-- | :-- | :-- |
| [Release reactions][ghes-3-2-release-reactions]             | ❌  | ✅  | ✅  | ✅  | ✅  | ✅  |
| [Generated release notes][ghes-3-4-generated-release-notes] | ❌  | ❌  | ❌  | ✅  | ✅  | ✅  |
| [Discussions][ghes-3-6-discussions]                         | ❌  | ❌  | ❌  | ❌  | ❌  | ✅  |
| [Job summaries][ghes-3-6-job-summaries]                     | ❌  | ❌  | ❌  | ❌  | ❌  | ✅  |

[ghes-3-2-release-reactions]: https://docs.github.com/enterprise-server@3.2/rest/reactions#create-reaction-for-a-release
[ghes-3-4-generated-release-notes]: https://docs.github.com/enterprise-server@3.4/admin/release-notes#releases-changes
[ghes-3-6-discussions]: https://docs.github.com/enterprise-server@3.6/admin/release-notes#community-experience
[ghes-3-6-job-summaries]: https://docs.github.com/enterprise-server@3.6/admin/release-notes#github-actions

## FAQ

### What format should I use for my release body?

I recommend following [Keep a Changelog]. When it's time to release, just grab
the content from the **Unreleased** section and paste it into your tag
annotation message.

[keep a changelog]: https://keepachangelog.com/

### Does this action work with [Semantic Release] / [Release Please]?

[semantic release]: https://semantic-release.gitbook.io/
[release please]: https://github.com/googleapis/release-please

Technically yes, but it's not recommended. These tools have their own solutions
for publishing GitHub releases which are better suited.
