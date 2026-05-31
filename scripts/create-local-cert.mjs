import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const certDir = path.join(root, 'certs');
const publicDir = path.join(root, 'public');
const requestedIps = process.argv.slice(2).filter(Boolean);
const lanIps = getLanAddresses();
const ips = unique(['127.0.0.1', ...requestedIps, ...lanIps]);
const dnsNames = unique(['localhost']);

fs.mkdirSync(certDir, { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });

const rootKeys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const serverKeys = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

const rootSubject = name('Cave Maze Local Dev CA');
const serverSubject = name('Cave Maze Local Server');
const now = new Date();
const rootNotAfter = addDays(now, 3650);
const serverNotAfter = addDays(now, 397);

const rootCert = createCertificate({
  subject: rootSubject,
  issuer: rootSubject,
  publicKey: rootKeys.publicKey,
  signingKey: rootKeys.privateKey,
  notBefore: addDays(now, -1),
  notAfter: rootNotAfter,
  extensions: [
    extension('2.5.29.19', sequence(boolean(true)), true),
    extension('2.5.29.15', keyUsage([0, 5, 6]), true)
  ]
});

const serverCert = createCertificate({
  subject: serverSubject,
  issuer: rootSubject,
  publicKey: serverKeys.publicKey,
  signingKey: rootKeys.privateKey,
  notBefore: addDays(now, -1),
  notAfter: serverNotAfter,
  extensions: [
    extension('2.5.29.19', sequence(), true),
    extension('2.5.29.15', keyUsage([0, 2]), true),
    extension('2.5.29.37', sequence(oid('1.3.6.1.5.5.7.3.1'))),
    extension('2.5.29.17', subjectAltName(dnsNames, ips))
  ]
});

const rootPrivatePem = rootKeys.privateKey.export({ type: 'pkcs8', format: 'pem' });
const serverPrivatePem = serverKeys.privateKey.export({ type: 'pkcs8', format: 'pem' });
const rootCertPem = toPem('CERTIFICATE', rootCert);
const serverCertPem = toPem('CERTIFICATE', serverCert);

fs.writeFileSync(path.join(certDir, 'key.pem'), serverPrivatePem);
fs.writeFileSync(path.join(certDir, 'cert.pem'), `${serverCertPem}\n${rootCertPem}`);
fs.writeFileSync(path.join(certDir, 'server-cert.pem'), serverCertPem);
fs.writeFileSync(path.join(certDir, 'cave-maze-root-ca.pem'), rootCertPem);
fs.writeFileSync(path.join(certDir, 'cave-maze-root-ca.cer'), rootCert);
fs.writeFileSync(path.join(certDir, 'cave-maze-root-ca-key.pem'), rootPrivatePem);
fs.writeFileSync(path.join(publicDir, 'cave-maze-root-ca.cer'), rootCert);

console.log('Generated local HTTPS certificates:');
console.log(`  ${path.join(certDir, 'cert.pem')}`);
console.log(`  ${path.join(certDir, 'key.pem')}`);
console.log(`  ${path.join(certDir, 'cave-maze-root-ca.cer')}`);
console.log(`  ${path.join(publicDir, 'cave-maze-root-ca.cer')}`);
console.log(`Certificate IP SANs: ${ips.join(', ')}`);

function createCertificate({ subject, issuer, publicKey, signingKey, notBefore, notAfter, extensions }) {
  const tbs = sequence(
    explicit(0, integer(2)),
    integer(randomSerial()),
    sha256WithRsa(),
    issuer,
    sequence(time(notBefore), time(notAfter)),
    subject,
    publicKey.export({ type: 'spki', format: 'der' }),
    explicit(3, sequence(...extensions))
  );
  const signature = crypto.sign('RSA-SHA256', tbs, signingKey);
  return sequence(tbs, sha256WithRsa(), bitString(signature));
}

function extension(id, value, critical = false) {
  const parts = [oid(id)];
  if (critical) parts.push(boolean(true));
  parts.push(octetString(value));
  return sequence(...parts);
}

function subjectAltName(dnsNamesValue, ipValues) {
  const names = [];
  for (const value of dnsNamesValue) names.push(der(0x82, Buffer.from(value, 'ascii')));
  for (const value of ipValues) names.push(der(0x87, ipv4Bytes(value)));
  return sequence(...names);
}

