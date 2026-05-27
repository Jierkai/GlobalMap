#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "Architecture d.ts scan requires ripgrep (rg)." >&2
  exit 1
fi

FAIL=0

# ── Sweep A: 非 adapter-cesium 包的 dist 整树不能 import cesium ─────────
echo "→ dts-scan A: ensure non-adapter dist trees don't import cesium"
LEAK_A_PATTERN="from ['\"]cesium['\"]|from ['\"]cesium/|^[[:space:]]*import ['\"]cesium['\"]|^[[:space:]]*import ['\"]cesium/|import\\(['\"]cesium['\"]\\)"
for pkg_dist in packages/*/dist; do
  [ -d "$pkg_dist" ] || continue
  case "$pkg_dist" in
    packages/adapter-cesium/dist) continue ;;
  esac
  hits="$(rg -n "$LEAK_A_PATTERN" "$pkg_dist" 2>/dev/null || true)"
  if [ -n "$hits" ]; then
    echo "✗ $pkg_dist leaks cesium import:"
    echo "$hits"
    FAIL=1
  fi
done

# ── Sweep B: adapter-cesium 公开 d.ts 不能暴露内部桥接器符号 ───────────
echo "→ dts-scan B: ensure adapter-cesium dist d.ts doesn't expose internal bridges"
ADAPTER_DTS="packages/adapter-cesium/dist"
if [ -d "$ADAPTER_DTS" ]; then
  for symbol in LayerBridge EntityBase PrimitiveBase PickingBridge; do
    hits="$(rg -n "\\b$symbol\\b" "$ADAPTER_DTS/index.d.ts" 2>/dev/null || true)"
    if [ -n "$hits" ]; then
      echo "✗ adapter-cesium index.d.ts exposes $symbol:"
      echo "$hits"
      FAIL=1
    fi
  done
fi

if [ "$FAIL" -ne 0 ]; then
  echo "Architecture d.ts scan failed."
  exit 1
fi

echo "✓ architecture d.ts scan passed."
