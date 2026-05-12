#!/usr/bin/env bash
# Build del sitio estático en Render (rootDir = frontend).
# Build command sugerido: bash build.sh
set -euo pipefail

cd "$(dirname "$0")"

echo "==> [frontend] Node: $(node --version 2>&1)"
echo "==> [frontend] Enabling corepack (pnpm)"
corepack enable

echo "==> [frontend] pnpm install --frozen-lockfile"
pnpm install --frozen-lockfile

echo "==> [frontend] pnpm run build"
pnpm run build

echo "==> [frontend] Build OK (publish dist/)"
