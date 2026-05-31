import fs from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.HTTPS_PORT || process.env.PORT || 8443);
const certPath = path.resolve(root, process.env.HTTPS_CERT || 'certs/cert.pem');
const keyPath = path.resolve(root, process.env.HTTPS_KEY || 'certs/key.pem');

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.glb', 'model/gltf-binary'],
  ['.gltf', 'model/gltf+json'],
  ['.bin', 'application/octet-stream'],
  ['.wasm', 'application/wasm'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.cer', 'application/pkix-cert']
]);

if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
  console.error('Missing HTTPS certificate files.');
  console.error(`Expected certificate: ${certPath}`);
  console.error(`Expected private key: ${keyPath}`);
  console.error('Create them with mkcert, then run npm run https again.');
  process.exit(1);
}

const server = https.createServer(
  {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath)
  },
  (request, response) => {
    const url = new URL(request.url, `https://${request.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);
    const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
    const filePath = resolvePublicFile(relativePath);

    if (!filePath) {
      response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Forbidden');
      return;
    }

    fs.stat(filePath, (statError, stat) => {
      if (statError || !stat.isFile()) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }

      const type = contentTypes.get(path.extname(filePath).toLowerCase()) || 'application/octet-stream';
      response.writeHead(200, {
        'Content-Type': type,
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(filePath).pipe(response);
    });
  }
);

function resolvePublicFile(relativePath) {
  if (isPrivatePath(relativePath)) return null;

  const candidates = [
    path.resolve(root, relativePath),
    path.resolve(root, 'public', relativePath),
    resolveNodeModuleVendor(relativePath)
  ];

  return candidates.find((candidate) => candidate && isAllowedFile(candidate) && fs.existsSync(candidate)) || null;
}

function isPrivatePath(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/').toLowerCase();
  return normalized === 'certs' || normalized.startsWith('certs/');
}

function isInsideRoot(candidate) {
  return candidate === root || candidate.startsWith(root + path.sep);
}

function resolveNodeModuleVendor(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  const prefix = 'vendor/three/';
  if (!normalized.startsWith(prefix)) return null;
  return path.resolve(root, 'node_modules', 'three', normalized.slice(prefix.length));
}

function isAllowedFile(candidate) {
  const nodeModulesThree = path.resolve(root, 'node_modules', 'three');
  return isInsideRoot(candidate) || candidate === nodeModulesThree || candidate.startsWith(nodeModulesThree + path.sep);
}

function getLanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === 'IPv4' && !entry.internal)
    .map((entry) => entry.address);
}

server.listen(port, host, () => {
  console.log(`Cave maze HTTPS server: https://localhost:${port}`);
  getLanAddresses().forEach((address) => {
    console.log(`LAN access: https://${address}:${port}`);
  });
});
