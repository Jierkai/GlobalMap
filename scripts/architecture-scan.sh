#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "Architecture scan requires ripgrep (rg)." >&2
  exit 1
fi

FAIL=0

check_absent() {
  local label="$1"
  local pattern="$2"
  shift 2

  local matches
  matches="$(rg -n "$pattern" "$@" 2>/dev/null || true)"
  if [ -n "$matches" ]; then
    echo "Architecture fail: $label"
    echo "$matches"
    FAIL=1
  fi
}

check_absent "public packages import cesium" "from ['\"]cesium['\"]|import \\* as Cesium|import type \\* as Cesium" packages --glob '!packages/adapter-cesium/**' --glob '!**/dist/**' --glob '!**/coverage/**'
check_absent "public packages import @cgx/adapter-cesium" "@cgx/adapter-cesium" packages --glob '!packages/adapter-cesium/**' --glob '!**/dist/**' --glob '!**/coverage/**'
check_absent "packages outside @cgx/reactive import alien-signals" "alien-signals" packages --glob '!packages/reactive/**' --glob '!**/dist/**' --glob '!**/coverage/**'
check_absent "packages use @ts-nocheck" "@ts-nocheck" packages --glob '!**/dist/**' --glob '!**/coverage/**'

if [ "$FAIL" -ne 0 ]; then
  exit 1
fi

echo "Architecture scan passed."
