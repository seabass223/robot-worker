const plain = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const finite = (value, min = -1e5, max = 1e5) => Number.isFinite(value) && value >= min && value <= max;
const vector = value => plain(value) && ['x', 'y', 'z'].every(key => finite(value[key]));
const color = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const primitiveKinds = new Set(['box', 'sphere', 'cylinder', 'cone', 'torus']);
const exactKeys = (value, allowed) => plain(value) && Object.keys(value).every(key => allowed.includes(key));
const dimension = (value, fallback) => value === undefined ? fallback : finite(value, 0.001, 100) ? value : null;
const segments = (value, fallback, minimum) => value === undefined ? fallback : Number.isSafeInteger(value) && value >= minimum && value <= 256 ? value : null;

function normalizeTransform(value = {}) {
  if (!plain(value)) return null;
  const result = {};
  if (value.position !== undefined) { if (!vector(value.position) || ['x', 'y', 'z'].some(key => Math.abs(value.position[key]) > 10)) return null; result.position = value.position; }
  if (value.rotation !== undefined) { if (!vector(value.rotation) || ['x', 'y', 'z'].some(key => Math.abs(value.rotation[key]) > Math.PI * 2)) return null; result.rotation = value.rotation; }
  if (value.scale !== undefined) { if (!vector(value.scale) || ['x', 'y', 'z'].some(key => Math.abs(value.scale[key]) < 0.001 || Math.abs(value.scale[key]) > 8)) return null; result.scale = value.scale; }
  return result;
}

function normalizeMaterial(value) {
  if (!plain(value) || value.type !== 'standard' || !color(value.color || '')) return null;
  const material = { type: 'standard', color: value.color.toLowerCase() };
  for (const key of ['roughness', 'metalness', 'opacity', 'emissiveIntensity']) {
    if (value[key] === undefined) continue;
    const max = key === 'emissiveIntensity' ? 20 : 1;
    if (!finite(value[key], 0, max)) return null;
    material[key] = value[key];
  }
  if (value.emissive !== undefined) { if (!color(value.emissive)) return null; material.emissive = value.emissive.toLowerCase(); }
  return material;
}

function normalizePrimitive(value) {
  const params = value.params === undefined ? {} : value.params;
  if (!plain(params)) return null;
  if (value.kind === 'box') {
    if (!exactKeys(params, ['width', 'height', 'depth', 'widthSegments', 'heightSegments', 'depthSegments'])) return null;
    const width = dimension(params.width, 1), height = dimension(params.height, 1), depth = dimension(params.depth, 1);
    const widthSegments = segments(params.widthSegments, 1, 1), heightSegments = segments(params.heightSegments, 1, 1), depthSegments = segments(params.depthSegments, 1, 1);
    if ([width, height, depth, widthSegments, heightSegments, depthSegments].includes(null)) return null;
    return { params: { width, height, depth, widthSegments, heightSegments, depthSegments }, triangles: 4 * (widthSegments * heightSegments + widthSegments * depthSegments + heightSegments * depthSegments) };
  }
  if (value.kind === 'sphere') {
    if (!exactKeys(params, ['radius', 'widthSegments', 'heightSegments'])) return null;
    const radius = dimension(params.radius, 0.5), widthSegments = segments(params.widthSegments, 24, 3), heightSegments = segments(params.heightSegments, 16, 2);
    if ([radius, widthSegments, heightSegments].includes(null)) return null;
    return { params: { radius, widthSegments, heightSegments }, triangles: 2 * widthSegments * (heightSegments - 1) };
  }
  if (value.kind === 'cylinder' || value.kind === 'cone') {
    const allowed = value.kind === 'cylinder'
      ? ['radiusTop', 'radiusBottom', 'height', 'radialSegments', 'heightSegments', 'openEnded']
      : ['radius', 'height', 'radialSegments', 'heightSegments', 'openEnded'];
    if (!exactKeys(params, allowed) || (params.openEnded !== undefined && typeof params.openEnded !== 'boolean')) return null;
    const radialSegments = segments(params.radialSegments, 24, 3), heightSegments = segments(params.heightSegments, 1, 1);
    const height = dimension(params.height, 1);
    const openEnded = params.openEnded === true;
    if ([radialSegments, heightSegments, height].includes(null)) return null;
    if (value.kind === 'cone') {
      const radius = dimension(params.radius, 0.5);
      if (radius === null) return null;
      return { params: { radius, height, radialSegments, heightSegments, openEnded }, triangles: 2 * radialSegments * heightSegments + (openEnded ? 0 : radialSegments) };
    }
    const radiusTop = dimension(params.radiusTop, 0.5), radiusBottom = dimension(params.radiusBottom, 0.5);
    if ([radiusTop, radiusBottom].includes(null)) return null;
    const capCount = openEnded ? 0 : Number(radiusTop > 0) + Number(radiusBottom > 0);
    return { params: { radiusTop, radiusBottom, height, radialSegments, heightSegments, openEnded }, triangles: 2 * radialSegments * heightSegments + capCount * radialSegments };
  }
  if (value.kind === 'torus') {
    if (!exactKeys(params, ['radius', 'tube', 'radialSegments', 'tubularSegments'])) return null;
    const radius = dimension(params.radius, 0.5), tube = dimension(params.tube, 0.16);
    const radialSegments = segments(params.radialSegments, 12, 3), tubularSegments = segments(params.tubularSegments, 32, 3);
    if ([radius, tube, radialSegments, tubularSegments].includes(null)) return null;
    return { params: { radius, tube, radialSegments, tubularSegments }, triangles: 2 * radialSegments * tubularSegments };
  }
  return null;
}

