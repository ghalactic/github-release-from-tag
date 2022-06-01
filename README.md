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

In addition, this action has also been designed to feel like a natural extension
of GitHub's own features. As such, its feature set closely mirrors what you have
access to when you [publish a GitHub Release manually], including [automated
release notes], [release assets], and [release discussions].

[publish a github release manually]: https://docs.github.com/repositories/releasing-projects-on-github/managing-releases-in-a-repository#creating-a-release
[automated release notes]: https://docs.github.com/repositories/releasing-projects-on-github/automatically-generated-release-notes
[release assets]: https://docs.github.com/repositories/releasing-projects-on-github/managing-releases-in-a-repository#:~:text=drag%20and%20drop
[release discussions]: https://docs.github.com/discussions

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

## Configuration

_TODO_
