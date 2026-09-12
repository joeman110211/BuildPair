import { promises as fs } from 'node:fs';
import path from 'node:path';

const EXPORT_TOKEN = 'bp_backup_7PmR4xK2qW8vN5sD9cT1hF6jL3zA';
const SELF_PATH = 'app/api/internal-source-export-20260912+api.ts';

const ROOT_ENTRIES = [
  '.dockerignore', '.env.example', '.github', '.gitignore', '.nvmrc', 'README.md', 'SECURITY.md', '__tests__',
  'app.config.js', 'app.json', 'app', 'components', 'constants', 'db', 'docs', 'downloads', 'drizzle.config.ts',
  'e2e', 'eas.json', 'eslint.config.js', 'expo-env.d.ts', 'hooks', 'infra', 'lib', 'lighthouserc.cjs',
  'package-lock.json', 'package.json', 'playwright.config.mjs', 'public', 'render.yaml', 'scripts', 'server.mjs',
  'tsconfig.json', 'types', 'vitest.config.mts',
] as const;

type ZipEntry = { name: string; data: Buffer; mtime: Date };

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimeDate(date: Date) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = (year - 1980) << 9 | (date.getMonth() + 1) << 5 | date.getDate();
  return { time, day };
}

async function collectFile(root: string, absolute: string, relative: string, entries: ZipEntry[]) {
  const normalised = relative.split(path.sep).join('/');
  if (normalised === SELF_PATH) return;
  const stat = await fs.stat(absolute);
  if (stat.isDirectory()) {
    const names = (await fs.readdir(absolute)).sort();
    for (const name of names) await collectFile(root, path.join(absolute, name), path.join(relative, name), entries);
    return;
  }
  if (!stat.isFile()) return;
  entries.push({ name: normalised, data: await fs.readFile(absolute), mtime: stat.mtime });
}

async function collectSource(root: string) {
  const entries: ZipEntry[] = [];
  for (const entry of ROOT_ENTRIES) {
    const absolute = path.join(root, entry);
    try { await collectFile(root, absolute, entry, entries); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

function makeZip(entries: ZipEntry[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const { time, day } = dosTimeDate(entry.mtime);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, entry.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(size, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + size;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get('token') !== EXPORT_TOKEN) return Response.json({ error: 'Not found' }, { status: 404 });

  const sourceFiles = await collectSource(process.cwd());
  const manifest = Buffer.from([
    'BuildPair full source backup',
    'Created: 2026-09-12',
    'Database snapshot branch: post-seed-backup-2026-09-12 (br-sweet-mouse-zaibiuc7)',
    'The temporary export endpoint is deliberately excluded from this archive.',
    `Files: ${sourceFiles.length}`,
    '',
  ].join('\n'), 'utf8');
  sourceFiles.push({ name: 'BACKUP_INFO.txt', data: manifest, mtime: new Date() });

  const zip = makeZip(sourceFiles);
  return new Response(zip, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="BuildPair-latest-source-backup-2026-09-12.zip"',
      'Cache-Control': 'no-store, max-age=0',
      'Content-Length': String(zip.length),
    },
  });
}
