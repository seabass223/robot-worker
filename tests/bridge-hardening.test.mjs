import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runHermesSpecialist } from '../server/hermes-specialist.mjs';
import { createEditorBridge } from '../server/editor-bridge.mjs';

const strictYaml = fileURLToPath(new URL('../server/strict-yaml-json.py', import.meta.url));

async function invokeSession(handler, { pairing, localAddress = '192.168.1.87' } = {}) {
  const request = {
    method: 'GET',
    headers: {
      origin: 'http://192.168.1.87:5173',
      ...(pairing ? { 'x-room-editor-pairing': pairing } : {})
    },
    socket: { localAddress }
  };
  return await new Promise((resolve, reject) => {
    const response = {
      status: 0,
      headers: {},
      writeHead(status, headers) { this.status = status; this.headers = headers; },
      end(body = '') {
        try { resolve({ status: this.status, headers: this.headers, body: body ? JSON.parse(body) : null }); }
        catch (error) { reject(error); }
      }
    };
    Promise.resolve(handler(request, response, new URL('http://bridge/editor/session'))).catch(reject);
  });
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server.address().port;
}

test('LAN session issuance requires pairing while loopback remains directly usable', async () => {
  const previous = Object.fromEntries(['ROOM_EDITOR_LAN_ENABLED', 'ROOM_EDITOR_PAIRING_CODE', 'ROOM_EDITOR_ALLOWED_ORIGINS']
    .map(key => [key, process.env[key]]));
  process.env.ROOM_EDITOR_LAN_ENABLED = '1';
  process.env.ROOM_EDITOR_PAIRING_CODE = 'correct-horse-battery-staple';
  process.env.ROOM_EDITOR_ALLOWED_ORIGINS = 'http://192.168.1.87:5173';
  try {
    const handler = createEditorBridge();
    const missing = await invokeSession(handler);
    assert.equal(missing.status, 401);
    assert.equal(missing.body.code, 'PAIRING_REQUIRED');
    assert.equal((await invokeSession(handler, { pairing: 'wrong-pairing-code' })).status, 401);
    const paired = await invokeSession(handler, { pairing: 'correct-horse-battery-staple' });
    assert.equal(paired.status, 200);
    assert.equal(typeof paired.body.token, 'string');
    assert.ok(paired.body.token.length >= 32);
    assert.equal((await invokeSession(handler, { localAddress: '127.0.0.1' })).status, 200);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('strict YAML parser rejects duplicate keys and multiple documents', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'room-editor-yaml-'));
  try {
    const valid = join(directory, 'valid.yaml');
    await writeFile(valid, 'mcp_servers:\n  scoped:\n    command: python\n');
    assert.deepEqual(JSON.parse(execFileSync('python', [strictYaml, valid], { encoding: 'utf8' })), {
      mcp_servers: { scoped: { command: 'python' } }
    });
    for (const [name, content] of [
      ['duplicate.yaml', 'mcp_servers: {}\n"mcp_servers": { evil: true }\n'],
      ['nested.yaml', 'mcp_servers:\n  scoped:\n    command: python\n    command: evil\n'],
      ['documents.yaml', 'mcp_servers: {}\n---\nmcp_servers: {}\n']
    ]) {
      const path = join(directory, name);
      await writeFile(path, content);
      assert.throws(() => execFileSync('python', [strictYaml, path], { stdio: 'pipe' }));
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('reference decoder accepts a real PNG and rejects forged bytes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'room-editor-image-test-'));
  const imagePath = join(directory, 'valid.png');
  const validator = fileURLToPath(new URL('../server/verify-reference-image.py', import.meta.url));
  try {
    execFileSync('python', ['-c', 'from PIL import Image; import sys; Image.new("RGBA", (2, 2), (1, 2, 3, 255)).save(sys.argv[1], "PNG")', imagePath]);
    assert.doesNotThrow(() => execFileSync('python', [validator, imagePath, 'image/png']));
    await writeFile(imagePath, Buffer.from('not-a-png'));
    assert.throws(() => execFileSync('python', [validator, imagePath, 'image/png'], { stdio: 'pipe' }));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('cancellation during run creation waits for the ID and stops the remote run', async () => {
  let stopCalls = 0;
  const server = createServer((request, response) => {
    response.setHeader('Content-Type', 'application/json');
    if (request.method === 'POST' && request.url === '/v1/runs') {
      request.resume();
      setTimeout(() => response.end(JSON.stringify({ run_id: 'run_creation_race' })), 100);
      return;
    }
    if (request.method === 'POST' && request.url === '/v1/runs/run_creation_race/stop') {
      stopCalls += 1;
      request.resume();
      response.end(JSON.stringify({ status: 'stopped' }));
      return;
    }
    response.statusCode = 404;
    response.end('{}');
  });
  const port = await listen(server);
  const previous = {
    key: process.env.ROOM_EDITOR_SPECIALIST_API_KEY,
    base: process.env.ROOM_EDITOR_SPECIALIST_API_BASE_URL,
    fake: process.env.ROOM_EDITOR_FAKE_HERMES
  };
  process.env.ROOM_EDITOR_SPECIALIST_API_KEY = 'test-key';
  process.env.ROOM_EDITOR_SPECIALIST_API_BASE_URL = `http://127.0.0.1:${port}/v1`;
  delete process.env.ROOM_EDITOR_FAKE_HERMES;
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 20);
  try {
    await assert.rejects(runHermesSpecialist({
      requestId: 'creation-race', conversationId: 'contract', message: 'replace', selection: {}, attachments: []
    }, {
      skill: 'img2threejs', route: 'img2threejs'
    }, { signal: controller.signal }), error => error?.name === 'AbortError');
    assert.equal(stopCalls, 1);
  } finally {
    await new Promise(resolve => server.close(resolve));
    if (previous.key === undefined) delete process.env.ROOM_EDITOR_SPECIALIST_API_KEY;
    else process.env.ROOM_EDITOR_SPECIALIST_API_KEY = previous.key;
    if (previous.base === undefined) delete process.env.ROOM_EDITOR_SPECIALIST_API_BASE_URL;
    else process.env.ROOM_EDITOR_SPECIALIST_API_BASE_URL = previous.base;
    if (previous.fake === undefined) delete process.env.ROOM_EDITOR_FAKE_HERMES;
    else process.env.ROOM_EDITOR_FAKE_HERMES = previous.fake;
  }
});
