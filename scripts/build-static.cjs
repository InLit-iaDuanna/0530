const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function cleanDirectory(target) {
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
}

const threeSource = path.join(root, 'node_modules', 'three');
const threeTarget = path.join(root, 'public', 'vendor', 'three');

if (!fs.existsSync(threeSource)) {
  throw new Error('Missing node_modules/three. Run npm install first.');
}

cleanDirectory(threeTarget);
copyDirectory(path.join(threeSource, 'build'), path.join(threeTarget, 'build'));
copyDirectory(path.join(threeSource, 'examples', 'jsm'), path.join(threeTarget, 'examples', 'jsm'));

cleanDirectory(dist);
fs.copyFileSync(path.join(root, 'index.html'), path.join(dist, 'index.html'));
copyDirectory(path.join(root, 'src'), path.join(dist, 'src'));
copyDirectory(path.join(root, 'public'), dist);

console.log(`Built static files in ${dist}`);