function keyUsage(bits) {
  const maxBit = Math.max(...bits);
  const byteLength = Math.floor(maxBit / 8) + 1;
  const unusedBits = byteLength * 8 - (maxBit + 1);
  const bytes = Buffer.alloc(byteLength);
  for (const bit of bits) bytes[Math.floor(bit / 8)] |= 1 << (7 - (bit % 8));
  return bitString(bytes, unusedBits);
}

function sha256WithRsa() {
  return sequence(oid('1.2.840.113549.1.1.11'), der(0x05, Buffer.alloc(0)));
}

function name(commonName) {
  return sequence(set(sequence(oid('2.5.4.3'), utf8(commonName))));
}

function time(date) {
  const year = date.getUTCFullYear();
  if (year >= 2050) return der(0x18, Buffer.from(formatGeneralizedTime(date), 'ascii'));
  return der(0x17, Buffer.from(formatUtcTime(date), 'ascii'));
}

function integer(value) {
  let bytes;
  if (Buffer.isBuffer(value)) {
    bytes = Buffer.from(value);
  } else {
    bytes = [];
    let current = BigInt(value);
    do {
      bytes.unshift(Number(current & 0xffn));
      current >>= 8n;
    } while (current > 0n);
    bytes = Buffer.from(bytes);
  }
  while (bytes.length > 1 && bytes[0] === 0 && (bytes[1] & 0x80) === 0) bytes = bytes.subarray(1);
  if (bytes[0] & 0x80) bytes = Buffer.concat([Buffer.from([0]), bytes]);
  return der(0x02, bytes);
}

function boolean(value) {
  return der(0x01, Buffer.from([value ? 0xff : 0x00]));
}

function utf8(value) {
  return der(0x0c, Buffer.from(value, 'utf8'));
}

function oid(value) {
  const parts = value.split('.').map(Number);
  const body = [40 * parts[0] + parts[1]];
  for (const part of parts.slice(2)) {
    const bytes = [part & 0x7f];
    let current = part >> 7;
    while (current > 0) {
      bytes.unshift((current & 0x7f) | 0x80);
      current >>= 7;
    }
    body.push(...bytes);
  }
  return der(0x06, Buffer.from(body));
}

function octetString(value) {
  return der(0x04, value);
}

function bitString(value, unusedBits = 0) {
  return der(0x03, Buffer.concat([Buffer.from([unusedBits]), value]));
}

function sequence(...items) {
  return der(0x30, Buffer.concat(items));
}

function set(...items) {
  return der(0x31, Buffer.concat(items));
}

function explicit(index, value) {
  return der(0xa0 + index, value);
}

function der(tag, value) {
  return Buffer.concat([Buffer.from([tag]), length(value.length), value]);
}

function length(value) {
  if (value < 0x80) return Buffer.from([value]);
  const bytes = [];
  let current = value;
  while (current > 0) {
    bytes.unshift(current & 0xff);
    current >>= 8;
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

function randomSerial() {
  const serial = crypto.randomBytes(16);
  serial[0] &= 0x7f;
  if (serial.every((value) => value === 0)) serial[0] = 1;
  return serial;
}

function toPem(label, derValue) {
  const base64 = derValue.toString('base64').match(/.{1,64}/g).join('\n');
  return `-----BEGIN ${label}-----\n${base64}\n-----END ${label}-----\n`;
}

function ipv4Bytes(value) {
  const parts = value.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    throw new Error(`Only IPv4 SAN values are supported: ${value}`);
  }
  return Buffer.from(parts);
}

function getLanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((entry) => entry && entry.family === 'IPv4' && !entry.internal)
    .map((entry) => entry.address);
}

function unique(values) {
  return [...new Set(values)];
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function two(value) {
  return String(value).padStart(2, '0');
}

function formatUtcTime(date) {
  return `${two(date.getUTCFullYear() % 100)}${two(date.getUTCMonth() + 1)}${two(date.getUTCDate())}${two(
    date.getUTCHours()
  )}${two(date.getUTCMinutes())}${two(date.getUTCSeconds())}Z`;
}

function formatGeneralizedTime(date) {
  return `${date.getUTCFullYear()}${two(date.getUTCMonth() + 1)}${two(date.getUTCDate())}${two(
    date.getUTCHours()
  )}${two(date.getUTCMinutes())}${two(date.getUTCSeconds())}Z`;
}
