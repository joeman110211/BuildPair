import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const targets = [
  'lib/admin-access-store.ts',
  'lib/admin-ai-context.ts',
  'lib/admin-ai-security.ts',
  'lib/admin-assistant-actions.ts',
  'lib/admin-clerk.ts',
  'lib/admin-invite-email.ts',
  'lib/admin-navigation.ts',
  'lib/admin-owner.ts',
];
const roots = ['app','components','lib','hooks','constants','types','scripts','e2e','__tests__'];
const exts = ['.ts','.tsx','.js','.jsx','.mjs','.cjs'];
const ignored = new Set(['node_modules','.git','.expo','dist','build','coverage']);

function walk(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out = [];
  for (const ent of fs.readdirSync(abs,{withFileTypes:true})) {
    if (ignored.has(ent.name)) continue;
    const rel = path.posix.join(dir.replaceAll('\\','/'), ent.name);
    if (ent.isDirectory()) out.push(...walk(rel));
    else if (exts.includes(path.extname(ent.name))) out.push(rel);
  }
  return out;
}

function resolve(importer, spec) {
  let base;
  if (spec.startsWith('@/')) base = spec.slice(2);
  else if (spec.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(importer), spec));
  else return null;
  for (const ext of exts) {
    const p = base.endsWith(ext) ? base : base + ext;
    if (targets.includes(p)) return p;
  }
  return null;
}

const patterns = [
  /\b(?:import|export)\s+(?:type\s+)?(?:[^'"\n]*?\s+from\s+)?['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire(?:\.resolve)?\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

const refs = new Map(targets.map(t => [t, new Set()]));
for (const file of roots.flatMap(walk)) {
  const src = fs.readFileSync(path.join(ROOT,file),'utf8');
  for (const re of patterns) {
    let m;
    while ((m = re.exec(src))) {
      const hit = resolve(file, m[1]);
      if (hit && hit !== file) refs.get(hit).add(file);
    }
  }
}
for (const target of targets) {
  console.log('TARGET\t'+target);
  for (const importer of [...refs.get(target)].sort()) console.log('IMPORTER\t'+target+'\t'+importer);
}
