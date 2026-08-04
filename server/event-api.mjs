import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { createEditorBridge } from './editor-bridge.mjs';

const HOST = process.env.EVENT_API_HOST || '0.0.0.0';
const portFlagIndex = process.argv.indexOf('--port');
const cliPort = portFlagIndex >= 0 ? process.argv[portFlagIndex + 1] : null;
const PORT = Number(cliPort || process.env.EVENT_API_PORT || 8000);
const ALLOWED_PHASES = new Set(['read', 'prepare', 'spec', 'implement', 'validate', 'review', 'submit', 'sync', 'waiting', 'done']);
const clients = new Set();

function normalizedDisplay(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const allowedKeys = new Set(['title', 'lines', 'status', 'accent']);
  const keys = Object.keys(value);
  if (keys.some(key => !allowedKeys.has(key))) return null;
  if (typeof value.title !== 'string' || !value.title.trim() || value.title.length > 40) return null;
  if (!Array.isArray(value.lines) || value.lines.length < 1 || value.lines.length > 4) return null;
  if (value.lines.some(line => typeof line !== 'string' || !line.trim() || line.length > 80)) return null;
  if (value.status !== undefined && (typeof value.status !== 'string' || value.status.length > 32)) return null;
  if (value.accent !== undefined && (typeof value.accent !== 'string' || !/^#[0-9a-f]{6}$/i.test(value.accent))) return null;
  return {
    title: value.title.trim(),
    lines: value.lines.map(line => line.trim()),
    status: value.status?.trim() || 'LIVE',
    accent: value.accent?.toLowerCase() || '#59f3ff'
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value, expected) {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every(key => expected.includes(key));
}

function boundedString(value, maxLength) {
  return typeof value === 'string' && Boolean(value.trim()) && value.length <= maxLength;
}

function isCanonicalUtcTimestamp(value) {
  const match = typeof value === 'string' && value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/);
  if (!match) return false;
  const milliseconds = (match[2] || '').padEnd(3, '0');
  const canonicalInput = `${match[1]}.${milliseconds || '000'}Z`;
  const parsed = Date.parse(canonicalInput);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === canonicalInput;
}

function normalizedActivityStream(value) {
  const topLevelKeys = ['schemaVersion', 'eventId', 'timestampUtc', 'info'];
  const infoKeys = ['ticketId', 'phase', 'phaseState', 'eventType', 'summary', 'metadata'];
  if (!hasExactKeys(value, topLevelKeys) || value.schemaVersion !== 1) return null;
  if (!boundedString(value.eventId, 128) || !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(value.eventId)) return null;
  if (!boundedString(value.timestampUtc, 40) || !isCanonicalUtcTimestamp(value.timestampUtc)) return null;
  if (!hasExactKeys(value.info, infoKeys)) return null;
  if (!boundedString(value.info.ticketId, 64)) return null;
  if (!boundedString(value.info.phase, 40)) return null;
  if (!boundedString(value.info.phaseState, 32)) return null;
  if (!boundedString(value.info.eventType, 80)) return null;
  if (!boundedString(value.info.summary, 96)) return null;
  if (!isPlainObject(value.info.metadata)) return null;
  return {
    schemaVersion: 1,
    eventId: value.eventId.trim(),
    timestampUtc: value.timestampUtc,
    info: {
      ticketId: value.info.ticketId.trim(),
      phase: value.info.phase.trim(),
      phaseState: value.info.phaseState.trim(),
      eventType: value.info.eventType.trim(),
      summary: value.info.summary.trim(),
      metadata: value.info.metadata
    }
  };
}

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

const handleEditorRequest = process.env.ROOM_EDITOR_ENABLED === '1'
  ? createEditorBridge()
  : async () => false;

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (await handleEditorRequest(request, response, url)) return;
  const isEventEndpoint = url.pathname === '/event';
  const isActivityStreamEndpoint = url.pathname === '/activityStream';
  if (!isEventEndpoint && !isActivityStreamEndpoint) {
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

  if (isEventEndpoint && request.method === 'GET' && url.searchParams.get('health') === '1') {
    sendJson(response, 200, { ok: true, endpoint: '/event', clients: clients.size });
    return;
  }

  if (isEventEndpoint && request.method === 'GET') {
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
      if (isActivityStreamEndpoint) {
        const activityStream = normalizedActivityStream(body);
        if (!activityStream) {
          sendJson(response, 422, {
            error: 'Invalid activityStream contract',
            contract: {
              schemaVersion: 1,
              eventId: 'required string, 1-128 chars',
              timestampUtc: 'required ISO-8601 UTC timestamp ending in Z',
              info: {
                ticketId: 'required string, 1-64 chars',
                phase: 'required string, 1-40 chars',
                phaseState: 'required string, 1-32 chars',
                eventType: 'required string, 1-80 chars',
                summary: 'required string, 1-96 chars',
                metadata: 'required JSON object'
              }
            }
          });
          return;
        }
        const event = {
          id: activityStream.eventId,
          activityStream,
          receivedAt: new Date().toISOString()
        };
        const delivered = broadcast(event);
        sendJson(response, 202, { accepted: true, delivered, event });
        return;
      }
      const keys = body && typeof body === 'object' && !Array.isArray(body) ? Object.keys(body) : [];
      const isPhase = keys.length === 1 && keys[0] === 'phase' && ALLOWED_PHASES.has(body.phase);
      const display = keys.length === 1 && keys[0] === 'display' ? normalizedDisplay(body.display) : null;
      if (!isPhase && !display) {
        sendJson(response, 422, {
          error: 'Invalid event contract',
          contract: {
            oneOf: [
              { phase: [...ALLOWED_PHASES] },
              {
                display: {
                  title: 'required string, 1-40 chars',
                  lines: 'required array, 1-4 strings of 1-80 chars',
                  status: 'optional string, max 32 chars',
                  accent: 'optional #RRGGBB'
                }
              }
            ]
          }
        });
        return;
      }

      const event = {
        id: randomUUID(),
        ...(isPhase ? { phase: body.phase } : { display }),
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
  console.log(`Activity stream POST endpoint: http://${HOST}:${PORT}/activityStream`);
  console.log('POST contract: {"phase":"read|prepare|spec|implement|validate|review|submit|sync|waiting|done"}');
  console.log('Display contract: {"display":{"title":"...","lines":["..."],"status":"...","accent":"#59f3ff"}}');
});

function shutdown() {
  clearInterval(heartbeat);
  for (const client of clients) client.end();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
