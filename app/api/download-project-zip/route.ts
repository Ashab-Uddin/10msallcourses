import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { isAuthorizedAdminRequest } from '@/src/lib/adminAuth';

export const dynamic = 'force-dynamic';

// CRC32 Lookup Table for standard ZIP archive calculation
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  filename: string;
  compressedData: Buffer;
  uncompressedSize: number;
  crc: number;
  modTime: number;
  modDate: number;
  offset: number;
}

function createZipBuffer(files: { path: string; data: Buffer; mtime?: Date }[]): Buffer {
  const entries: ZipEntry[] = [];
  const localHeaders: Buffer[] = [];
  let currentOffset = 0;

  for (const file of files) {
    const rawName = file.path.replace(/\\/g, '/').replace(/^\/+/, '');
    const filenameBuffer = Buffer.from(rawName, 'utf-8');
    const fileCrc = crc32(file.data);
    const uncompressedSize = file.data.length;

    const compressedData = zlib.deflateRawSync(file.data, { level: 6 });
    const compressedSize = compressedData.length;

    const mtime = file.mtime || new Date();
    const modTime =
      ((mtime.getHours() & 0x1f) << 11) |
      ((mtime.getMinutes() & 0x3f) << 5) |
      Math.floor((mtime.getSeconds() & 0x3e) / 2);
    const modDate =
      (((mtime.getFullYear() - 1980) & 0x7f) << 9) |
      (((mtime.getMonth() + 1) & 0x0f) << 5) |
      (mtime.getDate() & 0x1f);

    const localHeader = Buffer.alloc(30 + filenameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(8, 8);
    localHeader.writeUInt16LE(modTime, 10);
    localHeader.writeUInt16LE(modDate, 12);
    localHeader.writeUInt32LE(fileCrc, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(filenameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    filenameBuffer.copy(localHeader, 30);

    entries.push({
      filename: rawName,
      compressedData,
      uncompressedSize,
      crc: fileCrc,
      modTime,
      modDate,
      offset: currentOffset,
    });

    localHeaders.push(localHeader, compressedData);
    currentOffset += localHeader.length + compressedSize;
  }

  const centralDirStart = currentOffset;
  const centralDirBuffers: Buffer[] = [];

  for (const entry of entries) {
    const filenameBuffer = Buffer.from(entry.filename, 'utf-8');
    const cd = Buffer.alloc(46 + filenameBuffer.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(entry.modTime, 12);
    cd.writeUInt16LE(entry.modDate, 14);
    cd.writeUInt32LE(entry.crc, 16);
    cd.writeUInt32LE(entry.compressedData.length, 20);
    cd.writeUInt32LE(entry.uncompressedSize, 24);
    cd.writeUInt16LE(filenameBuffer.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(entry.offset, 42);
    filenameBuffer.copy(cd, 46);

    centralDirBuffers.push(cd);
    currentOffset += cd.length;
  }

  const centralDirSize = currentOffset - centralDirStart;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirStart, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, ...centralDirBuffers, eocd]);
}

const IGNORED_DIRS = new Set([
  'node_modules',
  '.next',
  '.next-dev',
  '.git',
  '.turbo',
  '.vercel',
  '.aistudio',
  '.gemini',
  'dist',
  'build',
  'aistudio',
]);

const IGNORED_EXTS = new Set(['.log', '.tsbuildinfo', '.pem', '.key', '.zip']);

function isSensitiveFilename(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower === '.env.example') return false;
  return lower === '.env' || lower.startsWith('.env.');
}

function collectFiles(
  dir: string,
  baseDir: string,
  fileList: { path: string; data: Buffer; mtime?: Date }[]
) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!IGNORED_DIRS.has(item.name)) {
        collectFiles(fullPath, baseDir, fileList);
      }
    } else if (item.isFile()) {
      if (isSensitiveFilename(item.name)) continue;
      const ext = path.extname(item.name).toLowerCase();
      if (!IGNORED_EXTS.has(ext)) {
        try {
          const stats = fs.statSync(fullPath);
          if (stats.size < 25 * 1024 * 1024) {
            const data = fs.readFileSync(fullPath);
            const relPath = path.relative(baseDir, fullPath);
            fileList.push({ path: relPath, data, mtime: stats.mtime });
          }
        } catch {}
      }
    }
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rootDir = process.cwd();
    const filesToZip: { path: string; data: Buffer; mtime?: Date }[] = [];

    collectFiles(rootDir, rootDir, filesToZip);

    const zipBuffer = createZipBuffer(filesToZip);

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="10ms-affiliate-portal-backup.zip"',
        'Content-Length': String(zipBuffer.length),
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: unknown) {
    console.error('Failed to create project ZIP:', err);
    return NextResponse.json(
      { error: 'ZIP ফাইল তৈরি ব্যর্থ হয়েছে।' },
      { status: 500 }
    );
  }
}
