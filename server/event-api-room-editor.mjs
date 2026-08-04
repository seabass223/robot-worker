import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const profileRoot = process.env.HERMES_PROFILE_ROOT
  || join(process.env.LOCALAPPDATA || join(process.env.USERPROFILE || '', 'AppData', 'Local'), 'hermes', 'profiles');

process.env.HERMES_API_BASE_URL ||= 'http://127.0.0.1:8643/v1';
const lanEnabled = process.env.ROOM_EDITOR_LAN_ENABLED === '1';
if (lanEnabled) {
  const pairingCode = String(process.env.ROOM_EDITOR_PAIRING_CODE || '');
  const allowedOrigins = String(process.env.ROOM_EDITOR_ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (pairingCode.length < 20) throw new Error('LAN room editor requires ROOM_EDITOR_PAIRING_CODE with at least 20 characters');
  if (!allowedOrigins.length) throw new Error('LAN room editor requires an explicit ROOM_EDITOR_ALLOWED_ORIGINS value');
  process.env.EVENT_API_HOST = process.env.ROOM_EDITOR_LAN_HOST || '0.0.0.0';
} else {
  process.env.EVENT_API_HOST = '127.0.0.1';
}
process.env.ROOM_EDITOR_ENABLED = '1';
process.env.ROOM_EDITOR_HERMES_KEY_FILE ||= join(profileRoot, 'roomeditorrouter', 'api-server.key');
process.env.ROOM_EDITOR_SPECIALIST_API_BASE_URL ||= 'http://127.0.0.1:8644/v1';
process.env.ROOM_EDITOR_SPECIALIST_KEY_FILE ||= join(profileRoot, 'roomeditorworker', 'api-server.key');
const workerConfigFile = join(profileRoot, 'roomeditorworker', 'config.yaml');
const scopedVisionScript = fileURLToPath(new URL('./scoped-vision-mcp.py', import.meta.url));
const strictYamlScript = fileURLToPath(new URL('./strict-yaml-json.py', import.meta.url));

async function verifyToolsets(label, baseUrl, keyFile, expected) {
  const key = (await readFile(keyFile, 'utf8')).trim();
  if (!key) throw new Error(`${label} API key file is empty`);
  let response;
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetch(`${baseUrl.replace(/\/$/, '')}/toolsets`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(15_000)
      });
      break;
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  if (!response) throw new Error(`${label} toolset preflight could not reach Hermes: ${lastError?.message || 'unknown error'}`);
  if (!response.ok) throw new Error(`${label} toolset preflight returned ${response.status}`);
  const payload = await response.json();
  const enabled = (Array.isArray(payload?.data) ? payload.data : [])
    .filter(toolset => toolset?.enabled)
    .map(toolset => toolset.name)
    .sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(enabled) !== JSON.stringify(wanted)) {
    throw new Error(`${label} API toolsets must be exactly [${wanted.join(', ')}], found [${enabled.join(', ')}]`);
  }
}

async function verifyScopedWorkerMcp(configFile, expectedScript) {
  await readFile(expectedScript, 'utf8');
  await readFile(strictYamlScript, 'utf8');
  let config;
  try {
    const output = execFileSync(process.env.ROOM_EDITOR_PYTHON || 'python', [strictYamlScript, configFile], {
      encoding: 'utf8', timeout: 10_000, maxBuffer: 1024 * 1024, windowsHide: true
    });
    config = JSON.parse(output);
  } catch (error) {
    throw new Error(`Room editor specialist config could not be parsed safely: ${String(error.stderr || error.message || error).trim()}`);
  }
  const servers = config?.mcp_servers;
  const names = servers && typeof servers === 'object' && !Array.isArray(servers) ? Object.keys(servers) : [];
  const scoped = names.length === 1 ? servers[names[0]] : null;
  if (names[0] !== 'room-editor-reference-vision'
    || !scoped || typeof scoped !== 'object' || Array.isArray(scoped)
    || Object.keys(scoped).sort().join(',') !== 'args,command,enabled'
    || scoped.command !== 'python' || scoped.enabled !== true
    || !Array.isArray(scoped.args) || scoped.args.length !== 1 || scoped.args[0] !== expectedScript) {
    throw new Error('Room editor specialist MCP config must contain only the scoped reference-vision server');
  }
}

if (process.env.ROOM_EDITOR_SKIP_HERMES_SANDBOX_CHECK === '1') {
  throw new Error('ROOM_EDITOR_SKIP_HERMES_SANDBOX_CHECK is not permitted by the production room-editor launcher');
}
await verifyScopedWorkerMcp(workerConfigFile, scopedVisionScript);
await verifyToolsets('Room editor router', process.env.HERMES_API_BASE_URL, process.env.ROOM_EDITOR_HERMES_KEY_FILE, []);
await verifyToolsets('Room editor specialist', process.env.ROOM_EDITOR_SPECIALIST_API_BASE_URL, process.env.ROOM_EDITOR_SPECIALIST_KEY_FILE, []);

await import('./event-api.mjs');
