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

if [ -n "${RENDER:-}" ] && [ -z "${SKIP_VITE_API_BASE_CHECK:-}" ] && [ -z "${VITE_API_BASE:-}" ] && [ -z "${VITE_API_BASE_URL:-}" ]; then
  echo >&2 ""
  echo >&2 "============================================================================"
  echo >&2 "ERROR (Render): VITE_API_BASE no está definido."
  echo >&2 "  El SPA usaría el host del sitio estático para /api/* y el login fallará."
  echo >&2 "  En Render → tu Static Site → Environment añade, por ejemplo:"
  echo >&2 "    VITE_API_BASE=https://system-nestwork.onrender.com"
  echo >&2 "  Luego redeploy. (Para omitir este chequeo: SKIP_VITE_API_BASE_CHECK=1)"
  echo >&2 "============================================================================"
  echo >&2 ""
  exit 1
fi

echo "==> [frontend] pnpm run build"
pnpm run build

echo "==> [frontend] Build OK (publish dist/)"
