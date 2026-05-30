import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const index = args.indexOf(name);
  return index !== -1 && args[index + 1] ? args[index + 1] : defaultValue;
};

const HOST = getArg("--host", "0.0.0.0");
const PORT = Number.parseInt(getArg("--port", "8443"), 10);
const CERT_PATH = path.resolve(getArg("--cert", path.join(ROOT, "certs", "cert.pem")));
const KEY_PATH = path.resolve(getArg("--key", path.join(ROOT, "certs", "key.pem")));

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".wasm": "application/wasm",
};

function resolveRequestPath(url) {
  const parsed = new URL(url, "https://local.test");
  const decodedPath = decodeURIComponent(parsed.pathname);
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");
  const filePath = path.resolve(ROOT, relativePath);

  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    return null;
  }

  return filePath;
}

function printAddresses() {
  console.log("");
  console.log("HTTPS server running:");
  console.log(`  Local:   https://localhost:${PORT}`);

  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const iface of entries || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        console.log(`  Network: https://${iface.address}:${PORT}`);
      }
    }
  }
  console.log("");
}

if (!fs.existsSync(CERT_PATH) || !fs.existsSync(KEY_PATH)) {
  console.error("Missing HTTPS certificate files.");
  console.error(`Expected cert: ${CERT_PATH}`);
  console.error(`Expected key:  ${KEY_PATH}`);
  console.error("See docs/SETUP.md for mkcert setup instructions.");
  process.exit(1);
}

const server = https.createServer(
  {
    cert: fs.readFileSync(CERT_PATH),
    key: fs.readFileSync(KEY_PATH),
  },
  (request, response) => {
    const filePath = resolveRequestPath(request.url || "/");
    if (!filePath) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("403 Forbidden");
      return;
    }

    fs.stat(filePath, (statError, stats) => {
      if (statError || !stats.isFile()) {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("404 Not Found");
        return;
      }

      const contentType = MIME_TYPES[path.extname(filePath)] || "application/octet-stream";
      response.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
        "Cross-Origin-Opener-Policy": "same-origin",
      });
      fs.createReadStream(filePath).pipe(response);
    });
  }
);

server.listen(PORT, HOST, printAddresses);
