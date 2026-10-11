'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const pairs = [
  ['braces', '@buildpair/braces-security', '3.0.3-buildpair.1', 'lib/compile.js', 'AST depth exceeds safe limit'],
  ['node-forge', '@buildpair/node-forge-security', '1.4.0-buildpair.1', 'lib/rsa.js', "obj.value[0].value.length !== (('parameters' in capture) ? 2 : 1)"],
];
for (const [alias, expectedName, version, source, patchMarker] of pairs) {
  const installed = path.join(root, 'node_modules', alias);
  const manifest = JSON.parse(fs.readFileSync(path.join(installed, 'package.json'), 'utf8'));
  if (manifest.name !== expectedName || manifest.version !== version) {
    throw new Error('Unpatched registry dependency still installed at ' + alias);
  }
  if (!fs.readFileSync(path.join(installed, source), 'utf8').includes(patchMarker)) {
    throw new Error('Missing reviewed vulnerability backport at ' + alias);
  }
  process.stdout.write('[security] Verified patched fork: ' + alias + '\n');
}
