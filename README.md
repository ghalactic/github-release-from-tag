# GitHub Release from Tag

A [GitHub Action] that creates [GitHub Releases] from your Git tags. Does what
you _probably wish_ GitHub would just do without the need to use GitHub Actions.

[github action]: https://docs.github.com/actions
[github releases]: https://docs.github.com/repositories/releasing-projects-on-github/about-releases

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

- Minimal [configuration], or often **zero** configuration
- [SemVer] stability determines **pre-release** status
- [Markdown] support in tag annotation messages
- [Asset] uploading with support for **labels**
- [Automated release notes] support
- [Release discussion] creation
- Releases can be created as **drafts**
- Creation of initial **🚀 reactions ❤️** to promote engagement

[configuration]: #configuration
[semver]: https://semver.org/
[markdown]: https://docs.github.com/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github
[asset]: https://docs.github.com/repositories/releasing-projects-on-github/managing-releases-in-a-repository#:~:text=drag%20and%20drop
[automated release notes]: https://docs.github.com/repositories/releasing-projects-on-github/automatically-generated-release-notes
[release discussion]: https://docs.github.com/discussions

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
    runs-on: ubuntu-latest
    name: Publish release
    steps:
      - name: Checkout
        uses: actions/checkout@v3
      - name: Publish release
        uses: eloquent/github-release-action@v2
```

It's also possible to use [`if` conditionals] to restrict the release publishing
step inside a multi-purpose workflow, so that it only runs on tag pushes:

[`if` conditionals]: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsif

```yaml
- name: Publish release
  uses: eloquent/github-release-action@v2
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
    runs-on: ubuntu-latest
    name: Publish release
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          ref: refs/tags/${{ github.event.inputs.tag }}
      - name: Publish release
        uses: eloquent/github-release-action@v2
```

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
release to be published as either a **pre-release** or **stable release**.

[configure]: #configuration

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

## Configuration

_TODO_
