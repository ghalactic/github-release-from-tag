# GitHub Release from Tag

A [GitHub Action] that creates [GitHub Releases] from your Git tags. Does what
you _probably want_ GitHub to do without the need for GitHub Actions.

[github action]: https://docs.github.com/actions
[github releases]: https://docs.github.com/repositories/releasing-projects-on-github/about-releases

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="/assets/images/release-summary-dark.svg">
  <img alt="Example release job summary" src="/assets/images/release-summary-light.svg#gh-light-mode-only">
</picture>

## Overview

This action creates releases from your Git tags — the best place to keep release
data. It uses [SemVer] for pre-release status and [Markdown] for format. Your
GitHub Releases become a natural part of your Git tags.

[semver]: https://semver.org/
[markdown]: https://docs.github.com/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github

Also, this action aims to feel like a first-party GitHub feature. Its features
closely mirror what you get when you [publish a GitHub Release manually].

[publish a github release manually]: https://docs.github.com/repositories/releasing-projects-on-github/managing-releases-in-a-repository#creating-a-release

## Features

- [Minimal config, or often **zero** config](#configuration)
- [SemVer stability determines **pre-release** status](#release-stability)
- [**Latest release** management](#latest-release-management)
- [**Markdown** support in tag annotation messages](#release-name-and-body)
- [Asset uploading with support for **labels** and **checksums**](#release-assets)
- [Automated **release notes** support](#automated-release-notes)
- [Release **discussion** creation](#release-discussions)
- [Create releases as **drafts**](#draft-releases)
- [Creation of initial **🚀 reactions ❤️** to promote engagement](#reactions)
- [Creation of **job summaries** for the Actions run summary page](#job-summaries)
- [Works with GitHub Enterprise Server (GHES)](#github-enterprise-server-support)

## Usage

### Workflow for tag creation

Most of the time, you want tag pushes to trigger release publishing:

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
    concurrency: publish-release
    permissions:
      contents: write
      discussions: write # (for release discussion creation)
    steps:
      - name: Checkout
        uses: actions/checkout@v6
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

You may also want to manually publish releases for a specific tag, to remedy
failed publish attempts or publish tags that you created before setting
up automated release publishing:

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
    concurrency: publish-release
    permissions:
      contents: write
      discussions: write # (for release discussion creation)
    steps:
      - name: Checkout
        uses: actions/checkout@v6
        with:
          ref: refs/tags/${{ inputs.tag }}
      - name: Publish release
        uses: ghalactic/github-release-from-tag@v6
```

### GitHub token

By default, this action uses [automatic token authentication] to get the token
for managing releases. To use a different token, pass one via [action inputs]:

[automatic token authentication]: https://docs.github.com/actions/security-guides/automatic-token-authentication
[action inputs]: #action-inputs

```yaml
# In your workflow:
- uses: ghalactic/github-release-from-tag@v6
  with:
    token: ${{ secrets.CUSTOM_GITHUB_TOKEN }}
```

The token needs these permissions:

- **Write** access to **repository contents**, to create releases.
- **Write** access to **discussions**, to create [release discussions].

[release discussions]: #release-discussions

To learn how to grant these permissions, see [Modifying the permissions for the
`GITHUB_TOKEN`].

[modifying the permissions for the `github_token`]: https://docs.github.com/actions/security-guides/automatic-token-authentication#modifying-the-permissions-for-the-github_token

> [!NOTE]

<!-- vale Ghalactic.Passive = NO -->

> In February 2023, the default token permissions for new repos
> [changed to be read-only]. If your repo predates the change, the default
> token has write access pre-configured.

<!-- vale Ghalactic.Passive = YES -->

[changed to be read-only]: https://github.blog/changelog/2023-02-02-github-actions-updating-the-default-github_token-permissions-to-read-only/

### Release stability

This action uses [SemVer] rules to check whether a tag gets a **pre-release** or
a **stable release**:

- If the tag name is a **"stable"** SemVer version, it's considered a **stable
  release**.
- If the tag name is an **"unstable"** SemVer version, it's considered a
  **pre-release**.
- If the tag name is **not** a valid SemVer version, it's considered a
  **pre-release**.

[semver]: https://semver.org/

This action eases the SemVer rules a bit to allow tag names with a `v` prefix
(for example `v1.2.3`), as well as major/minor version tag names (for example
`v1`, `v1.2`) per [GitHub's tips for action versioning].

[github's tips for action versioning]: https://github.com/actions/toolkit/blob/%40actions/core%401.1.0/docs/action-versioning.md#recommendations

You can also [configure] an override for this. Force a release to publish as
either a **pre-release** or **stable release** via the [configuration file] or
[action inputs]:

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

### Latest release management

You can set published releases as the [latest release] for the repo. Several
[configurable][configure] strategies help you choose whether to mark a release
as the latest.

[latest release]: https://docs.github.com/repositories/releasing-projects-on-github/about-releases#linking-to-the-latest-release
[configured]: #configuration

> [!TIP]
> You can't set drafts and pre-releases as the latest release for a repo. No
> matter the strategy, this action doesn't try to set a draft or pre-release as
> the latest.

#### Set newly created releases as latest

Under the default strategy, any newly created, non-draft, stable release becomes
the latest release. Updated releases don't have their latest status changed.
The behavior matches GitHub's default.

This is the **default strategy**, but you can turn it on via the [configuration
file] or [action inputs]:

[configuration file]: #the-configuration-file
[action inputs]: #action-inputs

```yaml
# In .github/github-release-from-tag.yml:
makeLatest: if-new
```

```yaml
# In your workflow:
- uses: ghalactic/github-release-from-tag@v6
  with:
    makeLatest: if-new
```

#### SemVer-based latest releases

The SemVer strategy sets the release as the latest when it makes sense based on
the [SemVer] spec. In other words:

[semver]: https://semver.org/

- If the release tag is _not_ a valid SemVer version, the action **never** sets
  it as the latest.
- If the release tag _is_ a valid SemVer version but the current latest tag is
  _not_, the action **always** sets the release as the latest.
- If both tags are valid SemVer versions, the action sets the release as the
  latest if:
  - The release tag is _stable_, and the current latest tag is _unstable_; OR
  - The release tag has the _same_ stability as the current latest tag, but
    higher [SemVer precedence].

[semver precedence]: https://semver.org/#spec-item-11

You can enable this strategy via the [configuration file], or via [action
inputs]:

[configuration file]: #the-configuration-file
[action inputs]: #action-inputs

```yaml
# In .github/github-release-from-tag.yml:
makeLatest: semver
```

```yaml
# In your workflow:
- uses: ghalactic/github-release-from-tag@v6
  with:
    makeLatest: semver
```

> [!CAUTION]
> Using this strategy can cause race conditions if multiple release workflows
> run at the same time. Set a [concurrency group] on your release publishing
> workflows or jobs to avoid this.

[concurrency group]: https://docs.github.com/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency

#### Legacy GitHub latest release management

This strategy uses GitHub's legacy behavior for finding the latest release. In
GitHub's own words:

<!-- vale Ghalactic.Passive = NO -->

> "...specifies that the latest release should be determined based on the
> release creation date and higher semantic version"
>
> (From the [Create a release] REST API endpoint documentation)

<!-- vale Ghalactic.Passive = YES -->

[create a release]: https://docs.github.com/en/rest/releases/releases?apiVersion=2022-11-28#create-a-release

You can enable this strategy via the [configuration file], or via [action
inputs]:

[configuration file]: #the-configuration-file
[action inputs]: #action-inputs

```yaml
# In .github/github-release-from-tag.yml:
makeLatest: legacy
```

```yaml
# In your workflow:
- uses: ghalactic/github-release-from-tag@v6
  with:
    makeLatest: legacy
```

#### Explicit setting latest releases

You can [configure] whether to set the release as the latest release via the
[configuration file] or [action inputs]:

[configure]: #configuration
[configuration file]: #the-configuration-file
[action inputs]: #action-inputs

```yaml
# In .github/github-release-from-tag.yml:
makeLatest: always # or never
```

```yaml
# In your workflow:
- uses: ghalactic/github-release-from-tag@v6
  with:
    makeLatest: always # or never
```

> [!CAUTION]
> Specifying `makeLatest: always` causes even **updated** releases to become
> the latest release. It can help in advanced use cases with a dynamic
> [action input], but is usually not what you want.

[action input]: #action-inputs

### Draft releases

You can [configure] this action to create draft releases. You can then publish
them by hand later via GitHub. Turn on this feature via the [configuration
file] or [action inputs]:

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

This action makes a release **name** and **body** from your **tag message**.
Git already splits your tag messages into two parts that line up with each part
of a GitHub release:

- The tag **subject** becomes the release **name**.
- The tag **body** renders as [Markdown], and becomes the release **body**.

[markdown]: https://docs.github.com/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github

The tag "subject" is the first **paragraph** of the message. The "body" is all
that follows:

    This is part of the subject.
    This is also considered part of the subject.

    This is the beginning of the body.
    This is also part of the body.

    The body can have multiple paragraphs.

#### Markdown support

For the most part, [Markdown] works how you expect. You can write Markdown in
the "body" portion of your tag messages, and it renders in the body of the
releases that this action publishes.

[markdown]: https://docs.github.com/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github

##### Markdown headings in tag annotation messages

When writing tag messages, you might find that Markdown **headings** start with
a `#` character, which Git reads as a **comment**. Work around this with the
following Git command:

    git tag --annotate --cleanup=whitespace --edit --message "" 1.0.0

You might want to add a **Git alias** to make the command easier to remember:

    git config --global alias.tag-md 'tag --annotate --cleanup=whitespace --edit --message ""'

After configuring the alias, you can then use `git tag-md` to create tags
with Markdown tag bodies:

    git tag-md 1.0.0

##### Markdown heading anchors

GitHub doesn't make [section links] for Markdown headings in release bodies,
like it does for other Markdown content. You normally can't link
to a heading in a release body, or include links to headings in your
release body markdown.

[section links]: https://docs.github.com/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#section-links

This action fixes this by making **heading anchors** for each heading in the
release body. These anchors work like the ones that GitHub makes for most
Markdown content, and let you link to headings in your release body.

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

Once you publish the release, you can also link directly to the heading in
the release body from external sources by adding the anchor to the end of the
release URL, like so:

https://github.com/ghalactic/github-release-from-tag/releases/v5.3.0#markdown-heading-anchors

##### Markdown line breaks

It's common for tag messages to be "wrapped" at a fixed column width, for
reading ease as plain text:

    1.0.0

    This provides an example of a Git tag annotation body that has been
    "hard wrapped". This is a very common practice.

Copying the body from the earlier tag message into the GitHub release means
GitHub reads the line breaks as hard line breaks in the HTML, like so:

> This provides an example of a Git tag annotation body that has been\
> "hard wrapped". This is a very common practice.

Most people find this bad, and prefer that the two lines merge into one line in
the output HTML. GitHub behaves this way when it renders `README.md` files.

To avoid this, line breaks not next to another line break (also known as "soft"
line breaks) turn into spaces before they're used in release bodies. The earlier
tag body then renders like so:

[github's api]: https://docs.github.com/rest/markdown#render-a-markdown-document

> This provides an example of a Git tag annotation body that has been
> "hard wrapped". This is a very common practice.

### Automated release notes

This action supports GitHub's [automatically generated release notes] feature.
Enable it via the [configuration file], or via [action inputs]:

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

When enabled, the action makes release notes and appends them to each release
body. The notes draw from **pull requests**, and you can [configure how they're
generated].

[configure how they're generated]: https://docs.github.com/repositories/releasing-projects-on-github/automatically-generated-release-notes#configuring-automatically-generated-release-notes

<details>
<summary><strong>Example automated release notes</strong></summary>
<br>

<!-- vale Ghalactic.HeadingSentenceCase = NO -->

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

<!-- vale Ghalactic.HeadingSentenceCase = YES -->

[@ezzatron]: https://github.com/ezzatron

</details>

### Release assets

This action supports uploading **release assets** — files linked to a release
and ready to download from GitHub. Release assets **must exist before running
the action**, and you can list them via the [configuration file] or via [action
inputs]:

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
> This action **overwrites existing release assets** if their names match
> the assets configured for upload, or if their names match the
> [checksum assets]. The action won't modify or remove other assets.

[checksum assets]: #checksum-assets

> [!TIP]
> Unlike other [action inputs], which tend to override their matching
> [configuration file] options, assets from action inputs **merge** with those
> in the config file.

[action inputs]: #action-inputs
[configuration file]: #the-configuration-file

Each asset must have a `path` — a file glob that [`@actions/glob`] supports. If
no match exists when the action runs, **the step fails** (unless the asset is
[configured to be optional]).

[`@actions/glob`]: https://github.com/actions/toolkit/tree/main/packages/glob
[configured to be optional]: #optional-release-assets

If **multiple files** match the `path` glob, the action uploads each file on its
own. **The action doesn't archive multiple assets for you.** If you want to
upload a `.zip` (or similar) file made of multiple files, build the archive
yourself first.

If **a single file** matches the `path` glob, you can also set a custom `name`
and/or `label` for the asset:

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

The `name` property sets the file name used when the action uploads the file.
The `label` property is a text field that GitHub shows when viewing a release's
assets.

#### Optional release assets

You can make assets "optional" — the action skips them if the `path` glob
doesn't match any files. Set `optional` to `true` to turn this on:

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

If you need to set a list of assets to upload at runtime, use the `assets`
[action input] with JSON (or YAML). How you make the value for this input is up
to you, but any value from a [context] (for example [an output from another
step]) works:

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

By default, this action makes **checksum assets**. When a release has linked
assets, the action makes two checksum assets for the release:

- `checksums.sha256` — A plaintext checksum file in [`sha256sum`] format.
- `checksums.json` — A JSON file with checksums for each asset.

[`sha256sum`]: https://dashdash.io/1/sha256sum

You can disable this feature via the [configuration file] or [action inputs]:

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

The `assets` [action output] always has checksums for each asset, even when you
disable **checksum asset** creation.

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

This action supports creating [GitHub Discussions] for releases. Enable this
feature via the [configuration file], or via [action inputs]:

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
> Release discussion creation also needs you to grant **write** access to
> **discussions** to the [GitHub token] used to manage releases:

[GitHub token]: #github-token

```yaml
# In your workflow:
permissions:
  contents: write
  discussions: write # required for release discussion creation
```

When enabled, the action creates discussions and links them to each published
release. The discussion **title** and **body** match the release **name** and
**body**. The named discussion category **must already exist** in the repo.

### Reactions

To promote engagement with your releases, this action can create **reactions**
like 👍, 😄, 🎉, ❤️, 🚀, and 👀.

A typical user is more likely to add their own reaction if they can click on an
existing one — rather than be the first to add one, which takes more effort. You
can enable this feature via the [configuration file], or via [action inputs]:

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

If you've enabled [release discussion creation], you can also create reactions
for release discussions (which support a couple more reactions like 👎 and 😕):

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

When the action creates or updates a release, a summary with useful links
appears on the Actions run summary page:

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
> Try to use as _little_ config as possible. Everything here is **optional**,
> and **the less config the better**.

### The configuration file

This action supports an **optional** YAML config file, with options for how you
publish releases:

> [!TIP]
> You can also specify these options by [action inputs]. A
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

# Strategy for setting the published release as the repo's latest release.
makeLatest: semver

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

This action supports **optional** inputs for how you publish releases:

> [!IMPORTANT]
> With the exception of `assets`, these inputs take precedence over any
> matching options in [the configuration file]. The [action metadata file]
> has the actual definitions for these inputs.

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

    # Strategy for setting the published release as the repo's latest release.
    makeLatest: semver

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
> The following example should give you some idea what each output looks like.
> The outputs aren't actually YAML of course, it's for explanatory purposes.

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

# Contains "true" if the release is the latest release after publishing.
releaseIsLatest: "true"

# The ID of the latest release.
latestReleaseId: "68429422"

# The URL of the latest release.
latestReleaseUrl: https://github.com/owner/repo/releases/tag/1.0.0

# The name of the latest release.
latestReleaseName: 1.0.0 Leopard Venom 🐆

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

### Use action outputs

Action outputs let you link with other steps in a workflow. Add an `id` to the
step that uses this action, and use the output you need as shown in the
following example:

```yaml
- uses: ghalactic/github-release-from-tag@v6
  id: publishRelease
- env:
    RELEASE_URL: ${{ steps.publishRelease.outputs.releaseUrl }}
  run: echo Released to $RELEASE_URL
```

The `assets` output is a JSON array. You need to decode it before you can access
its contents:

> [!TIP]
> The assets sort by their `name` property.

```yaml
- uses: ghalactic/github-release-from-tag@v6
  id: publishRelease
- env:
    DOWNLOAD_URL: ${{ fromJSON(steps.publishRelease.outputs.assets)[0].downloadUrl }}
  run: echo Download the first asset from $DOWNLOAD_URL
```

## GitHub Enterprise Server support

This action works with [GitHub Enterprise Server (GHES)]. Based on your setup,
you may have to work with an admin to either:

- [Use GitHub Connect to allow access to the action]; or
- [Manually sync the action to your enterprise].

[github enterprise server (ghes)]: https://docs.github.com/enterprise-server/admin/overview/about-github-enterprise-server
[use github connect to allow access to the action]: https://docs.github.com/enterprise-server/admin/github-actions/managing-access-to-actions-from-githubcom/enabling-automatic-access-to-githubcom-actions-using-github-connect
[manually sync the action to your enterprise]: https://docs.github.com/enterprise-server/admin/github-actions/managing-access-to-actions-from-githubcom/manually-syncing-actions-from-githubcom

### GitHub Enterprise Server version feature support

Feature support on GHES often lags behind other GitHub versions. The action may
not work right if you use features your instance doesn't support.

The following table shows key features the action uses, and which GHES version
added support:

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

<!-- vale Ghalactic.HeadingEndPunctuation = NO -->

### What format should I use for my release body?

<!-- vale Ghalactic.HeadingEndPunctuation = YES -->

I recommend following [Keep a Changelog]. When it's time to release, grab
the content from the **Unreleased** section and paste it into your tag
annotation message.

[keep a changelog]: https://keepachangelog.com/

<!-- vale Ghalactic.HeadingEndPunctuation = NO -->
<!-- vale Ghalactic.Please = NO -->

### Does this action work with [Semantic Release] / [Release Please]?

<!-- vale Ghalactic.HeadingEndPunctuation = YES -->
<!-- vale Ghalactic.Please = YES -->

[semantic release]: https://semantic-release.gitbook.io/
[release please]: https://github.com/googleapis/release-please

Technically yes, but it's not recommended. These tools have their own,
better-suited solutions for publishing GitHub releases.
