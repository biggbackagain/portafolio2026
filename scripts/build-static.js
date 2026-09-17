import { mkdir, copyFile, readdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const output = resolve('_site');
await mkdir(output, { recursive: true });
for (const file of ['index.html','curso-ia.html','reservacion.html','robots.txt','sitemap.xml','CNAME']) await copyFile(file, resolve(output, file));
async function copyAssets(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.isDirectory()) await copyAssets(resolve(source, entry.name), resolve(destination, entry.name));
    else if (entry.isFile() && ['.css','.js','.json','.png','.jpg','.jpeg','.svg','.pdf'].includes(extname(entry.name))) await copyFile(resolve(source, entry.name), resolve(destination, entry.name));
  }
}
await copyAssets(resolve('assets'), resolve(output, 'assets'));
console.log('Static files prepared in _site. Server, credentials, database and backups are excluded.');
