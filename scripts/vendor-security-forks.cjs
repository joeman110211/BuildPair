'use strict';

// One-shot migration from verified on-disk security backports into pinned local
// package forks. Run only in the branch-restricted GitHub Actions workflow.
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const load = p => fs.readFileSync(path.join(root, p), 'utf8');
const save = (p, contents) => fs.writeFileSync(path.join(root, p), contents);

const packages = [
  {
    origin: 'braces',
    dirname: 'packages/braces-security',
    forkName: '@buildpair/braces-security',
    forkVersion: '3.0.3-buildpair.1',
    requiredNeedle: "AST depth exceeds safe limit",
    advisory: 'GHSA-vfj7-8cjw-p6xm',
  },
  {
    origin: 'node-forge',
    dirname: 'packages/node-forge-security',
    forkName: '@buildpair/node-forge-security',
    forkVersion: '1.4.0-buildpair.1',
    requiredNeedle: "obj.value[0].value.length !== (('parameters' in capture) ? 2 : 1)",
    advisory: 'GHSA-86w9-cpqp-85rv',
  },
];

for (const entry of packages) {
  const from = path.join(root, 'node_modules', entry.origin);
  const to = path.join(root, entry.dirname);
  if (fs.existsSync(to)) {
    throw new Error('Refusing to overwrite existing checked-in security fork: ' + to);
  }
  // npm's verified registry copies are already patched by postinstall. Vendoring
  // preserves LICENSE, source, package metadata and the exact patched modules.
  fs.cpSync(from, to, {
    recursive: true,
    filter: p => {
      const relative = path.relative(from, p).replaceAll('\\', '/');
      return !relative.split('/').some(segment =>
        segment === 'node_modules' || segment === 'dist' ||
        segment === 'coverage' || segment === '.git');
    },
  });

  const manifestPath = path.join(entry.dirname, 'package.json');
  const pkg = JSON.parse(load(manifestPath));
  pkg.name = entry.forkName;
  pkg.version = entry.forkVersion;
  pkg.private = true;
  // Local file: forks are linked packages; npm otherwise tries to install
  // each publisher's test/build devDependencies as project dependencies.
  delete pkg.devDependencies;
  delete pkg.scripts;
  pkg.description = (pkg.description || entry.origin) + ' (BuildPair patched security fork)';
  // Forbid npm from replacing the reviewed local fork with the registry package.
  save(manifestPath, JSON.stringify(pkg, null, 2) + '\n');

  const codePath = entry.origin === 'braces' ? 'lib/compile.js' : 'lib/rsa.js';
  if (!load(path.join(entry.dirname, codePath)).includes(entry.requiredNeedle)) {
    throw new Error('Refusing to vendor unpatched ' + entry.origin);
  }
  save(path.join(entry.dirname, 'SECURITY-BACKPORT.md'),
    'BuildPair security-only fork of ' + entry.origin + '\n\n' +
    'Upstream npm version: ' + entry.forkVersion.split('-buildpair')[0] + '\n' +
    'Fixed advisory: ' + entry.advisory + '\n' +
    'Source: npm package pinned in the root package-lock at preparation time.\n' +
    'Changes: minimum vulnerability fix via scripts/patch-security-dependencies.cjs.\n' +
    'Review and replace with official upstream release when available.\n' +
    'Preserve upstream licensing and attribution in this directory.\n');
  process.stdout.write('Vendored reviewed ' + entry.dirname + '\n');
}

const pkg = JSON.parse(load('package.json'));
delete pkg.scripts.postinstall;
pkg.scripts['verify:security-patches'] = 'node scripts/verify-vendored-security.cjs';
for (const entry of packages) {
  pkg.dependencies[entry.origin] = 'file:' + entry.dirname;
  pkg.overrides[entry.origin] = '$' + entry.origin;
}
pkg.dependencies = Object.fromEntries(Object.entries(pkg.dependencies).sort(([a], [b]) => a.localeCompare(b, 'en')));
save('package.json', JSON.stringify(pkg, null, 2) + '\n');
