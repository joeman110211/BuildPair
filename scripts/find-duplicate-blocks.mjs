import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const roots = ['app', 'components', 'lib', 'hooks', 'constants', 'types'];
const extensions = new Set(['.ts', '.tsx']);
const ignored = new Set(['node_modules', '.git', '.expo', 'dist', 'build', 'coverage']);
const WINDOW = 10;
const MIN_CHARS = 260;

function walk(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
    if (ignored.has(ent.name)) continue;
    const child = path.posix.join(rel.replaceAll('\\', '/'), ent.name);
    if (ent.isDirectory()) out.push(...walk(child));
    else if (extensions.has(path.extname(ent.name)) && !ent.name.endsWith('.d.ts')) out.push(child);
  }
  return out;
}

function usefulLine(line) {
  const s = line.trim();
  if (!s) return false;
  if (s.startsWith('//')) return false;
  if (s.startsWith('import ')) return false;
  return true;
}

const groups = new Map();
const files = roots.flatMap(walk);

for (const file of files) {
  const raw = fs.readFileSync(path.join(ROOT, file), 'utf8').split(/\r?\n/);
  const lines = raw.map((text, i) => ({ text: text.trim().replace(/\s+/g, ' '), line: i + 1 })).filter(x => usefulLine(x.text));
  for (let i = 0; i + WINDOW <= lines.length; i++) {
    const slice = lines.slice(i, i + WINDOW);
    const normalized = slice.map(x => x.text).join('\n');
    if (normalized.length < MIN_CHARS) continue;
    const hash = crypto.createHash('sha1').update(normalized).digest('hex');
    const item = { file, start: slice[0].line, end: slice.at(-1).line, normalized };
    const arr = groups.get(hash) || [];
    arr.push(item);
    groups.set(hash, arr);
  }
}

const duplicates = [];
for (const [hash, occ] of groups) {
  const distinct = new Set(occ.map(x => x.file));
  if (distinct.size < 2) continue;
  duplicates.push({ hash, occ });
}

duplicates.sort((a, b) => {
  const af = new Set(a.occ.map(x => x.file)).size;
  const bf = new Set(b.occ.map(x => x.file)).size;
  return bf - af || b.occ.length - a.occ.length || b.occ[0].normalized.length - a.occ[0].normalized.length;
});

const seen = new Set();
let shown = 0;
console.log('BuildPair duplicate-block scan');
console.log('Files scanned: ' + files.length);
console.log('Raw duplicate windows: ' + duplicates.length);

for (const group of duplicates) {
  const unique = [];
  for (const o of group.occ) {
    const key = o.file + ':' + o.start;
    if (!seen.has(key)) unique.push(o);
  }
  if (new Set(unique.map(x => x.file)).size < 2) continue;

  const filesKey = [...new Set(unique.map(x => x.file))].sort().join('|');
  const snippet = unique[0].normalized.split('\n').slice(0, 3).join(' / ');
  console.log('DUPLICATE_GROUP\t' + filesKey + '\t' + snippet.slice(0, 220));
  for (const o of unique.slice(0, 8)) {
    console.log('OCCURRENCE\t' + o.file + '\t' + o.start + '-' + o.end);
    seen.add(o.file + ':' + o.start);
  }
  shown++;
  if (shown >= 60) break;
}

console.log('Reported groups: ' + shown);
