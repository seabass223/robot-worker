import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { normalizeEditorRequest } from './editor-contract.mjs';
import { runHermesRouter } from './hermes-router.mjs';
import { runHermesSpecialist } from './hermes-specialist.mjs';

const MAX_BODY = 65_536;
const SESSION_HEADER = 'x-room-editor-session';
const PAIRING_HEADER = 'x-room-editor-pairing';
const SESSION_TTL_MS = Math.max(60_000, Number(process.env.ROOM_EDITOR_SESSION_TTL_MS) || 30 * 60_000);
const JOB_TTL_MS = Math.max(60_000, Number(process.env.ROOM_EDITOR_JOB_TTL_MS) || 30 * 60_000);
const MAX_SESSIONS = 100;
const MAX_JOBS = 100;
const MAX_CONCURRENT_JOBS = 3;
const TERMINAL_STATES = new Set(['ready', 'failed', 'cancelled']);

function secureEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

function loopbackRequest(request) {
  const address = String(request.socket?.localAddress || '').toLowerCase();
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function lanEnabled() {
  return process.env.ROOM_EDITOR_LAN_ENABLED === '1';
}

function validPairing(request) {
  const configured = String(process.env.ROOM_EDITOR_PAIRING_CODE || '');
  return configured.length >= 20 && secureEqual(request.headers[PAIRING_HEADER], configured);
}

function requestDigest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function trustedOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const frontendPorts = String(process.env.ROOM_EDITOR_FRONTEND_PORTS || process.env.ROOM_EDITOR_FRONTEND_PORT || '4173,5173')
      .split(',').map(value => value.trim()).filter(Boolean);
    const configured = String(process.env.ROOM_EDITOR_ALLOWED_ORIGINS || '')
      .split(',').map(value => value.trim()).filter(Boolean);
    const defaults = frontendPorts.flatMap(port => [`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
    return parsed.origin === origin && [...defaults, ...configured].includes(parsed.origin);
  } catch { return false; }
}

function corsHeaders(request, extra = {}) {
  const origin = request.headers.origin;
  return {
    ...(origin && trustedOrigin(request) ? { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' } : {}),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Room-Editor-Session, X-Room-Editor-Pairing',
    ...extra
  };
}

function sendJson(request, response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, corsHeaders(request, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store'
  }));
  response.end(payload);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Editor request exceeds 64 KB'), { status: 413 }));
        request.destroy();
      } else chunks.push(chunk);
    });
    request.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(Object.assign(new Error('Body must be valid JSON'), { status: 400 })); }
    });
    request.on('error', reject);
  });
}

function publicJob(job) {
  return {
    jobId: job.jobId,
    requestId: job.request.requestId,
    conversationId: job.request.conversationId,
    semanticId: job.request.selection.semanticId,
    selectionToken: job.request.selection.selectionToken,
    selectionRevision: job.request.selection.selectionRevision,
    sceneRevision: job.request.selection.sceneRevision,
    state: job.state,
    phase: job.phase,
    message: job.message,
    result: job.result || null,
    error: job.error || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  };
}

export function createEditorBridge() {
  const sessions = new Map();
  const jobs = new Map();
  const requestIds = new Map();

  const touch = job => { job.updatedAt = new Date().toISOString(); };
  const current = (job, generation, controller) => job.generation === generation && job.controller === controller && !controller.signal.aborted;
  const requestKey = (owner, requestId) => `${owner}:${requestId}`;

  const prune = () => {
    const now = Date.now();
    const activeOwner = token => [...jobs.values()].some(job => job.owner === token && !TERMINAL_STATES.has(job.state));
    for (const [token, session] of sessions) {
      if (session.expiresAt > now) continue;
      if (activeOwner(token)) session.expiresAt = now + SESSION_TTL_MS;
      else sessions.delete(token);
    }
    for (const [jobId, job] of jobs) {
      if (!TERMINAL_STATES.has(job.state) || now - Date.parse(job.updatedAt) <= JOB_TTL_MS) continue;
      jobs.delete(jobId);
      requestIds.delete(requestKey(job.owner, job.request.requestId));
    }
    while (sessions.size >= MAX_SESSIONS) {
      const evictable = [...sessions.keys()].find(token => !activeOwner(token));
      if (!evictable) break;
      sessions.delete(evictable);
    }
    while (jobs.size >= MAX_JOBS) {
      const oldest = [...jobs.values()].find(job => TERMINAL_STATES.has(job.state));
      if (!oldest) break;
      jobs.delete(oldest.jobId);
      requestIds.delete(requestKey(oldest.owner, oldest.request.requestId));
    }
  };

  const issueSession = () => {
    prune();
    const token = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + SESSION_TTL_MS;
    sessions.set(token, { expiresAt });
    return { token, expiresAt };
  };

  const authorizedToken = request => {
    prune();
    const supplied = String(request.headers[SESSION_HEADER] || '');
    const now = Date.now();
    for (const [token, session] of sessions) {
      if (session.expiresAt > now && secureEqual(supplied, token)) {
        session.expiresAt = now + SESSION_TTL_MS;
        return token;
      }
    }
    return null;
  };

  const ownedJob = (jobId, owner) => {
    const job = jobs.get(jobId);
    return job?.owner === owner ? job : null;
  };

  const run = async (job, generation, controller) => {
    if (!current(job, generation, controller)) return;
    job.state = 'running';
    job.phase = 'routing';
    job.message = 'Routing generic object request';
    touch(job);
    try {
      const result = await runHermesRouter(job.request, {
        signal: controller.signal,
        onProgress: (phase, message) => {
          if (!current(job, generation, controller)) return;
          job.phase = phase;
          job.message = message;
          touch(job);
        }
      });
      if (!current(job, generation, controller)) return;
      job.result = result;
      job.state = 'ready';
      job.phase = 'ready';
      job.message = result.kind === 'editor-plan' ? 'Validated plan ready to apply' : 'Specialist route ready';
      touch(job);
    } catch (error) {
      if (job.generation !== generation || job.controller !== controller) return;
      job.state = error.name === 'AbortError' || controller.signal.aborted ? 'cancelled' : 'failed';
      job.phase = job.state;
      job.message = job.state === 'cancelled' ? 'Job cancelled' : 'Hermes routing failed';
      job.error = {
        code: error.publicCode || (job.state === 'cancelled' ? 'CANCELLED' : 'HERMES_JOB_FAILED'),
        message: String(error.message || 'Unknown editor job failure').slice(0, 600)
      };
      touch(job);
    }
  };

  const runSpecialist = async (job, proposal, generation, controller) => {
    try {
      const result = await runHermesSpecialist(job.request, proposal, {
        signal: controller.signal,
        onProgress: (phase, message) => {
          if (!current(job, generation, controller)) return;
          job.phase = phase;
          job.message = message;
          touch(job);
        },
        onRunStarted: (_runId, stopRemote) => {
          if (current(job, generation, controller)) job.remoteStop = stopRemote;
        }
      });
      job.remoteStop = null;
      if (!current(job, generation, controller)) return;
      job.result = result;
      job.state = 'ready';
      job.phase = 'preview';
      job.message = 'Validated replacement asset ready to preview';
      touch(job);
    } catch (error) {
      if (job.generation !== generation || job.controller !== controller) return;
      if (controller.signal.aborted && job.remoteStop) return;
      job.remoteStop = null;
      job.state = error.name === 'AbortError' || controller.signal.aborted ? 'cancelled' : 'failed';
      job.phase = job.state;
      job.message = job.state === 'cancelled' ? 'Specialist cancelled' : 'Specialist reconstruction failed';
      job.error = {
        code: error.publicCode || (job.state === 'cancelled' ? 'CANCELLED' : 'SPECIALIST_FAILED'),
        message: String(error.message || 'Unknown specialist failure').slice(0, 600),
        ...(error.runId ? { runId: error.runId } : {})
      };
      touch(job);
    }
  };

  return async function handleEditorRequest(request, response, url) {
    if (!url.pathname.startsWith('/editor/')) return false;
    const loopback = loopbackRequest(request);
    if (!loopback && !lanEnabled()) {
      sendJson(request, response, 403, { error: 'Room editor API is loopback-only' });
      return true;
    }
    if (!trustedOrigin(request)) {
      sendJson(request, response, 403, { error: 'Untrusted editor origin' });
      return true;
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204, corsHeaders(request, { 'Access-Control-Max-Age': '600', 'Content-Length': '0' }));
      response.end();
      return true;
    }
    if (url.pathname === '/editor/session' && request.method === 'GET') {
      if (!loopback && !validPairing(request)) {
        sendJson(request, response, 401, { code: 'PAIRING_REQUIRED', error: 'Valid room editor pairing code required' });
        return true;
      }
      const session = issueSession();
      sendJson(request, response, 200, {
        schemaVersion: 1,
        ...session,
        capabilities: ['generic-routing', 'material-patch', 'transform-patch', 'img2threejs', 'orthographic-img2threejs'],
        maxPromptLength: 4000
      });
      return true;
    }
    const owner = authorizedToken(request);
    if (!owner) {
      sendJson(request, response, 401, { error: 'Invalid or expired room editor session' });
      return true;
    }
    if (url.pathname === '/editor/jobs' && request.method === 'POST') {
      if (!String(request.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
        sendJson(request, response, 415, { error: 'Content-Type must be application/json' });
        return true;
      }
      try {
        const normalized = normalizeEditorRequest(await readBody(request));
        if (!normalized) {
          sendJson(request, response, 422, { error: 'Invalid room editor request contract', schemaVersion: 1 });
          return true;
        }
        const key = requestKey(owner, normalized.requestId);
        const digest = requestDigest(normalized);
        const existing = requestIds.get(key);
        if (existing) {
          if (existing.digest !== digest) {
            sendJson(request, response, 409, { error: 'requestId was already used with a different request' });
          } else {
            sendJson(request, response, 200, publicJob(jobs.get(existing.jobId)));
          }
          return true;
        }
        prune();
        const running = [...jobs.values()].filter(job => ['queued', 'running'].includes(job.state)).length;
        if (jobs.size >= MAX_JOBS || running >= MAX_CONCURRENT_JOBS) {
          sendJson(request, response, 429, { error: 'Room editor job capacity reached' });
          return true;
        }
        const controller = new AbortController();
        const job = {
          jobId: randomUUID(), owner, request: normalized,
          state: 'queued', phase: 'queued', message: 'Request accepted',
          controller, generation: 1, specialistStarted: false, remoteStop: null,
          result: null, error: null,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        jobs.set(job.jobId, job);
        requestIds.set(key, { jobId: job.jobId, digest });
        sendJson(request, response, 202, publicJob(job));
        setImmediate(() => run(job, job.generation, controller));
      } catch (error) {
        if (!response.headersSent) sendJson(request, response, error.status || 400, { error: error.message });
      }
      return true;
    }
    const jobMatch = url.pathname.match(/^\/editor\/jobs\/([0-9a-f-]+)$/i);
    if (jobMatch && request.method === 'GET') {
      const job = ownedJob(jobMatch[1], owner);
      sendJson(request, response, job ? 200 : 404, job ? publicJob(job) : { error: 'Editor job not found' });
      return true;
    }
    const executeMatch = url.pathname.match(/^\/editor\/jobs\/([0-9a-f-]+)\/execute$/i);
    if (executeMatch && request.method === 'POST') {
      const job = ownedJob(executeMatch[1], owner);
      if (!job) sendJson(request, response, 404, { error: 'Editor job not found' });
      else if (job.state !== 'ready' || job.result?.kind !== 'skill-proposal' || job.specialistStarted) sendJson(request, response, 409, { error: 'Job is not a pending specialist proposal' });
      else {
        const running = [...jobs.values()].filter(candidate => ['queued', 'running'].includes(candidate.state)).length;
        if (running >= MAX_CONCURRENT_JOBS) {
          sendJson(request, response, 429, { error: 'Room editor specialist capacity reached' });
          return true;
        }
        const proposal = job.result;
        const controller = new AbortController();
        job.specialistStarted = true;
        job.controller = controller;
        job.generation += 1;
        job.state = 'running';
        job.phase = 'specialist';
        job.message = `Starting ${proposal.skill}`;
        job.error = null;
        touch(job);
        const generation = job.generation;
        sendJson(request, response, 202, publicJob(job));
        setImmediate(() => runSpecialist(job, proposal, generation, controller));
      }
      return true;
    }
    const cancelMatch = url.pathname.match(/^\/editor\/jobs\/([0-9a-f-]+)\/cancel$/i);
    if (cancelMatch && request.method === 'POST') {
      const job = ownedJob(cancelMatch[1], owner);
      if (!job) sendJson(request, response, 404, { error: 'Editor job not found' });
      else if (TERMINAL_STATES.has(job.state)) sendJson(request, response, 409, { error: `Job is already ${job.state}` });
      else {
        const stopRemote = job.remoteStop;
        job.controller.abort();
        if (stopRemote) {
          try { await stopRemote(); }
          catch (error) {
            job.generation += 1;
            job.remoteStop = null;
            job.state = 'failed';
            job.phase = 'cancel-failed';
            job.message = 'Could not confirm specialist cancellation';
            job.error = { code: error.publicCode || 'SPECIALIST_STOP_FAILED', message: String(error.message || error).slice(0, 600) };
            touch(job);
            sendJson(request, response, 502, publicJob(job));
            return true;
          }
        }
        job.generation += 1;
        job.remoteStop = null;
        job.state = 'cancelled';
        job.phase = 'cancelled';
        job.message = 'Job cancelled';
        touch(job);
        sendJson(request, response, 202, publicJob(job));
      }
      return true;
    }
    sendJson(request, response, 405, { error: 'Unsupported editor endpoint or method' });
    return true;
  };
}
