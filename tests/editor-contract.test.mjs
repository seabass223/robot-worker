import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { normalizeRoomAsset } from '../server/asset-contract.mjs';
import { normalizeEditorRequest, normalizeEditorResult } from '../server/editor-contract.mjs';
import { isPublicReferenceIpv4, validateReferenceImageDimensions } from '../server/reference-images.mjs';
import { readHermesRouterJson } from '../server/hermes-router.mjs';

const PNG_CRC_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  return crc >>> 0;
});
function pngCrc(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = PNG_CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0); name.copy(chunk, 4); data.copy(chunk, 8);
  chunk.writeUInt32BE(pngCrc(Buffer.concat([name, data])), 8 + data.length);
  return chunk;
}
function pngImage(width, height) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const rows = Buffer.alloc((width * 4 + 1) * height);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header), pngChunk('IDAT', deflateSync(rows)), pngChunk('IEND', Buffer.alloc(0))
  ]);
}

const meshAsset = geometry => ({
  schema: 'room-asset/v1',
  nodes: [{
    kind: 'mesh',
    name: 'Probe',
    geometry,
    material: { type: 'standard', color: '#447799' }
  }]
});

const baseRequest = attachment => ({
  schemaVersion: 1,
  requestId: 'contract-request',
  conversationId: 'contract-conversation',
  message: 'Replace this from the reference.',
  selection: {
    semanticId: 'ContractObject',
    selectionToken: 'selection-token',
    selectionRevision: 1,
    sceneRevision: 2,
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 }
    },
    bounds: { size: { x: 1, y: 1, z: 1 } },
    metadata: {}
  },
  capabilities: ['image-reconstruction'],
  attachments: attachment ? [attachment] : []
});

const plan = operation => ({
  schemaVersion: 1,
  kind: 'editor-plan',
  route: 'direct-editor-plan',
  summary: 'Contract probe.',
  operations: [operation]
});

test('primitive triangle budgets use real segment counts', () => {
  assert.equal(normalizeRoomAsset(meshAsset({ kind: 'sphere', params: { radius: 1, widthSegments: 512, heightSegments: 512 } })), null);
});

test('primitive contracts reject unknown parameters', () => {
  assert.equal(normalizeRoomAsset(meshAsset({ kind: 'box', params: { width: 1, height: 1, depth: 1, surpriseSegments: 512 } })), null);
});

test('editor plans reject extreme and cumulative transform operations', () => {
  assert.equal(normalizeEditorResult(plan({ type: 'translate', delta: { x: 11, y: 0, z: 0 } })), null);
  assert.equal(normalizeEditorResult(plan({ type: 'rotate', delta: { x: 0, y: Math.PI * 3, z: 0 } })), null);
  assert.equal(normalizeEditorResult({ ...plan({ type: 'translate', delta: { x: 6, y: 0, z: 0 } }), operations: [
    { type: 'translate', delta: { x: 6, y: 0, z: 0 } },
    { type: 'translate', delta: { x: 6, y: 0, z: 0 } }
  ] }), null);
});

test('reference downloader permits public IPv4 and rejects private or reserved ranges', () => {
  assert.equal(isPublicReferenceIpv4('8.8.8.8'), true);
  for (const address of ['127.0.0.1', '10.0.0.5', '169.254.1.1', '172.16.0.1', '192.168.1.1', '192.88.99.1', '198.18.0.1', '198.51.100.1', '203.0.113.1', '224.0.0.1']) {
    assert.equal(isPublicReferenceIpv4(address), false, address);
  }
});

test('reference images require a trusted public host', () => {
  assert.ok(normalizeEditorRequest(baseRequest({ kind: 'reference-image', url: 'https://images.unsplash.com/photo.jpg' })));
  assert.equal(normalizeEditorRequest(baseRequest({ kind: 'reference-image', url: 'https://untrusted.example/photo.jpg' })), null);
  assert.equal(normalizeEditorRequest(baseRequest({ kind: 'reference-image', url: 'https://127.0.0.1/photo.jpg' })), null);
});

