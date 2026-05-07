#!/bin/bash
set -e

# To support environment without rg, fallback to grep if needed, but attempt rg first.
if command -v rg >/dev/null 2>&1; then
  SEARCH_CMD="rg"
else
  SEARCH_CMD="grep -r"
fi

FAIL=0

if $SEARCH_CMD -iE '(^|[^a-z])mars($|[^hmeia])' packages/ docs/ plans/ README.md >/dev/null 2>&1; then
  echo "Compliance fail: Found mars"
  FAIL=1
fi

if $SEARCH_CMD -E 'BaseThing|GroupThing|MarsArray|_mountedHook|_unmountedHook' packages/ >/dev/null 2>&1; then
  echo "Compliance fail: Found Mars3D specific classes/hooks"
  FAIL=1
fi

if $SEARCH_CMD -E '[A-Z][a-zA-Z]*Conver[^t]' packages/ >/dev/null 2>&1; then
  echo "Compliance fail: Found Conver typo"
  FAIL=1
fi

if $SEARCH_CMD -E 'PolyPlot|PointPlot' packages/ >/dev/null 2>&1; then
  echo "Compliance fail: Found Plot typo"
  FAIL=1
fi

if [ $FAIL -eq 1 ]; then
  exit 1
fi

echo "Compliance scan passed."
exit 0