function normalizeGeometry(value, budget, context) {
  if (!plain(value) || typeof value.kind !== 'string') return null;
  if (primitiveKinds.has(value.kind)) {
    const primitive = normalizePrimitive(value);
    if (!primitive) return null;
    budget.triangles += primitive.triangles;
    budget.gpuBytes += primitive.triangles * 3 * 32;
    const p = primitive.params;
    const extent = value.kind === 'box' ? Math.hypot(p.width, p.height, p.depth) / 2
      : value.kind === 'sphere' ? p.radius
        : value.kind === 'torus' ? p.radius + p.tube
          : Math.hypot(Math.max(p.radius ?? p.radiusTop ?? 0, p.radiusBottom ?? 0), p.height / 2);
    if (budget.gpuBytes > 32 * 1024 * 1024 || context.distance + extent * context.scale > 100) return null;
    return { kind: value.kind, params: primitive.params };
  }
  if (value.kind !== 'buffer' || !Array.isArray(value.positions) || value.positions.length < 9 || value.positions.length % 3) return null;
  if (value.positions.length > 900000 || value.positions.some(item => !finite(item))) return null;
  const indices = value.indices;
  if (indices !== undefined && (!Array.isArray(indices) || indices.length < 3 || indices.length % 3 || indices.length > 900000 || indices.some(item => !Number.isSafeInteger(item) || item < 0 || item >= value.positions.length / 3))) return null;
  const vertexCount = value.positions.length / 3;
  if (indices && new Set(indices).size !== vertexCount) return null;
  const normals = Array.isArray(value.normals) && value.normals.length === value.positions.length && value.normals.every(item => finite(item)) ? value.normals : null;
  const uvs = Array.isArray(value.uvs) && value.uvs.length === vertexCount * 2 && value.uvs.every(item => finite(item)) ? value.uvs : null;
  let extent = 0;
  for (let index = 0; index < value.positions.length; index += 3) {
    extent = Math.max(extent, Math.hypot(value.positions[index], value.positions[index + 1], value.positions[index + 2]));
  }
  budget.vertices += vertexCount;
  budget.indices += indices?.length || 0;
  budget.gpuBytes += value.positions.length * 4 + (normals?.length || 0) * 4 + (uvs?.length || 0) * 4 + (indices?.length || 0) * 4;
  if (budget.vertices > 300_000 || budget.indices > 900_000 || budget.gpuBytes > 32 * 1024 * 1024 || context.distance + extent * context.scale > 100) return null;
  budget.triangles += indices ? indices.length / 3 : value.positions.length / 9;
  const result = { kind: 'buffer', positions: value.positions };
  if (indices) result.indices = indices;
  if (normals) result.normals = normals;
  if (uvs) result.uvs = uvs;
  return result;
}

function normalizeNode(value, budget, depth = 0, context = { scale: 1, distance: 0 }) {
  if (!plain(value) || depth > 16 || !['group', 'mesh'].includes(value.kind)) return null;
  budget.nodes += 1;
  if (budget.nodes > 1024) return null;
  const node = { kind: value.kind, name: typeof value.name === 'string' ? value.name.slice(0, 120) : '' };
  const transform = normalizeTransform(value.transform);
  if (!transform) return null;
  const positionMagnitude = transform.position ? Math.hypot(transform.position.x, transform.position.y, transform.position.z) : 0;
  const localScale = transform.scale ? Math.max(...Object.values(transform.scale).map(Math.abs)) : 1;
  const nextContext = { scale: context.scale * localScale, distance: context.distance + positionMagnitude * context.scale };
  if (nextContext.scale > 64 || nextContext.distance > 100) return null;
  node.transform = transform;
  if (value.kind === 'mesh') {
    const geometry = normalizeGeometry(value.geometry, budget, nextContext);
    const material = normalizeMaterial(value.material);
    if (!geometry || !material || budget.triangles > 300000) return null;
    node.geometry = geometry;
    node.material = material;
  }
  const children = value.children === undefined ? [] : value.children;
  if (!Array.isArray(children) || children.length > 256) return null;
  node.children = [];
  for (const child of children) {
    const normalized = normalizeNode(child, budget, depth + 1, nextContext);
    if (!normalized) return null;
    node.children.push(normalized);
  }
  return node;
}

export function normalizeRoomAsset(value) {
  if (!plain(value) || value.schema !== 'room-asset/v1' || !Array.isArray(value.nodes) || value.nodes.length < 1 || value.nodes.length > 256) return null;
  const budget = { nodes: 0, triangles: 0, vertices: 0, indices: 0, gpuBytes: 0 };
  const nodes = [];
  for (const source of value.nodes) {
    const node = normalizeNode(source, budget);
    if (!node || budget.triangles > 300000) return null;
    nodes.push(node);
  }
  return { schema: 'room-asset/v1', name: typeof value.name === 'string' ? value.name.slice(0, 120) : 'GeneratedAsset', nodes, stats: { nodes: budget.nodes, estimatedTriangles: Math.ceil(budget.triangles), vertices: budget.vertices, indices: budget.indices, estimatedGpuBytes: budget.gpuBytes } };
}
