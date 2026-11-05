#!/bin/bash
# Regenerates data/catalog.js (what the browser loads) from data/catalog.json (the source of truth).
cd "$(dirname "$0")/.." || exit 1
{ printf '// GENERATED from data/catalog.json by scripts/build-catalog.sh - do not edit.\nwindow.SKI_CATALOG = '; cat data/catalog.json; printf ';\n'; } > data/catalog.js
