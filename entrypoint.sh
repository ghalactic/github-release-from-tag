#!/usr/bin/env bash

set -e

TAG_PATTERN="^refs/tags/(.*)$"
SEMVER_PATTERN="^v?((0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(\\-([0-9A-Za-z-]+(\\.[0-9A-Za-z-]+)*))?(\\+([0-9A-Za-z-]+(\\.[0-9A-Za-z-]+)*))?)$"

function die {
  echo -e "\033[0;31m$1\033[0m" >/dev/stderr
  exit 1
}

if [[ "$GITHUB_REF" =~ $TAG_PATTERN ]]; then
  TAG=${BASH_REMATCH[1]}
else
  die Cannot create a release from a non-tag
fi

# fetch the annotated tag, GHA creates a fake lightweight tag
git fetch origin --force "$GITHUB_REF:$GITHUB_REF" >/dev/null 2>&1

if [[ "$(git describe --match "$(echo "$TAG" | sed 's/./\\&/g')" "$TAG")" != "$TAG" ]]; then
  die Cannot create a release from a lightweight tag
fi

if [[ "$TAG" =~ $SEMVER_PATTERN ]]; then
  SEMVER_MAJOR=${BASH_REMATCH[2]}
  SEMVER_PRERELEASE=${BASH_REMATCH[6]}

  if [[ $SEMVER_MAJOR > 0 && -z $SEMVER_PRERELEASE ]]; then
    IS_STABLE="true"
  fi
fi

MESSAGE="$(git tag -ln --format "%(contents)" "$TAG" | sed "/-----BEGIN PGP SIGNATURE-----/,/-----END PGP SIGNATURE-----\n/d")"

if hub release show "$TAG" >/dev/null 2>&1; then
  COMMAND=edit
  ACTION=Editing
else
  COMMAND=create
  ACTION=Creating
fi

if [[ -n "$DEBUG" ]]; then
  printenv
fi

if [[ -n "$IS_STABLE" ]]; then
  echo "$ACTION stable release for tag $TAG"

  if OUTPUT="$(hub release "$COMMAND" --message "$MESSAGE" "$TAG" 2>&1)"; then
    echo "Published $(hub release show --format '%U' "$TAG")"
  else
    die "Unable to publish: $OUTPUT"
  fi
else
  echo "$ACTION pre-release for tag $TAG"

  if OUTPUT="$(hub release "$COMMAND" --prerelease --message "$MESSAGE" "$TAG" 2>&1)"; then
    echo "Published $(hub release show --format '%U' "$TAG")"
  else
    die "Unable to publish: $OUTPUT"
  fi
fi
