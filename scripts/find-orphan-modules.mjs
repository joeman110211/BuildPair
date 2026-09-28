import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const candidateRoots = ['components', 'lib', 'hooks', 'constants', 'types'];
const scanRoots = ['app', 'components', 'lib', 'hooks', 'constants', 'types', 'scripts', 'e2e', '__tests__'];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const ignored = new Set(['node_modules', '.git', '.expo', 'dist', 'build', 'coverage']);

function walk(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];
  const output = [];
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const rel = path.posix.join(relativeDir.replaceAll('\\', '/'), entry.name);
    if (entry.isDirectory()) output.push(...walk(rel));
    else if (sourceExtensions.has(path.extname(entry.name)) && !entry.name.endsWith('.d.ts')) output.push(rel);
  }
  return output;
}

const candidates = new Set(candidateRoots.flatMap(walk));
const sourceFiles = new Set(scanRoots.flatMap(walk));
for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
  if (entry.isFile() && sourceExtensions.has(path.extname(entry.name))) sourceFiles.add(entry.name);
}

const referenced = new Map([...candidates].map((file) => [file, new Set()]));
const platformSuffixes = ['', '.native', '.web', '.ios', '.android'];
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

function normalise(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//, '');
}

function possibleFiles(base) {
  const values = new Set();
  const normal = normalise(base);
  if (extensions.some((ext) => normal.endsWith(ext))) values.add(normal);
  else {
    for (const suffix of platformSuffixes) {
      for (const ext of extensions) values.add(normal + suffix + ext);
    }
    for (const suffix of platformSuffixes) {
      for (const ext of extensions) values.add(path.posix.join(normal, 'index' + suffix + ext));
    }
  }
  return values;
}

function resolveSpecifier(importer, specifier) {
  let base;
  if (specifier.startsWith('@/')) base = specifier.slice(2);
  else if (specifier.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), specifier));
  else return [];
  return [...possibleFiles(base)].filter((file) => candidates.has(file));
}

function specifiers(source) {
  const found = new Set();
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?(?:[^'"\n]*?\s+from\s+)?['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire(?:\.resolve)?\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\b(?:vi|jest)\.mock\s*\(\s*['"]([^'"]+)['"]/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source))) found.add(match[1]);
  }
  return found;
}

for (const importer of sourceFiles) {
  const source = fs.readFileSync(path.join(ROOT, importer), 'utf8');
  for (const specifier of specifiers(source)) {
    for (const resolved of resolveSpecifier(importer, specifier)) {
      if (resolved !== importer) referenced.get(resolved)?.add(importer);
    }
  }
}

const orphans = [...candidates]
  .filter((file) => (referenced.get(file)?.size ?? 0) === 0)
  .sort((a, b) => a.localeCompare(b));

console.log('BuildPair orphan-module scan');
console.log('Candidates: ' + candidates.size);
console.log('Source files scanned: ' + sourceFiles.size);
console.log('Orphan candidates: ' + orphans.length);
for (const file of orphans) {
  const bytes = fs.statSync(path.join(ROOT, file)).size;
  console.log('ORPHAN_CANDIDATE\t' + bytes + '\t' + file);
}
