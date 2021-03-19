#!/usr/bin/env bash

TAG_PATTERN="^refs/tags/(.*)$"
SEMVER_PATTERN="^v?((0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(\\-([0-9A-Za-z-]+(\\.[0-9A-Za-z-]+)*))?(\\+([0-9A-Za-z-]+(\\.[0-9A-Za-z-]+)*))?)$"

echo "GITHUB_REF is $GITHUB_REF"

if [[ "$GITHUB_REF" =~ $TAG_PATTERN ]]; then
  TAG=${BASH_REMATCH[1]}
else
  echo Cannot create a release from a non-tag >/dev/stderr
  exit 1
fi

echo "TAG is $TAG"

if [[ "$(git describe "$TAG")" != "$TAG" ]]; then
  echo Cannot create a release from a lightweight tag >/dev/stderr
  exit 1
fi

if [[ "$TAG" =~ $SEMVER_PATTERN ]]; then
  SEMVER_MAJOR=${BASH_REMATCH[2]}
  SEMVER_PRERELEASE=${BASH_REMATCH[6]}

  if [[ $SEMVER_MAJOR > 0 && -z $SEMVER_PRERELEASE ]]; then
    IS_STABLE="true"
  fi
fi

MESSAGE="$(git tag -ln --format "%(contents)" "$TAG")"

if [[ -n "$IS_STABLE" ]]; then
  hub release create --message "$MESSAGE" "$TAG"
else
  hub release create --prerelease --message "$MESSAGE" "$TAG"
fi
