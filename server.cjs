const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const host = '0.0.0.0';
const port = Number(process.env.PORT || 5188);

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

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = resolvePublicFile(relativePath);

  if (!filePath) {
    response.writeHead(403);
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
});

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

server.listen(port, host, () => {
  console.log(`Cave maze server: http://localhost:${port}`);
  console.log(`LAN access: http://<this-computer-ip>:${port}`);
});
