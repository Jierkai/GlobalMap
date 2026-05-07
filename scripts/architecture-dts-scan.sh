#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "Architecture d.ts scan requires ripgrep (rg)." >&2
  exit 1
fi

mapfile -t DECLARATIONS < <(node --input-type=module <<'NODE'
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packagesDir = path.join(root, 'packages');
const declarations = new Set();

for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const pkgDir = path.join(packagesDir, entry.name);
  const pkgPath = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const visit = (value) => {
    if (typeof value === 'string') {
      if (value.endsWith('.d.ts')) {
        declarations.add(path.resolve(pkgDir, value));
      }
      return;
    }

    if (!value || typeof value !== 'object') return;
    for (const nested of Object.values(value)) {
      visit(nested);
    }
  };

  visit(pkg.exports);
  if (typeof pkg.types === 'string' && pkg.types.endsWith('.d.ts')) {
    declarations.add(path.resolve(pkgDir, pkg.types));
  }
}

for (const declaration of declarations) {
  if (fs.existsSync(declaration)) {
    process.stdout.write(`${declaration}\n`);
  }
}
NODE
)

if [ "${#DECLARATIONS[@]}" -eq 0 ]; then
  echo "Architecture d.ts scan found no public declaration files. Run pnpm build first." >&2
  exit 1
fi

PATTERN="from ['\"]cesium['\"]|import\\(['\"]cesium['\"]\\)|@cgx/adapter-cesium|Cesium\\.|\\bCesium[A-Za-z0-9_]*\\b"
MATCHES="$(rg -n "$PATTERN" "${DECLARATIONS[@]}" 2>/dev/null || true)"

if [ -n "$MATCHES" ]; then
  echo "Architecture d.ts fail: public declarations expose Cesium-native types"
  echo "$MATCHES"
  exit 1
fi

echo "Architecture d.ts scan passed."
