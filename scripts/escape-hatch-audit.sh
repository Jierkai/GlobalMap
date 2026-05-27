#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

OUTPUT="$ROOT_DIR/.architecture-metrics.json"
TS="$(date +%s)"

count_pattern() {
  local pattern="$1"
  local target="$2"
  local matches
  matches="$(grep -rEn "$pattern" "$target" 2>/dev/null || true)"
  printf '%s\n' "$matches" \
    | grep -v "/dist/" \
    | grep -v "/coverage/" \
    | grep -v "/.turbo/" \
    | sed '/^$/d' \
    | wc -l \
    | tr -d ' '
}

unsafe_native=0
unsafe_get_cesium=0
unsafe_native_viewer=0

for pkg in packages/*/src; do
  [ -d "$pkg" ] || continue
  case "$pkg" in
    packages/adapter-cesium/src) continue ;;
  esac
  unsafe_native=$(( unsafe_native + $(count_pattern '\.unsafeNative(\?\.)?\(' "$pkg") ))
  unsafe_get_cesium=$(( unsafe_get_cesium + $(count_pattern '\bunsafeGetCesium\b' "$pkg") ))
  unsafe_native_viewer=$(( unsafe_native_viewer + $(count_pattern '\bunsafeGetNativeViewer\b' "$pkg") ))
done

cat > "$OUTPUT" <<EOF
{
  "generatedAt": $TS,
  "escapeHatch": {
    "unsafeNative": $unsafe_native,
    "unsafeGetCesium": $unsafe_get_cesium,
    "unsafeGetNativeViewer": $unsafe_native_viewer
  }
}
EOF

echo "✓ escape-hatch audit written to $OUTPUT"
cat "$OUTPUT"