test('asset contracts reject unreferenced indexed vertices and compounded transforms', () => {
  assert.equal(normalizeRoomAsset(meshAsset({ kind: 'buffer', positions: [0, 0, 0, 1, 0, 0, 0, 1, 0, 9, 9, 9], indices: [0, 1, 2] })), null);
  const nested = { schema: 'room-asset/v1', nodes: [{ kind: 'group', name: 'a', transform: { scale: { x: 8, y: 8, z: 8 } }, children: [{ kind: 'group', name: 'b', transform: { scale: { x: 8, y: 8, z: 8 } }, children: [{ kind: 'mesh', name: 'c', transform: { scale: { x: 2, y: 2, z: 2 } }, geometry: { kind: 'box', params: { width: 1, height: 1, depth: 1 } }, material: { type: 'standard', color: '#ffffff' } }] }] }] };
  assert.equal(normalizeRoomAsset(nested), null);
});

test('result route and kind combinations must agree', () => {
  assert.equal(normalizeEditorResult({ ...plan({ type: 'translate', delta: { x: 1, y: 0, z: 0 } }), route: 'explain' }), null);
  assert.equal(normalizeEditorResult({ schemaVersion: 1, kind: 'skill-proposal', route: 'orthographic-img2threejs', skill: 'img2threejs', summary: 'Mismatch' }), null);
  assert.equal(normalizeEditorResult({ schemaVersion: 1, kind: 'message', route: 'img2threejs', summary: 'Mismatch' }), null);
  assert.equal(normalizeEditorResult({ schemaVersion: 1, kind: 'clarification', route: 'img2threejs', summary: 'Mismatch', question: 'What?' }), null);
});

test('reference image dimensions reject oversized, forged, and unsupported payloads', () => {
  assert.throws(() => validateReferenceImageDimensions(pngImage(9000, 1), 'image/png'), /dimensions exceed/);
  assert.doesNotThrow(() => validateReferenceImageDimensions(pngImage(1, 1), 'image/png'));
  const forgedPng = Buffer.alloc(64);
  forgedPng.write('IHDR', 12, 'ascii');
  forgedPng.writeUInt32BE(1, 16);
  forgedPng.writeUInt32BE(1, 20);
  assert.throws(() => validateReferenceImageDimensions(forgedPng, 'image/png'), /could not be verified/);
  const badCrcPng = pngImage(1, 1);
  badCrcPng[29] ^= 1;
  assert.throws(() => validateReferenceImageDimensions(badCrcPng, 'image/png'), /could not be verified/);
  const forgedJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x08, 0x08, 0x00, 0x01, 0x00, 0x01, 0xff, 0xd9]);
  assert.throws(() => validateReferenceImageDimensions(forgedJpeg, 'image/jpeg'), /could not be verified/);
  assert.throws(() => validateReferenceImageDimensions(Buffer.from('GIF89a'), 'image/gif'), /could not be verified/);
  assert.throws(() => validateReferenceImageDimensions(Buffer.from('RIFFfakeWEBP'), 'image/webp'), /could not be verified/);
  assert.throws(() => validateReferenceImageDimensions(Buffer.from('not-an-image'), 'image/png'), /could not be verified/);
  const forgedAvif = Buffer.alloc(64);
  forgedAvif.write('ispe', 12, 'ascii');
  forgedAvif.writeUInt32BE(1, 20);
  forgedAvif.writeUInt32BE(1, 24);
  assert.throws(() => validateReferenceImageDimensions(forgedAvif, 'image/avif'), /could not be verified/);
});

test('world bounds use rotation-invariant Euclidean radii', () => {
  assert.equal(normalizeRoomAsset(meshAsset({
    kind: 'buffer',
    positions: [80, 80, 0, -80, 80, 0, 0, -80, 0]
  })), null);
});

test('router JSON parsing rejects oversized responses before parsing', async () => {
  const response = new Response(JSON.stringify({ payload: 'x'.repeat(2048) }));
  await assert.rejects(readHermesRouterJson(response, 1024), /exceeds 2 MB/);
});
