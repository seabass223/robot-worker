import { isIP } from 'node:net';
import { normalizeRoomAsset } from './asset-contract.mjs';

const ROUTES = new Set([
  'direct-editor-plan',
  'source-geometry-patch',
  'img2threejs',
  'orthographic-img2threejs',
  'clarify',
  'explain',
  'future-skill'
]);
const CAPABILITIES = new Set([
  'material-patch', 'transform-patch', 'geometry-replacement',
  'source-patch', 'image-reconstruction', 'generated-reference'
]);
const OPERATION_TYPES = new Set([
  'set-material-color', 'set-material-properties', 'translate', 'rotate', 'set-uniform-scale'
]);
const ATTACHMENT_KINDS = new Set(['reference-image', 'source-image', 'orthographic-reference']);
const DEFAULT_REFERENCE_HOSTS = new Set([
  'images.unsplash.com', 'raw.githubusercontent.com', 'user-images.githubusercontent.com',
  'media.githubusercontent.com', 'cdn.discordapp.com', 'media.discordapp.net', 'i.imgur.com', 'fal.media'
]);

const plain = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const bounded = (value, max) => typeof value === 'string' && Boolean(value.trim()) && value.length <= max;
const finiteVector = value => plain(value) && ['x', 'y', 'z'].every(key => Number.isFinite(value[key]));
const exactKeys = (value, allowed) => plain(value) && Object.keys(value).every(key => allowed.includes(key));

export function normalizeReferenceImageUrl(value) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) return null;
    const configuredHosts = String(process.env.ROOM_EDITOR_REFERENCE_IMAGE_HOSTS || '')
      .split(',').map(item => item.trim().toLowerCase()).filter(Boolean);
    const trustedHosts = new Set([...DEFAULT_REFERENCE_HOSTS, ...configuredHosts]);
    if (!trustedHosts.has(hostname)) return null;
    const ipVersion = isIP(hostname);
    if (ipVersion === 6) return null;
    if (ipVersion === 4) {
      const [a, b] = hostname.split('.').map(Number);
      if (a === 0 || a === 10 || a === 127 || a >= 224
        || (a === 100 && b >= 64 && b <= 127)
        || (a === 169 && b === 254)
        || (a === 172 && b >= 16 && b <= 31)
        || (a === 192 && b === 168)
        || (a === 198 && (b === 18 || b === 19))) return null;
    }
    return parsed.href.slice(0, 2048);
  } catch { return null; }
}

export function normalizeEditorRequest(value) {
  if (!exactKeys(value, ['schemaVersion', 'requestId', 'conversationId', 'message', 'selection', 'capabilities', 'attachments'])) return null;
  if (value.schemaVersion !== 1 || !bounded(value.requestId, 128) || !bounded(value.conversationId, 128) || !bounded(value.message, 4000)) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(value.requestId) || !/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(value.conversationId)) return null;
  const selection = value.selection;
  if (!exactKeys(selection, ['semanticId', 'selectionToken', 'selectionRevision', 'sceneRevision', 'transform', 'bounds', 'metadata'])) return null;
  if (!bounded(selection.semanticId, 160) || !Number.isSafeInteger(selection.selectionRevision) || selection.selectionRevision < 0) return null;
  if (!Number.isSafeInteger(selection.sceneRevision) || selection.sceneRevision < 0) return null;
  if (selection.selectionToken !== undefined && !bounded(selection.selectionToken, 160)) return null;
  if (!plain(selection.transform) || !finiteVector(selection.transform.position) || !finiteVector(selection.transform.rotation) || !finiteVector(selection.transform.scale)) return null;
  if (selection.bounds !== undefined && (!plain(selection.bounds) || !finiteVector(selection.bounds.size))) return null;
  if (selection.metadata !== undefined && (!plain(selection.metadata) || JSON.stringify(selection.metadata).length > 8192)) return null;
  if (!Array.isArray(value.capabilities) || value.capabilities.length > 16 || value.capabilities.some(item => !CAPABILITIES.has(item))) return null;
  if (!Array.isArray(value.attachments) || value.attachments.length > 4) return null;
  const attachments = value.attachments.map(item => plain(item) && bounded(item.kind, 32) && ATTACHMENT_KINDS.has(item.kind.trim())
    ? { kind: item.kind.trim(), url: normalizeReferenceImageUrl(item.url) }
    : null);
  if (attachments.some(item => !item || !item.url)) return null;
  return {
    schemaVersion: 1,
    requestId: value.requestId.trim(),
    conversationId: value.conversationId.trim(),
    message: value.message.trim(),
    selection: {
      semanticId: selection.semanticId.trim(),
      selectionToken: selection.selectionToken?.trim() || null,
      selectionRevision: selection.selectionRevision,
      sceneRevision: selection.sceneRevision,
      transform: selection.transform,
      bounds: selection.bounds || null,
      metadata: selection.metadata || {}
    },
    capabilities: [...new Set(value.capabilities)],
    attachments
  };
}

