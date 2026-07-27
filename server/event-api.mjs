import http from 'node:http';
import { randomUUID } from 'node:crypto';

const HOST = process.env.EVENT_API_HOST || '0.0.0.0';
const portFlagIndex = process.argv.indexOf('--port');
const cliPort = portFlagIndex >= 0 ? process.argv[portFlagIndex + 1] : null;
const PORT = Number(cliPort || process.env.EVENT_API_PORT || 8000);
const ALLOWED_PHASES = new Set(['read', 'prepare', 'spec', 'implement', 'validate', 'review', 'submit', 'sync', 'waiting', 'done']);
const clients = new Set();

function corsHeaders(extra = {}) {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...extra
  };
}

function sendJson(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, corsHeaders({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store'
  }));
  response.end(payload);
}

function broadcast(event) {
  const frame = `id: ${event.id}\nevent: room-event\ndata: ${JSON.stringify(event)}\n\n`;
  let delivered = 0;
  for (const client of clients) {
    if (client.destroyed || client.writableEnded) {
      clients.delete(client);
      continue;
    }
    client.write(frame);
    delivered += 1;
  }
  return delivered;
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > 16_384) {
        reject(Object.assign(new Error('Request body exceeds 16 KB'), { status: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('Body must be valid JSON'), { status: 400 }));
      }
    });
    request.on('error', reject);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname !== '/event') {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204, corsHeaders({
      'Access-Control-Max-Age': '86400',
      'Content-Length': '0'
    }));
    response.end();
    return;
  }

  if (request.method === 'GET' && url.searchParams.get('health') === '1') {
    sendJson(response, 200, { ok: true, endpoint: '/event', clients: clients.size });
    return;
  }

  if (request.method === 'GET') {
    response.writeHead(200, corsHeaders({
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }));
    response.flushHeaders?.();
    response.write('retry: 1000\n: connected\n\n');
    clients.add(response);
    request.on('close', () => clients.delete(response));
    return;
  }

  if (request.method === 'POST') {
    if (!String(request.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
      sendJson(response, 415, { error: 'Content-Type must be application/json' });
      return;
    }

    try {
      const body = await readJsonBody(request);
      const keys = body && typeof body === 'object' && !Array.isArray(body) ? Object.keys(body) : [];
      if (keys.length !== 1 || keys[0] !== 'phase' || !ALLOWED_PHASES.has(body.phase)) {
        sendJson(response, 422, {
          error: 'Invalid event contract',
          contract: { phase: [...ALLOWED_PHASES] }
        });
        return;
      }

      const event = {
        id: randomUUID(),
        phase: body.phase,
        receivedAt: new Date().toISOString()
      };
      const delivered = broadcast(event);
      sendJson(response, 202, { accepted: true, delivered, event });
    } catch (error) {
      if (!response.headersSent) sendJson(response, error.status || 400, { error: error.message });
    }
    return;
  }

  sendJson(response, 405, { error: 'Method not allowed', allow: ['GET', 'POST', 'OPTIONS'] });
});

const heartbeat = setInterval(() => {
  for (const client of clients) {
    if (client.destroyed || client.writableEnded) clients.delete(client);
    else client.write(`: heartbeat ${Date.now()}\n\n`);
  }
}, 15_000);
heartbeat.unref();

server.listen(PORT, HOST, () => {
  console.log(`Room event API listening on http://${HOST}:${PORT}/event`);
  console.log('POST contract: {"phase":"read|prepare|spec|implement|validate|review|submit|sync|waiting|done"}');
});

function shutdown() {
  clearInterval(heartbeat);
  for (const client of clients) client.end();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
