#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

FAIL=0

# ── 1. 原有的 ripgrep-based 检查（可选执行）──────────────────────
if command -v rg >/dev/null 2>&1; then
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
  check_absent "public packages import @cgx/adapter-cesium" "@cgx/adapter-cesium" packages --glob '!packages/adapter-cesium/**' --glob '!packages/core/src/viewer/CgxViewer.ts' --glob '!**/dist/**' --glob '!**/coverage/**'
  check_absent "packages outside @cgx/reactive import alien-signals" "alien-signals" packages --glob '!packages/reactive/**' --glob '!**/dist/**' --glob '!**/coverage/**'
  check_absent "packages use @ts-nocheck" "@ts-nocheck" packages --glob '!**/dist/**' --glob '!**/coverage/**'
else
  echo "→ ripgrep (rg) not found, skipping rg-based checks; running grep-based stage-1 gate only."
fi

# ── 2. Stage-1 acceptance gate（grep 实现，不依赖 rg）─────────────
echo "→ stage-1: ensure packages/core/src has no '@cgx/adapter-cesium' imports except CgxViewer"
hits=$(grep -rn "@cgx/adapter-cesium" packages/core/src 2>/dev/null \
  | grep -v "packages/core/src/viewer/CgxViewer.ts" || true)
if [ -n "$hits" ]; then
  echo "✗ unexpected adapter import inside core:"
  echo "$hits"
  FAIL=1
fi

echo "→ stage-1: ensure no upper packages import 'cesium' directly"
for pkg in core reactive feature layer sketch edit history analysis material provider-cn ui effect; do
  d="packages/$pkg/src"
  [ -d "$d" ] || continue
  hits=$(grep -rEn "from[[:space:]]+['\"]cesium" "$d" 2>/dev/null || true)
  if [ -n "$hits" ]; then
    echo "✗ $pkg leaks cesium import:"
    echo "$hits"
    FAIL=1
  fi
done

if [ "$FAIL" -ne 0 ]; then
  echo "Architecture scan failed."
  exit 1
fi

echo "✓ stage-1 architecture checks passed"
echo "Architecture scan passed."