function normalizeOperation(value) {
  if (!plain(value) || !OPERATION_TYPES.has(value.type)) return null;
  if (value.type === 'set-material-color' && /^#[0-9a-f]{6}$/i.test(value.color || '')) return { type: value.type, color: value.color.toLowerCase() };
  if (value.type === 'set-material-properties') {
    const operation = { type: value.type };
    if (value.color !== undefined && !/^#[0-9a-f]{6}$/i.test(value.color)) return null;
    if (value.roughness !== undefined && (!Number.isFinite(value.roughness) || value.roughness < 0 || value.roughness > 1)) return null;
    if (value.metalness !== undefined && (!Number.isFinite(value.metalness) || value.metalness < 0 || value.metalness > 1)) return null;
    if (value.color !== undefined) operation.color = value.color.toLowerCase();
    if (value.roughness !== undefined) operation.roughness = value.roughness;
    if (value.metalness !== undefined) operation.metalness = value.metalness;
    return Object.keys(operation).length > 1 ? operation : null;
  }
  if (value.type === 'translate' && finiteVector(value.delta)
    && ['x', 'y', 'z'].every(key => Math.abs(value.delta[key]) <= 10)) return { type: value.type, delta: value.delta };
  if (value.type === 'rotate' && finiteVector(value.delta)
    && ['x', 'y', 'z'].every(key => Math.abs(value.delta[key]) <= Math.PI * 2)) return { type: value.type, delta: value.delta };
  if (value.type === 'set-uniform-scale' && Number.isFinite(value.scale) && value.scale >= 0.05 && value.scale <= 8) return { type: value.type, scale: value.scale };
  return null;
}

export function normalizeEditorResult(value) {
  if (!plain(value) || value.schemaVersion !== 1 || !ROUTES.has(value.route) || !bounded(value.summary, 800)) return null;
  if (value.kind === 'editor-plan') {
    if (value.route !== 'direct-editor-plan') return null;
    if (!Array.isArray(value.operations) || value.operations.length < 1 || value.operations.length > 20) return null;
    const operations = value.operations.map(normalizeOperation);
    if (operations.some(operation => !operation)) return null;
    const translation = { x: 0, y: 0, z: 0 };
    const rotation = { x: 0, y: 0, z: 0 };
    for (const operation of operations) {
      if (operation.type === 'translate') for (const axis of ['x', 'y', 'z']) translation[axis] += operation.delta[axis];
      if (operation.type === 'rotate') for (const axis of ['x', 'y', 'z']) rotation[axis] += operation.delta[axis];
    }
    if (['x', 'y', 'z'].some(axis => Math.abs(translation[axis]) > 10 || Math.abs(rotation[axis]) > Math.PI * 2)) return null;
    return { schemaVersion: 1, kind: 'editor-plan', route: value.route, summary: value.summary.trim(), requiresConfirmation: value.requiresConfirmation !== false, operations };
  }
  if (value.kind === 'skill-proposal') {
    if (!['img2threejs', 'orthographic-img2threejs'].includes(value.skill) || value.route !== value.skill) return null;
    return { schemaVersion: 1, kind: 'skill-proposal', route: value.route, skill: value.skill, summary: value.summary.trim(), requiresConfirmation: true };
  }
  if (value.kind === 'asset-revision') {
    const asset = normalizeRoomAsset(value.asset);
    if (!asset || !['img2threejs', 'orthographic-img2threejs'].includes(value.route)) return null;
    return { schemaVersion: 1, kind: 'asset-revision', route: value.route, summary: value.summary.trim(), requiresConfirmation: true, asset };
  }
  if (value.kind === 'clarification' && value.route === 'clarify' && bounded(value.question, 800)) {
    return { schemaVersion: 1, kind: 'clarification', route: value.route, summary: value.summary.trim(), question: value.question.trim(), requiresConfirmation: false };
  }
  if (value.kind === 'message' && value.route === 'explain') return { schemaVersion: 1, kind: 'message', route: value.route, summary: value.summary.trim(), requiresConfirmation: false };
  return null;
}

export function fakeSpecialistResult(proposal) {
  return normalizeEditorResult({
    schemaVersion: 1,
    kind: 'asset-revision',
    route: proposal.route,
    summary: 'Generated and validated a replacement visual asset through the specialist reconstruction pipeline.',
    asset: {
      schema: 'room-asset/v1',
      name: 'SpecialistReplacement',
      nodes: [{
        kind: 'group', name: 'GeneratedVisual', children: [
          { kind: 'mesh', name: 'GeneratedCore', geometry: { kind: 'box', params: { width: 1, height: 1.2, depth: 1 } }, material: { type: 'standard', color: '#577d9a', roughness: 0.58, metalness: 0.08 } },
          { kind: 'mesh', name: 'GeneratedDetail', transform: { position: { x: 0, y: 0.8, z: 0 } }, geometry: { kind: 'sphere', params: { radius: 0.42, widthSegments: 24, heightSegments: 16 } }, material: { type: 'standard', color: '#7db4ce', roughness: 0.42, metalness: 0.04 } }
        ]
      }]
    }
  });
}

export function fakeHermesResult(request) {
  if (/replace|different|rebuild|higher[ -]quality|new geometry|reconstruct/i.test(request.message)) {
    const hasReference = request.attachments.some(item => item.kind === 'reference-image');
    return normalizeEditorResult({
      schemaVersion: 1,
      kind: 'skill-proposal',
      route: hasReference ? 'img2threejs' : 'orthographic-img2threejs',
      skill: hasReference ? 'img2threejs' : 'orthographic-img2threejs',
      summary: hasReference ? 'Reconstruct the selected asset from the supplied reference.' : 'Design reconstruction views, then rebuild the selected asset through img2threejs.'
    });
  }
  return normalizeEditorResult({
    schemaVersion: 1,
    kind: 'editor-plan',
    route: 'direct-editor-plan',
    summary: 'Apply a validated material adjustment to the selected semantic root.',
    operations: [{ type: 'set-material-color', color: '#4f8cff' }]
  });
}

export function extractHermesResult(text) {
  const fenced = text.match(/<room-editor-result>\s*([\s\S]*?)\s*<\/room-editor-result>/i);
  const source = fenced?.[1] || text.match(/```json\s*([\s\S]*?)```/i)?.[1] || text;
  try { return normalizeEditorResult(JSON.parse(source.trim())); } catch { return null; }
}
