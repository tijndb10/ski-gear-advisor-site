#!/bin/bash
# Runs the engine tests with macOS's built-in JavaScript runner (no Node needed).
# Usage: bash tests/run.sh
cd "$(dirname "$0")/.." || exit 1
osascript -l JavaScript <<'EOF'
ObjC.import('Foundation');
function read(p) { return $.NSString.stringWithContentsOfFileEncodingError(p, $.NSUTF8StringEncoding, null).js; }
var root = $.NSFileManager.defaultManager.currentDirectoryPath.js;
var g = this;
g.log = function (m) { console.log(m); };
(0, eval)(read(root + '/src/engine.js'));
g.catalog = JSON.parse(read(root + '/data/catalog.json'));
(0, eval)(read(root + '/tests/engine.test.js'));
EOF
