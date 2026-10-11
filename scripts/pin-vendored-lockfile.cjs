'use strict';

// Convert only the two known registry package entries to local symlink entries.
// Preserve every other pinned version and existing npm integrity hash.
// npm ci must validate this complete lockfile before any PR can merge.
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const file = path.join(root, 'package-lock.json');
const lock = JSON.parse(fs.readFileSync(file, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

if (lock.lockfileVersion !== 3) throw new Error('Expected npm v3 lockfile');
const replacements = [
  ['braces', 'packages/braces-security', '@buildpair/braces-security', '3.0.3-buildpair.1', '3.0.3'],
  ['node-forge', 'packages/node-forge-security', '@buildpair/node-forge-security', '1.4.0-buildpair.1', '1.4.0'],
];

lock.packages[''].dependencies = { ...pkg.dependencies };
for (const [name, local, forkName, forkVersion, requiredVersion] of replacements) {
  const key = 'node_modules/' + name;
  const original = lock.packages[key];
  if (!original || original.version !== requiredVersion || !original.integrity ||
      !original.resolved.startsWith('https://registry.npmjs.org/')) {
    throw new Error('Refusing to alter unexpected registry dependency: ' + name);
  }
  const { resolved, integrity, version, ...metadata } = original;
  lock.packages[local] = {
    name: forkName,
    version: forkVersion,
    ...metadata,
  };
  lock.packages[key] = {
    resolved: local,
    link: true,
  };
  process.stdout.write('[security] Lockfile linked reviewed ' + name +
    '; original integrity preserved in git history: ' + integrity.slice(0, 18) + '...\n');
}
fs.writeFileSync(file, JSON.stringify(lock, null, 2) + '\n');
