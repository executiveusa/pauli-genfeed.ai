#!/usr/bin/env sh

set -eu

# Hosted SaaS runs `setup-bun-env` (bun install) and then `vercel build`,
# which invokes this script again as the Vercel installCommand. Skip the
# second install when the workspace is already populated.
if [ "${1:-}" = "install" ] && [ -d node_modules ] && [ -f bun.lock ]; then
  echo "vercel-bun: node_modules present, skipping bun install"
  exit 0
fi

# Use the same rolling-stable policy as local setup and CI.
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
BUN_VERSION=$(xargs < "$SCRIPT_DIR/../../.bun-version")
# Prefer a real bun on PATH only when it exactly matches the pinned version;
# bunx indirection fails on Vercel's build image, but an unversioned PATH bun
# would silently drift from .bun-version. Fall through to the pinned bunx
# bootstrap on mismatch or absence.
if command -v bun >/dev/null 2>&1; then
  PATH_BUN_VERSION=$(bun --version 2>/dev/null || true)
  if [ "$PATH_BUN_VERSION" = "$BUN_VERSION" ]; then
    exec bun "$@"
  fi
  echo "vercel-bun: PATH bun $PATH_BUN_VERSION != pinned $BUN_VERSION, using pinned bunx fallback" >&2
fi
exec bunx "bun@$BUN_VERSION" "$@"
