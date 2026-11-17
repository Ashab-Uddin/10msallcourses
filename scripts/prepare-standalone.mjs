import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, '.next', 'standalone');

if (!fs.existsSync(standaloneDir)) {
  console.warn('[prepare-standalone] .next/standalone not found, skipping');
  process.exit(0);
}

const staticSrc = path.join(rootDir, '.next', 'static');
const staticDest = path.join(standaloneDir, '.next', 'static');
if (fs.existsSync(staticSrc)) {
  fs.mkdirSync(path.dirname(staticDest), { recursive: true });
  fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });
}

const publicSrc = path.join(rootDir, 'public');
const publicDest = path.join(standaloneDir, 'public');
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDest, { recursive: true, force: true });
}

const dataSrc = path.join(rootDir, 'data');
const dataDest = path.join(standaloneDir, 'data');
if (fs.existsSync(dataSrc) && !fs.existsSync(dataDest)) {
  fs.cpSync(dataSrc, dataDest, { recursive: true, force: true });
}

const serverFile = path.join(standaloneDir, 'server.js');
if (fs.existsSync(serverFile)) {
  let content = fs.readFileSync(serverFile, 'utf-8');
  content = content
    .replace(
      'const currentPort = parseInt(process.env.PORT, 10) || 3000',
      'const currentPort = parseInt(process.env.APP_PORT, 10) || 3000'
    )
    .replace(
      "const hostname = process.env.HOSTNAME || '0.0.0.0'",
      "const hostname = '0.0.0.0'"
    );
  fs.writeFileSync(serverFile, content, 'utf-8');
}

console.log('[prepare-standalone] Standalone assets & port 3000 binding prepared.');
