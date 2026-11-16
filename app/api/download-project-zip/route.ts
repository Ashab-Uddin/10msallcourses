import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

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

    // Deflate raw
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

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + filenameBuffer.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed to extract (2.0)
    localHeader.writeUInt16LE(0x0800, 6); // general purpose bit flag (UTF-8)
    localHeader.writeUInt16LE(8, 8); // compression method (8 = Deflate)
    localHeader.writeUInt16LE(modTime, 10);
    localHeader.writeUInt16LE(modDate, 12);
    localHeader.writeUInt32LE(fileCrc, 14);
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(filenameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra field length
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

  // Build Central Directory
  const centralDirStart = currentOffset;
  const centralDirBuffers: Buffer[] = [];

  for (const entry of entries) {
    const filenameBuffer = Buffer.from(entry.filename, 'utf-8');
    const cd = Buffer.alloc(46 + filenameBuffer.length);
    cd.writeUInt32LE(0x02014b50, 0); // signature
    cd.writeUInt16LE(20, 4); // version made by
    cd.writeUInt16LE(20, 6); // version needed
    cd.writeUInt16LE(0x0800, 8); // general purpose bit flag (UTF-8)
    cd.writeUInt16LE(8, 10); // compression method
    cd.writeUInt16LE(entry.modTime, 12);
    cd.writeUInt16LE(entry.modDate, 14);
    cd.writeUInt32LE(entry.crc, 16);
    cd.writeUInt32LE(entry.compressedData.length, 20);
    cd.writeUInt32LE(entry.uncompressedSize, 24);
    cd.writeUInt16LE(filenameBuffer.length, 28);
    cd.writeUInt16LE(0, 30); // extra field length
    cd.writeUInt16LE(0, 32); // file comment length
    cd.writeUInt16LE(0, 34); // disk number start
    cd.writeUInt16LE(0, 36); // internal file attributes
    cd.writeUInt32LE(0, 38); // external file attributes
    cd.writeUInt32LE(entry.offset, 42); // relative offset of local header
    filenameBuffer.copy(cd, 46);

    centralDirBuffers.push(cd);
    currentOffset += cd.length;
  }

  const centralDirSize = currentOffset - centralDirStart;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4); // number of this disk
  eocd.writeUInt16LE(0, 6); // disk where central directory starts
  eocd.writeUInt16LE(entries.length, 8); // number of central directory records on this disk
  eocd.writeUInt16LE(entries.length, 10); // total number of central directory records
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirStart, 16);
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localHeaders, ...centralDirBuffers, eocd]);
}

const IGNORED_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  '.turbo',
  'dist',
  'build',
  '.gemini',
]);

const IGNORED_EXTS = new Set(['.log', '.tsbuildinfo']);

function collectFiles(dir: string, baseDir: string, fileList: { path: string; data: Buffer; mtime?: Date }[]) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!IGNORED_DIRS.has(item.name)) {
        collectFiles(fullPath, baseDir, fileList);
      }
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      if (!IGNORED_EXTS.has(ext)) {
        try {
          const stats = fs.statSync(fullPath);
          // Limit individual file size to 25MB for safety
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

export async function GET() {
  try {
    const rootDir = process.cwd();
    const filesToZip: { path: string; data: Buffer; mtime?: Date }[] = [];

    // Collect all project code files
    collectFiles(rootDir, rootDir, filesToZip);

    const zipBuffer = createZipBuffer(filesToZip);

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="10ms-affiliate-portal-full.zip"',
        'Content-Length': String(zipBuffer.length),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('Failed to create project ZIP:', err);
    return NextResponse.json(
      { error: 'ZIP ফাইল তৈরি ব্যর্থ হয়েছে: ' + (err.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
