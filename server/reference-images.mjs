import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { lookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { normalizeReferenceImageUrl } from './editor-contract.mjs';

const execFileAsync = promisify(execFile);
const VERIFY_IMAGE_SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'verify-reference-image.py');

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const MIME_EXTENSIONS = new Map([
  ['image/png', '.png'], ['image/jpeg', '.jpg']
]);

const rejection = message => Object.assign(new Error(message), { publicCode: 'REFERENCE_IMAGE_REJECTED' });
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

const CRC_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  return crc >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngDimensions(body) {
  if (body.length < 45 || !body.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  let offset = 8;
  let dimensions = null;
  let sawIdat = false;
  let chunkIndex = 0;
  while (offset + 12 <= body.length) {
    const length = body.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > body.length) return null;
    const type = body.subarray(offset + 4, offset + 8).toString('ascii');
    const expectedCrc = body.readUInt32BE(offset + 8 + length);
    if (crc32(body.subarray(offset + 4, offset + 8 + length)) !== expectedCrc) return null;
    if (chunkIndex === 0) {
      if (type !== 'IHDR' || length !== 13) return null;
      dimensions = [body.readUInt32BE(offset + 8), body.readUInt32BE(offset + 12)];
    } else if (type === 'IHDR') return null;
    if (type === 'IDAT') sawIdat = true;
    if (type === 'IEND') return length === 0 && sawIdat && end === body.length ? dimensions : null;
    offset = end;
    chunkIndex += 1;
  }
  return null;
}

function jpegDimensions(body) {
  if (body.length < 12 || body[0] !== 0xff || body[1] !== 0xd8) return null;
  let offset = 2;
  let dimensions = null;
  let sawScan = false;
  let inScan = false;
  while (offset < body.length) {
    if (inScan) {
      if (body[offset] !== 0xff) { offset += 1; continue; }
      while (offset < body.length && body[offset] === 0xff) offset += 1;
      if (offset >= body.length) return null;
      const marker = body[offset];
      if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 1; continue; }
      offset -= 1;
      inScan = false;
      continue;
    }
    if (body[offset] !== 0xff) return null;
    while (offset < body.length && body[offset] === 0xff) offset += 1;
    if (offset >= body.length) return null;
    const marker = body[offset++];
    if (marker === 0xd9) return sawScan && dimensions && offset === body.length ? dimensions : null;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > body.length) return null;
    const length = body.readUInt16BE(offset);
    if (length < 2 || offset + length > body.length) return null;
    if (JPEG_SOF_MARKERS.has(marker)) {
      if (length < 8) return null;
      dimensions = [body.readUInt16BE(offset + 5), body.readUInt16BE(offset + 3)];
    }
    if (marker === 0xda) { sawScan = true; inScan = true; }
    offset += length;
  }
  return null;
}

function imageDimensions(body, contentType) {
  if (contentType === 'image/png') return pngDimensions(body);
  if (contentType === 'image/jpeg') return jpegDimensions(body);
  return null;
}

export function validateReferenceImageDimensions(body, contentType) {
  const dimensions = imageDimensions(body, contentType);
  if (!dimensions) throw rejection('Reference image dimensions could not be verified');
  const [width, height] = dimensions;
  if (!width || !height || width > 8192 || height > 8192 || width * height > 40_000_000) throw rejection('Reference image dimensions exceed the safety limit');
}

async function verifyDecodedImage(path, contentType, signal) {
  try {
    await execFileAsync(process.env.ROOM_EDITOR_PYTHON || 'python', [VERIFY_IMAGE_SCRIPT, path, contentType], {
      signal, timeout: 20_000, windowsHide: true, maxBuffer: 64 * 1024
    });
  } catch {
    throw rejection('Reference image decoder verification failed');
  }
}

export function isPublicReferenceIpv4(address) {
  const parts = String(address).split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 168 || (b === 0 && [0, 2].includes(c)) || (b === 88 && c === 99))) return false;
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

async function pinnedAddress(hostname) {
  const addresses = await lookup(hostname, { all: true, family: 4, verbatim: true });
  const publicAddresses = addresses.map(item => item.address).filter(isPublicReferenceIpv4);
  if (!publicAddresses.length || publicAddresses.length !== addresses.length) throw rejection('Reference host did not resolve exclusively to public IPv4 addresses');
  return publicAddresses[0];
}

function readPinned(url, address, signal) {
  return new Promise((resolve, reject) => {
    const request = httpsRequest(url, {
      method: 'GET', signal, servername: url.hostname, family: 4, autoSelectFamily: false,
      headers: { Accept: 'image/png,image/jpeg', 'User-Agent': 'room-editor-reference-fetcher/1' },
      lookup: (_hostname, _options, callback) => callback(null, address, 4)
    }, response => resolve(response));
    request.setTimeout(15_000, () => request.destroy(rejection('Reference image request timed out')));
    request.once('error', reject);
    request.end();
  });
}

async function fetchImage(urlValue, signal, redirects = 0) {
  const normalized = normalizeReferenceImageUrl(urlValue);
  if (!normalized) throw rejection('Reference image URL is not trusted');
  const url = new URL(normalized);
  const address = await pinnedAddress(url.hostname);
  const response = await readPinned(url, address, signal);
  if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
    response.resume();
    if (redirects >= MAX_REDIRECTS || !response.headers.location) throw rejection('Reference image redirect policy rejected the response');
    return fetchImage(new URL(response.headers.location, url).href, signal, redirects + 1);
  }
  if (response.statusCode !== 200) {
    response.resume();
    throw rejection(`Reference image returned HTTP ${response.statusCode}`);
  }
  const contentType = String(response.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase();
  if (!MIME_EXTENSIONS.has(contentType)) {
    response.resume();
    throw rejection('Reference response is not an approved image type');
  }
  const declared = Number(response.headers['content-length'] || 0);
  if (declared > MAX_IMAGE_BYTES) {
    response.destroy();
    throw rejection('Reference image exceeds the size limit');
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of response) {
    bytes += chunk.length;
    if (bytes > MAX_IMAGE_BYTES) {
      response.destroy();
      throw rejection('Reference image exceeds the size limit');
    }
    chunks.push(chunk);
  }
  if (!bytes) throw rejection('Reference image is empty');
  const body = Buffer.concat(chunks);
  validateReferenceImageDimensions(body, contentType);
  return { body, contentType };
}

export async function materializeReferenceImages(attachments, { signal } = {}) {
  if (!attachments?.length) return { attachments: [], cleanup: async () => {} };
  const directory = join(tmpdir(), 'room-editor-reference-images');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const paths = [];
  const localized = [];
  let totalBytes = 0;
  try {
    for (const attachment of attachments) {
      const { body, contentType } = await fetchImage(attachment.url, signal);
      totalBytes += body.length;
      if (totalBytes > MAX_TOTAL_BYTES) throw rejection('Combined reference images exceed the size limit');
      const digest = createHash('sha256').update(body).digest('hex');
      const path = join(directory, `${randomUUID()}${MIME_EXTENSIONS.get(contentType)}`);
      await writeFile(path, body, { flag: 'wx', mode: 0o600 });
      paths.push(path);
      await verifyDecodedImage(path, contentType, signal);
      localized.push({ kind: attachment.kind, attachmentId: basename(path), contentType, bytes: body.length, sha256: digest });
    }
    return {
      attachments: localized,
      cleanup: async () => { await Promise.allSettled(paths.map(path => unlink(path))); }
    };
  } catch (error) {
    await Promise.allSettled(paths.map(path => unlink(path)));
    throw error;
  }
}
