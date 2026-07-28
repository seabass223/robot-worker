import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import './style.css';

const canvas = document.querySelector('#scene');
const statusText = document.querySelector('#status-text');
const statusDot = document.querySelector('#status-dot');
const coordinates = document.querySelector('#coordinates');
const workProgress = document.querySelector('#work-progress');
const workLabel = document.querySelector('#work-label');
const workPercent = document.querySelector('#work-percent');
const workProgressFill = document.querySelector('#work-progress-fill');
const vertexCountText = document.querySelector('#vertex-count');
const fpsCountText = document.querySelector('#fps-count');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);
scene.fog = new THREE.Fog(0x0b0d12, 17, 30);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 50);
camera.position.set(9.6, 8.4, 13.2);
camera.lookAt(1.25, 0.75, -0.7);

const room = new THREE.Group();
scene.add(room);

function makeProceduralSurface(kind, size = 512) {
  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  colorCanvas.width = colorCanvas.height = size;
  bumpCanvas.width = bumpCanvas.height = size;
  const colorContext = colorCanvas.getContext('2d');
  const bumpContext = bumpCanvas.getContext('2d');
  let seed = kind === 'floor' ? 0x51f15e : 0x7a11ed;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  if (kind === 'floor') {
    // Warm panel-wood boards with staggered joints, grain, knots, and recessed seams.
    colorContext.fillStyle = '#3a2419';
    colorContext.fillRect(0, 0, size, size);
    bumpContext.fillStyle = '#666666';
    bumpContext.fillRect(0, 0, size, size);
    const rows = 12;
    const plankHeight = size / rows;
    for (let row = 0; row < rows; row++) {
      const top = row * plankHeight;
      const warmth = Math.floor((random() - 0.5) * 18);
      let start = row % 2 ? -90 : -20;
      while (start < size) {
        const width = 145 + random() * 150;
        const red = 99 + warmth + Math.floor(random() * 13);
        const green = 61 + Math.floor(warmth * 0.42) + Math.floor(random() * 9);
        const blue = 38 + Math.floor(random() * 7);
        colorContext.fillStyle = `rgb(${red},${green},${blue})`;
        colorContext.fillRect(start + 2, top + 2, width - 4, plankHeight - 4);
        bumpContext.fillStyle = '#969696';
        bumpContext.fillRect(start + 2, top + 2, width - 4, plankHeight - 4);

        for (let line = 0; line < 7; line++) {
          const gy = top + 6 + random() * (plankHeight - 12);
          colorContext.strokeStyle = random() > 0.5 ? 'rgba(39,20,12,.14)' : 'rgba(220,157,94,.08)';
          colorContext.lineWidth = 0.5 + random() * 0.8;
          colorContext.beginPath();
          colorContext.moveTo(start + 5, gy);
          colorContext.bezierCurveTo(start + width * 0.3, gy + (random() - 0.5) * 5, start + width * 0.7, gy + (random() - 0.5) * 5, start + width - 5, gy);
          colorContext.stroke();
          bumpContext.strokeStyle = 'rgba(105,105,105,.35)';
          bumpContext.lineWidth = 0.7;
          bumpContext.stroke();
        }
        if (random() > 0.52) {
          const knotX = start + 25 + random() * Math.max(20, width - 50);
          const knotY = top + 10 + random() * (plankHeight - 20);
          colorContext.strokeStyle = 'rgba(43,20,11,.34)';
          colorContext.lineWidth = 2;
          colorContext.beginPath();
          colorContext.ellipse(knotX, knotY, 8 + random() * 7, 3 + random() * 3, 0, 0, Math.PI * 2);
          colorContext.stroke();
          bumpContext.strokeStyle = '#727272';
          bumpContext.stroke();
        }
        start += width;
      }
      colorContext.fillStyle = 'rgba(24,15,11,.58)';
      colorContext.fillRect(0, top, size, 2.5);
      bumpContext.fillStyle = '#424242';
      bumpContext.fillRect(0, top, size, 3);
    }
  } else {
    // Staggered cinderblocks: dark mortar, beveled faces, aggregate, and relief in the bump map.
    colorContext.fillStyle = '#454846';
    colorContext.fillRect(0, 0, size, size);
    bumpContext.fillStyle = '#4b4b4b';
    bumpContext.fillRect(0, 0, size, size);
    const blockWidth = 128;
    const blockHeight = 64;
    for (let row = 0; row < size / blockHeight; row++) {
      const offset = row % 2 ? blockWidth / 2 : 0;
      for (let x = -offset; x < size; x += blockWidth) {
        const y = row * blockHeight;
        const value = 104 + Math.floor((random() - 0.5) * 13);
        colorContext.fillStyle = `rgb(${value},${value + 2},${value})`;
        colorContext.fillRect(x + 4, y + 4, blockWidth - 8, blockHeight - 8);
        colorContext.fillStyle = 'rgba(196,199,194,.14)';
        colorContext.fillRect(x + 5, y + 5, blockWidth - 10, 3);
        colorContext.fillRect(x + 5, y + 5, 3, blockHeight - 10);
        colorContext.fillStyle = 'rgba(25,27,26,.18)';
        colorContext.fillRect(x + 5, y + blockHeight - 8, blockWidth - 10, 3);
        colorContext.fillRect(x + blockWidth - 8, y + 5, 3, blockHeight - 10);

        bumpContext.fillStyle = '#a8a8a8';
        bumpContext.fillRect(x + 4, y + 4, blockWidth - 8, blockHeight - 8);
        bumpContext.fillStyle = '#bcbcbc';
        bumpContext.fillRect(x + 6, y + 6, blockWidth - 12, 3);
        bumpContext.fillRect(x + 6, y + 6, 3, blockHeight - 12);
        bumpContext.fillStyle = '#8b8b8b';
        bumpContext.fillRect(x + 6, y + blockHeight - 9, blockWidth - 12, 3);
        bumpContext.fillRect(x + blockWidth - 9, y + 6, 3, blockHeight - 12);

        for (let pit = 0; pit < 32; pit++) {
          const px = x + 9 + random() * (blockWidth - 18);
          const py = y + 9 + random() * (blockHeight - 18);
          const radius = 0.35 + random() * 1.25;
          colorContext.fillStyle = `rgba(35,37,35,${0.08 + random() * 0.16})`;
          colorContext.beginPath();
          colorContext.arc(px, py, radius, 0, Math.PI * 2);
          colorContext.fill();
          bumpContext.fillStyle = '#777777';
          bumpContext.beginPath();
          bumpContext.arc(px, py, radius, 0, Math.PI * 2);
          bumpContext.fill();
        }
      }
    }
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const repeat = kind === 'floor' ? [2, 4] : [4, 2];
  for (const texture of [map, bumpMap]) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(...repeat);
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }
  map.name = `${kind}-procedural-color`;
  bumpMap.name = `${kind}-procedural-bump`;
  return { map, bumpMap, style: kind === 'floor' ? 'panel-wood' : 'cinderblock' };
}

const floorTextures = makeProceduralSurface('floor');
const wallTextures = makeProceduralSurface('wall');
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  map: floorTextures.map,
  bumpMap: floorTextures.bumpMap,
  bumpScale: 0.065,
  roughness: 0.74,
  metalness: 0.015
});
const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
floor.name = 'RaycastFloor';
room.add(floor);

const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  map: wallTextures.map,
  bumpMap: wallTextures.bumpMap,
  bumpScale: 0.12,
  roughness: 0.92,
  metalness: 0.01
});
const backWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), wallMaterial);
backWall.position.set(0, 3.5, -7);
backWall.receiveShadow = true;
room.add(backWall);

const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), wallMaterial.clone());
leftWall.rotation.y = Math.PI / 2;
leftWall.position.set(-7, 3.5, 0);
leftWall.receiveShadow = true;
room.add(leftWall);

const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), wallMaterial.clone());
rightWall.rotation.y = -Math.PI / 2;
rightWall.position.set(7, 3.5, 0);
rightWall.receiveShadow = true;
room.add(rightWall);

function box(size, material, position, parent, name = '') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function rodBetween(start, end, radius, material, parent, name = '') {
  const direction = end.clone().sub(start);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 10), material);
  rod.position.copy(start).add(end).multiplyScalar(0.5);
  rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  rod.castShadow = true;
  rod.receiveShadow = true;
  rod.name = name;
  parent.add(rod);
  return rod;
}

const plantTerracottaMat = new THREE.MeshStandardMaterial({ color: 0xca5c36, roughness: 0.72, metalness: 0, flatShading: true });
const plantTerracottaHighlightMat = new THREE.MeshStandardMaterial({ color: 0xd6663f, roughness: 0.69, metalness: 0, flatShading: true });
const plantInteriorMat = new THREE.MeshStandardMaterial({ color: 0x261b16, roughness: 0.98, metalness: 0, flatShading: true });
const plantLeafMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x628947, roughness: 0.78, metalness: 0, flatShading: true }),
  new THREE.MeshStandardMaterial({ color: 0x789d54, roughness: 0.74, metalness: 0, flatShading: true }),
  new THREE.MeshStandardMaterial({ color: 0x335429, roughness: 0.86, metalness: 0, flatShading: true })
];

function createFacetedLeafGeometry(height, width, thickness, bendX, bendZ) {
  const ringProfile = [
    [0, 0.42, 0.72],
    [0.2, 0.92, 1],
    [0.48, 1, 0.92],
    [0.74, 0.7, 0.68],
    [0.91, 0.32, 0.38]
  ];
  const positions = [];
  for (const [t, widthScale, depthScale] of ringProfile) {
    const curve = 0.18 * t + 0.82 * t * t;
    const cx = bendX * curve;
    const cz = bendZ * curve;
    const halfWidth = width * widthScale * 0.5;
    const halfDepth = thickness * depthScale * 0.5;
    const y = height * t;
    positions.push(
      cx - halfWidth, y, cz,
      cx, y, cz + halfDepth,
      cx + halfWidth, y, cz,
      cx, y, cz - halfDepth
    );
  }
  const tipIndex = positions.length / 3;
  positions.push(bendX, height, bendZ);
  const baseCenterIndex = positions.length / 3;
  positions.push(0, 0, 0);

  const indices = [];
  const groups = [];
  const addTriangle = (a, b, c, materialIndex) => {
    const start = indices.length;
    indices.push(a, b, c);
    groups.push({ start, count: 3, materialIndex });
  };
  for (let ring = 0; ring < ringProfile.length - 1; ring++) {
    for (let side = 0; side < 4; side++) {
      const a = ring * 4 + side;
      const b = ring * 4 + (side + 1) % 4;
      const c = (ring + 1) * 4 + side;
      const d = (ring + 1) * 4 + (side + 1) % 4;
      const materialIndex = [1, 0, 2, 0][side];
      addTriangle(a, b, d, materialIndex);
      addTriangle(a, d, c, materialIndex);
    }
  }
  const lastRing = (ringProfile.length - 1) * 4;
  for (let side = 0; side < 4; side++) {
    addTriangle(lastRing + side, lastRing + (side + 1) % 4, tipIndex, [1, 0, 2, 0][side]);
    addTriangle(baseCenterIndex, (side + 1) % 4, side, 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  for (const group of groups) geometry.addGroup(group.start, group.count, group.materialIndex);
  const faceted = geometry.toNonIndexed();
  faceted.computeVertexNormals();
  geometry.dispose();
  return faceted;
}

function createFacetedTerracottaPlant(name, scale = 1) {
  const plant = new THREE.Group();
  plant.name = name;
  plant.scale.setScalar(scale);

  const potBody = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.32, 0.52, 8, 1, false), plantTerracottaMat);
  potBody.position.y = 0.26;
  potBody.name = 'TaperedOctagonalPotBody';
  plant.add(potBody);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.46, 0.18, 8, 1, false), plantTerracottaHighlightMat);
  rim.position.y = 0.55;
  rim.name = 'ThickOctagonalPotRim';
  plant.add(rim);

  const opening = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.035, 8), plantInteriorMat);
  opening.position.y = 0.655;
  opening.name = 'DarkRecessedOpening';
  plant.add(opening);

  for (const x of [-0.26, 0.26]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.055, 0.18), plantInteriorMat);
    foot.position.set(x, 0.028, 0.03);
    foot.name = 'PotFootNotch';
    plant.add(foot);
  }

  const leafSpecs = [
    { name: 'LeafLeftSweep', height: 1.02, width: 0.5, thickness: 0.13, bendX: -0.52, bendZ: 0.04, x: -0.1, z: 0.01, yaw: -0.12 },
    { name: 'LeafTallCenter', height: 1.13, width: 0.43, thickness: 0.12, bendX: 0.03, bendZ: -0.05, x: 0.02, z: -0.08, yaw: 0.02 },
    { name: 'LeafRearRight', height: 1.03, width: 0.48, thickness: 0.13, bendX: 0.44, bendZ: -0.16, x: 0.08, z: -0.12, yaw: 0.16 },
    { name: 'LeafFrontLeft', height: 0.72, width: 0.47, thickness: 0.13, bendX: -0.28, bendZ: 0.12, x: -0.12, z: 0.14, yaw: -0.13 },
    { name: 'LeafFrontRight', height: 0.79, width: 0.48, thickness: 0.13, bendX: 0.42, bendZ: 0.14, x: 0.12, z: 0.14, yaw: 0.13 }
  ];
  for (const spec of leafSpecs) {
    const leafPivot = new THREE.Group();
    leafPivot.name = `${spec.name}Pivot`;
    leafPivot.position.set(spec.x, 0.61, spec.z);
    leafPivot.rotation.y = spec.yaw;
    const leaf = new THREE.Mesh(
      createFacetedLeafGeometry(spec.height, spec.width, spec.thickness, spec.bendX, spec.bendZ),
      plantLeafMaterials
    );
    leaf.name = spec.name;
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    leafPivot.add(leaf);
    plant.add(leafPivot);
  }

  plant.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  plant.userData.sculptRuntime = {
    model: 'faceted-terracotta-five-leaf',
    leafCount: leafSpecs.length,
    potSides: 8,
    volumetricLeaves: true,
    flatShaded: true
  };
  return plant;
}

// A diagonal industrial stair rises from the room interior into the back-left corner.
const stairwell = new THREE.Group();
stairwell.name = 'LeftStairwell';
scene.add(stairwell);
const STAIR_STEPS = 11;
const STAIR_RISE = 0.27;
const STAIR_RUN = 0.42;
const STAIR_TOP = STAIR_STEPS * STAIR_RISE;
const STAIR_DIRECTION = new THREE.Vector3(-1, 0, 0);
const STAIR_TOP_POINT = new THREE.Vector3(-6.1, STAIR_TOP, 6.15);
const STAIR_BOTTOM_POINT = STAIR_TOP_POINT.clone().addScaledVector(STAIR_DIRECTION, -(STAIR_STEPS - 1) * STAIR_RUN);
const STAIR_SIDE = new THREE.Vector3(0, 0, -1);
const stairYaw = Math.atan2(-STAIR_DIRECTION.x, -STAIR_DIRECTION.z);
const stairBodyMat = new THREE.MeshStandardMaterial({ color: 0x34383a, roughness: 0.82, metalness: 0.16 });
const stairTreadMat = new THREE.MeshStandardMaterial({ color: 0x93672f, roughness: 0.64, metalness: 0.03 });
const railMat = new THREE.MeshStandardMaterial({ color: 0x53395d, roughness: 0.4, metalness: 0.66 });
const doorMat = new THREE.MeshStandardMaterial({ color: 0x421719, roughness: 0.55, metalness: 0.42 });
const doorInsetMat = new THREE.MeshStandardMaterial({ color: 0xa83934, roughness: 0.5, metalness: 0.18 });

const stairTreads = [];
for (let i = 0; i < STAIR_STEPS; i++) {
  const height = STAIR_RISE * (i + 1);
  const center = STAIR_BOTTOM_POINT.clone().addScaledVector(STAIR_DIRECTION, i * STAIR_RUN);
  const riser = box([1.5, height, STAIR_RUN + 0.025], stairBodyMat, [center.x, height / 2, center.z], stairwell, `StairRiser${i + 1}`);
  riser.rotation.y = stairYaw;
  const tread = box([1.54, 0.07, STAIR_RUN + 0.06], stairTreadMat, [center.x, height + 0.035, center.z], stairwell, `StairTread${i + 1}`);
  tread.rotation.y = stairYaw;
  stairTreads.push({ step: i + 1, center: center.clone(), top: height + 0.07, mesh: tread });
}

const LANDING_DEPTH = 0.65;
const landingCenter = new THREE.Vector3(-6.66, STAIR_TOP + 0.04, STAIR_TOP_POINT.z);
box([LANDING_DEPTH, 0.08, 1.54], stairTreadMat, landingCenter.toArray(), stairwell, 'UpperLanding');

// Purple-coded guardrail follows the exposed, room-facing side from bottom to landing.
const railHeight = 0.82;
const railOffset = STAIR_SIDE.clone().multiplyScalar(0.82);
const railPoints = [];
for (let i = 0; i < STAIR_STEPS; i += 2) {
  const stepTop = STAIR_RISE * (i + 1);
  const center = STAIR_BOTTOM_POINT.clone().addScaledVector(STAIR_DIRECTION, i * STAIR_RUN).add(railOffset);
  const base = new THREE.Vector3(center.x, stepTop + 0.05, center.z);
  const top = new THREE.Vector3(center.x, stepTop + railHeight, center.z);
  rodBetween(base, top, 0.027, railMat, stairwell, `RailPost${i + 1}`);
  railPoints.push(top);
}
for (let i = 1; i < railPoints.length; i++) {
  rodBetween(railPoints[i - 1], railPoints[i], 0.037, railMat, stairwell, i === 1 ? 'StairHandrail' : `StairHandrail${i}`);
}

// Red elevated door sits in the left wall beside the upper landing.
const doorBottom = STAIR_TOP;
const doorHeight = 2.24;
const doorZ = 6.12;
const elevatedDoor = box([0.13, doorHeight, 1.16], doorMat, [-6.91, doorBottom + doorHeight / 2, doorZ], stairwell, 'ElevatedDoor');
box([0.025, doorHeight - 0.3, 0.88], doorInsetMat, [-6.83, doorBottom + doorHeight / 2, doorZ], stairwell, 'DoorInset');
const doorCollider = box(
  [0.32, doorHeight + 0.24, 1.5],
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  [-6.72, doorBottom + doorHeight / 2, doorZ],
  stairwell,
  'ElevatedDoorCollider'
);
doorCollider.castShadow = false;
doorCollider.receiveShadow = false;
box([0.16, doorHeight + 0.22, 0.12], railMat, [-6.84, doorBottom + doorHeight / 2, doorZ - 0.65], stairwell, 'DoorFrameA');
box([0.16, doorHeight + 0.22, 0.12], railMat, [-6.84, doorBottom + doorHeight / 2, doorZ + 0.65], stairwell, 'DoorFrameB');
box([0.16, 0.12, 1.42], railMat, [-6.84, doorBottom + doorHeight + 0.05, doorZ], stairwell, 'DoorFrameTop');
const doorHandle = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), new THREE.MeshStandardMaterial({ color: 0xd49b48, roughness: 0.26, metalness: 0.86 }));
doorHandle.position.set(-6.75, doorBottom + doorHeight * 0.48, doorZ + 0.38);
doorHandle.castShadow = true;
doorHandle.name = 'DoorHandle';
stairwell.add(doorHandle);
const stairLight = new THREE.PointLight(0xff7566, 4.8, 3.1, 2);
stairLight.position.set(-6.45, doorBottom + doorHeight + 0.35, doorZ);
stairwell.add(stairLight);
box([0.18, 0.1, 0.34], doorInsetMat, [-6.78, doorBottom + doorHeight + 0.28, doorZ], stairwell, 'DoorLight');

// Three service pipes climb behind the stairwell, turn at ceiling height, and cross above the door.
const doorPipeAssembly = new THREE.Group();
doorPipeAssembly.name = 'DoorPipeAssembly';
scene.add(doorPipeAssembly);
const pipeBottom = 0.1;
const pipeSpecs = [
  { z: 5.37, top: 6.46, endZ: 6.86, radius: 0.062, color: 0x9b6544 },
  { z: 5.12, top: 6.62, endZ: 6.91, radius: 0.055, color: 0x65747d },
  { z: 4.87, top: 6.78, endZ: 6.96, radius: 0.05, color: 0x837044 }
];
const pipeX = -6.75;
const pipeMeshes = [];
for (let i = 0; i < pipeSpecs.length; i++) {
  const spec = pipeSpecs[i];
  const material = new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.34, metalness: 0.78 });
  pipeMeshes.push(rodBetween(
    new THREE.Vector3(pipeX, pipeBottom, spec.z),
    new THREE.Vector3(pipeX, spec.top, spec.z),
    spec.radius,
    material,
    doorPipeAssembly,
    `DoorPipeVertical${i + 1}`
  ));

  const elbow = new THREE.Mesh(new THREE.SphereGeometry(spec.radius * 1.38, 12, 8), material);
  elbow.position.set(pipeX, spec.top, spec.z);
  elbow.castShadow = true;
  elbow.name = `DoorPipeElbow${i + 1}`;
  doorPipeAssembly.add(elbow);

  pipeMeshes.push(rodBetween(
    new THREE.Vector3(pipeX, spec.top, spec.z),
    new THREE.Vector3(pipeX, spec.top, spec.endZ),
    spec.radius,
    material,
    doorPipeAssembly,
    `DoorPipeOverDoor${i + 1}`
  ));

  const floorFlange = new THREE.Mesh(
    new THREE.CylinderGeometry(spec.radius * 1.85, spec.radius * 1.85, 0.1, 14),
    material
  );
  floorFlange.position.set(pipeX, 0.05, spec.z);
  floorFlange.castShadow = true;
  floorFlange.name = `DoorPipeFloorFlange${i + 1}`;
  doorPipeAssembly.add(floorFlange);

  for (const [clampIndex, clampY] of [1.55, 3.55, 5.55].entries()) {
    const clamp = new THREE.Mesh(
      new THREE.TorusGeometry(spec.radius * 1.3, 0.018, 6, 14),
      new THREE.MeshStandardMaterial({ color: 0x30363a, roughness: 0.36, metalness: 0.82 })
    );
    clamp.rotation.x = Math.PI / 2;
    clamp.position.set(pipeX, clampY, spec.z);
    clamp.name = `DoorPipeClamp${i + 1}-${clampIndex + 1}`;
    doorPipeAssembly.add(clamp);
    box([0.16, 0.075, 0.14], railMat, [-6.9, clampY, spec.z], doorPipeAssembly, `DoorPipeBracket${i + 1}-${clampIndex + 1}`);
  }
}
const doorPipeTop = Math.max(...pipeSpecs.map((spec) => spec.top));

// Reference-derived planning workbench fixed to the left wall. The interactive
// station root stays stable while the visual model is rebuilt as one semantic assembly.
const workbench = new THREE.Group();
workbench.name = 'Workbench';
workbench.position.set(-6.18, 0, -1.5);
scene.add(workbench);

function createReferencePlanningWorkbench() {
  const root = new THREE.Group();
  root.name = 'ReferencePlanningWorkbench';
  root.userData.sculptRuntime = {
    model: 'reference-planning-workbench-v1',
    legs: 4,
    diagonalBraces: 2,
    pegboard: { columns: 15, rows: 6, holes: 90 },
    tools: ['pliers', 'blue-screwdriver', 'red-screwdriver', 'open-end-wrench', 'utility-knife'],
    partsBins: 3,
    hasDrawer: true,
    hasTaskLamp: true,
    hasCuttingMat: true,
    cuttingMatTexture: 'procedural-grid'
  };

  const structure = new THREE.Group();
  structure.name = 'PlanningBenchStructure';
  const pegboard = new THREE.Group();
  pegboard.name = 'PlanningBenchPegboard';
  const accessories = new THREE.Group();
  accessories.name = 'PlanningBenchAccessories';
  root.add(structure, pegboard, accessories);

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b573a, roughness: 0.62, metalness: 0.02, flatShading: true });
  const apronMat = new THREE.MeshStandardMaterial({ color: 0x5c3524, roughness: 0.68, metalness: 0.01, flatShading: true });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x25282c, roughness: 0.48, metalness: 0.5, flatShading: true });
  const boardMat = new THREE.MeshStandardMaterial({ color: 0x596064, roughness: 0.72, metalness: 0.12, flatShading: true });
  const drawerTrimMat = new THREE.MeshStandardMaterial({ color: 0x777f84, roughness: 0.44, metalness: 0.52, flatShading: true });
  const recessMat = new THREE.MeshStandardMaterial({ color: 0x08090a, roughness: 0.95, metalness: 0.02 });
  const redMat = new THREE.MeshStandardMaterial({ color: 0xb43b2e, roughness: 0.52, metalness: 0.05, flatShading: true });
  const blueMat = new THREE.MeshStandardMaterial({ color: 0x315e8a, roughness: 0.62, metalness: 0.02, flatShading: true });
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xd9a72e, roughness: 0.58, metalness: 0.03, flatShading: true });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x8b9195, roughness: 0.4, metalness: 0.72, flatShading: true });
  const diffuserMat = new THREE.MeshStandardMaterial({ color: 0xfff6e5, roughness: 0.3, emissive: 0xffddb0, emissiveIntensity: 1.5 });

  box([1.34, 0.23, 3.86], woodMat, [0, 1.31, 0], structure, 'PlanningBenchTop');
  box([1.36, 0.16, 3.88], apronMat, [0.01, 1.22, 0], structure, 'PlanningBenchApron');

  const legPositions = [
    [-0.48, -1.55], [0.48, -1.55], [-0.48, 1.55], [0.48, 1.55]
  ];
  for (const [x, z] of legPositions) box([0.14, 1.18, 0.16], frameMat, [x, 0.62, z], structure, `PlanningBenchLeg-${x}-${z}`);
  box([1.0, 0.12, 0.12], frameMat, [0, 0.38, -1.55], structure, 'PlanningBenchSideRailA');
  box([1.0, 0.12, 0.12], frameMat, [0, 0.38, 1.55], structure, 'PlanningBenchSideRailB');
  box([0.12, 0.12, 3.02], frameMat, [-0.48, 0.38, 0], structure, 'PlanningBenchRearRail');

  function beamBetween(start, end, thickness, material, parent, name) {
    const midpoint = start.clone().add(end).multiplyScalar(0.5);
    const length = start.distanceTo(end);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, length, thickness), material);
    mesh.position.copy(midpoint);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  beamBetween(new THREE.Vector3(0.49, 1.16, 1.42), new THREE.Vector3(0.49, 0.68, 1.05), 0.12, frameMat, structure, 'PlanningBenchBraceLeft');
  beamBetween(new THREE.Vector3(0.49, 1.16, -1.42), new THREE.Vector3(0.49, 0.68, -1.05), 0.12, frameMat, structure, 'PlanningBenchBraceRight');

  const drawer = new THREE.Group();
  drawer.name = 'PlanningBenchDrawer';
  box([0.52, 0.3, 1.08], frameMat, [0.18, 1.01, 0.82], drawer, 'DrawerBody');
  box([0.035, 0.22, 0.97], boardMat, [0.475, 1.01, 0.82], drawer, 'DrawerInsetFace');
  box([0.025, 0.025, 1.0], drawerTrimMat, [0.495, 1.125, 0.82], drawer, 'DrawerTopReveal');
  box([0.025, 0.025, 1.0], drawerTrimMat, [0.495, 0.895, 0.82], drawer, 'DrawerBottomReveal');
  box([0.025, 0.23, 0.025], drawerTrimMat, [0.495, 1.01, 1.315], drawer, 'DrawerSideRevealA');
  box([0.025, 0.23, 0.025], drawerTrimMat, [0.495, 1.01, 0.325], drawer, 'DrawerSideRevealB');
  box([0.04, 0.05, 0.31], steelMat, [0.515, 1.0, 0.82], drawer, 'DrawerPull');
  structure.add(drawer);

  // Thick black frame around a recessed 15 x 6 pegboard.
  box([0.1, 1.82, 3.48], frameMat, [-0.63, 2.25, 0], pegboard, 'PegboardOuterFrame');
  box([0.035, 1.58, 3.22], boardMat, [-0.565, 2.25, 0], pegboard, 'PegboardPanel');
  box([0.14, 1.84, 0.15], frameMat, [-0.5, 2.25, 1.69], pegboard, 'PegboardLeftRail');
  box([0.14, 1.84, 0.15], frameMat, [-0.5, 2.25, -1.69], pegboard, 'PegboardRightRail');
  box([0.14, 0.15, 3.48], frameMat, [-0.5, 3.12, 0], pegboard, 'PegboardTopRail');
  box([0.14, 0.15, 3.48], frameMat, [-0.5, 1.38, 0], pegboard, 'PegboardBottomRail');
  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 15; column += 1) {
      box([0.022, 0.09, 0.09], recessMat, [-0.542, 1.63 + row * 0.25, 1.42 - column * 0.203], pegboard, `PegHole-${row + 1}-${column + 1}`);
    }
  }

  // Procedural green cutting mat with an always-crisp grid and border.
  const matCanvas = document.createElement('canvas');
  matCanvas.width = 512;
  matCanvas.height = 256;
  const matContext = matCanvas.getContext('2d');
  matContext.fillStyle = '#315943';
  matContext.fillRect(0, 0, matCanvas.width, matCanvas.height);
  matContext.strokeStyle = '#a8c5a7';
  matContext.lineWidth = 2;
  matContext.strokeRect(12, 12, matCanvas.width - 24, matCanvas.height - 24);
  matContext.lineWidth = 1;
  for (let x = 32; x < matCanvas.width - 20; x += 32) {
    matContext.beginPath(); matContext.moveTo(x, 14); matContext.lineTo(x, matCanvas.height - 14); matContext.stroke();
  }
  for (let y = 32; y < matCanvas.height - 20; y += 32) {
    matContext.beginPath(); matContext.moveTo(14, y); matContext.lineTo(matCanvas.width - 14, y); matContext.stroke();
  }
  matContext.beginPath(); matContext.moveTo(14, 14); matContext.lineTo(64, 64); matContext.moveTo(matCanvas.width - 14, 14); matContext.lineTo(matCanvas.width - 64, 64); matContext.stroke();
  const matTexture = new THREE.CanvasTexture(matCanvas);
  matTexture.colorSpace = THREE.SRGBColorSpace;
  matTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const matMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 2.12), new THREE.MeshStandardMaterial({ map: matTexture, roughness: 0.86, metalness: 0 }));
  matMesh.rotation.x = -Math.PI / 2;
  matMesh.position.set(0.24, 1.437, 0);
  matMesh.name = 'PlanningBenchCuttingMat';
  matMesh.receiveShadow = true;
  accessories.add(matMesh);

  // Red-and-white block task lamp on screen-left/local +Z.
  box([0.42, 0.08, 0.42], frameMat, [0.15, 1.44, 1.43], accessories, 'PlanningBenchLampBase');
  box([0.09, 0.72, 0.09], frameMat, [-0.02, 1.78, 1.43], accessories, 'PlanningBenchLampStem');
  const lampHood = box([0.34, 0.27, 0.48], redMat, [0.12, 2.12, 1.43], accessories, 'PlanningBenchLampHood');
  lampHood.rotation.z = -0.08;
  box([0.012, 0.17, 0.34], diffuserMat, [0.298, 2.12, 1.43], accessories, 'PlanningBenchLampDiffuser');
  const benchLight = new THREE.PointLight(0xffd2a5, 3.2, 2.6, 2);
  benchLight.position.set(0.38, 2.02, 1.43);
  accessories.add(benchLight);

  // Hanging tools ordered from screen-left to screen-right (local +Z to -Z).
  const toolX = -0.515;
  const toolY = 2.35;
  const pliers = new THREE.Group();
  pliers.name = 'PlanningBenchPliers';
  pliers.position.set(toolX, toolY, 0.75);
  pliers.scale.setScalar(1.22);
  const gripA = box([0.075, 0.38, 0.08], redMat, [0, -0.13, 0.075], pliers, 'PliersGripA'); gripA.rotation.x = 0.18;
  const gripB = box([0.075, 0.38, 0.08], redMat, [0, -0.13, -0.075], pliers, 'PliersGripB'); gripB.rotation.x = -0.18;
  const jawA = box([0.07, 0.25, 0.055], steelMat, [0, 0.18, 0.05], pliers, 'PliersJawA'); jawA.rotation.x = -0.16;
  const jawB = box([0.07, 0.25, 0.055], steelMat, [0, 0.18, -0.05], pliers, 'PliersJawB'); jawB.rotation.x = 0.16;
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 10), steelMat);
  hinge.rotation.z = Math.PI / 2; hinge.name = 'PliersHinge'; pliers.add(hinge);
  accessories.add(pliers);

  function addScrewdriver(name, z, handleMaterial) {
    const tool = new THREE.Group(); tool.name = name; tool.position.set(toolX, toolY, z); tool.scale.setScalar(1.22);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.25, 6), handleMaterial);
    handle.position.y = 0.13; handle.name = `${name}Handle`; tool.add(handle);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 6), steelMat);
    shaft.position.y = -0.145; shaft.name = `${name}Shaft`; tool.add(shaft);
    accessories.add(tool);
  }
  addScrewdriver('PlanningBenchBlueScrewdriver', 0.35, blueMat);
  addScrewdriver('PlanningBenchRedScrewdriver', -0.02, redMat);

  const wrench = new THREE.Group();
  wrench.name = 'PlanningBenchOpenEndWrench'; wrench.position.set(toolX, toolY, -0.4);
  wrench.scale.setScalar(1.22);
  box([0.055, 0.43, 0.075], steelMat, [0, 0, 0], wrench, 'WrenchShaft');
  const wrenchTop = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.03, 5, 9, Math.PI * 1.45), steelMat);
  wrenchTop.rotation.y = Math.PI / 2; wrenchTop.rotation.x = -0.72; wrenchTop.position.y = 0.24; wrench.add(wrenchTop);
  const wrenchBottom = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.026, 5, 9, Math.PI * 1.45), steelMat);
  wrenchBottom.rotation.y = Math.PI / 2; wrenchBottom.rotation.x = Math.PI - 0.72; wrenchBottom.position.y = -0.24; wrench.add(wrenchBottom);
  accessories.add(wrench);

  const knife = new THREE.Group(); knife.name = 'PlanningBenchUtilityKnife'; knife.position.set(toolX, toolY, -0.77); knife.scale.setScalar(1.22);
  box([0.075, 0.42, 0.13], yellowMat, [0, 0, 0], knife, 'UtilityKnifeBody');
  box([0.082, 0.29, 0.045], recessMat, [0.045, 0.02, 0], knife, 'UtilityKnifeTrack');
  box([0.03, 0.13, 0.06], steelMat, [0, 0.26, 0], knife, 'UtilityKnifeBlade');
  accessories.add(knife);

  function addPartsBin(index, z) {
    const bin = new THREE.Group(); bin.name = `PlanningBenchPartsBin${index}`; bin.position.set(-0.43, 1.82, z);
    box([0.3, 0.2, 0.27], redMat, [0, 0, 0], bin, 'BinBack');
    box([0.23, 0.035, 0.22], recessMat, [0.17, 0.025, 0], bin, 'BinInterior');
    box([0.28, 0.14, 0.04], redMat, [0.15, -0.06, 0.125], bin, 'BinSideA');
    box([0.28, 0.14, 0.04], redMat, [0.15, -0.06, -0.125], bin, 'BinSideB');
    box([0.3, 0.075, 0.27], redMat, [0.18, -0.12, 0], bin, 'BinFrontLip');
    accessories.add(bin);
  }
  addPartsBin(1, -0.72);
  addPartsBin(2, -1.08);
  addPartsBin(3, -1.44);

  root.traverse(child => {
    if (child.isMesh) {
      child.castShadow = child.castShadow !== false;
      child.receiveShadow = true;
    }
  });
  return root;
}

const planningBenchVisual = createReferencePlanningWorkbench();
planningBenchVisual.scale.setScalar(1.14);
workbench.add(planningBenchVisual);

// A transparent generous collider makes the whole station easy to select.
const workbenchCollider = box(
  [1.45, 2.65, 3.9],
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  [0, 1.32, 0],
  workbench,
  'WorkbenchCollider'
);
workbenchCollider.castShadow = false;
workbenchCollider.receiveShadow = false;
const WORK_SPOT = new THREE.Vector3(-4.88, 0, -1.5);

// A clean computer desk mirrors the bench on the opposite wall.
const desk = new THREE.Group();
desk.name = 'ComputerDesk';
desk.position.set(6.18, 0, -1.3);
scene.add(desk);
const deskTopMat = new THREE.MeshStandardMaterial({ color: 0x806b56, roughness: 0.48, metalness: 0.03 });
const deskFrameMat = new THREE.MeshStandardMaterial({ color: 0x1d2024, roughness: 0.35, metalness: 0.72 });
const reviewScreenBackingMat = new THREE.MeshStandardMaterial({ color: 0x081018, roughness: 0.18, metalness: 0.15, emissive: 0x0d3349, emissiveIntensity: 0.85 });
const keyMat = new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.5, metalness: 0.35 });
box([1.25, 0.15, 3.5], deskTopMat, [0, 1.28, 0], desk, 'DeskTop');
box([0.1, 1.2, 0.1], deskFrameMat, [-0.42, 0.62, -1.4], desk);
box([0.1, 1.2, 0.1], deskFrameMat, [0.42, 0.62, -1.4], desk);
box([0.1, 1.2, 0.1], deskFrameMat, [-0.42, 0.62, 1.4], desk);
box([0.1, 1.2, 0.1], deskFrameMat, [0.42, 0.62, 1.4], desk);
const monitor = box([0.14, 0.9, 1.45], deskFrameMat, [0.23, 2.02, -0.32], desk, 'ComputerMonitor');
const monitorScreen = box([0.018, 0.72, 1.25], reviewScreenBackingMat, [0.151, 2.02, -0.32], desk, 'MonitorScreen');
monitorScreen.castShadow = false;

const reviewMonitorCanvas = document.createElement('canvas');
reviewMonitorCanvas.width = 448;
reviewMonitorCanvas.height = 252;
const reviewMonitorContext = reviewMonitorCanvas.getContext('2d');
const reviewMonitorTexture = new THREE.CanvasTexture(reviewMonitorCanvas);
reviewMonitorTexture.colorSpace = THREE.SRGBColorSpace;
reviewMonitorTexture.minFilter = THREE.LinearFilter;
reviewMonitorTexture.magFilter = THREE.LinearFilter;
reviewMonitorTexture.generateMipmaps = false;
const reviewMonitorMaterial = new THREE.MeshBasicMaterial({
  map: reviewMonitorTexture,
  toneMapped: false
});
const reviewMonitorDisplay = new THREE.Mesh(
  new THREE.PlaneGeometry(1.2, 0.675),
  reviewMonitorMaterial
);
reviewMonitorDisplay.name = 'ReviewMonitorDisplayPlane';
reviewMonitorDisplay.position.set(0.14, 2.02, -0.32);
reviewMonitorDisplay.rotation.y = -Math.PI / 2;
reviewMonitorDisplay.castShadow = false;
desk.add(reviewMonitorDisplay);

const reviewMonitorState = {
  type: 'CanvasTexture',
  animated: true,
  mode: 'generic-graph',
  glowing: true,
  width: reviewMonitorCanvas.width,
  height: reviewMonitorCanvas.height,
  updates: 0,
  cursor: 0,
  lastUpdate: -Infinity
};

function updateReviewMonitor(now, force = false) {
  if (!force && now - reviewMonitorState.lastUpdate < 1 / 12) return;
  reviewMonitorState.lastUpdate = now;
  reviewMonitorState.cursor = Number(((now * 0.22) % 1).toFixed(4));
  reviewMonitorState.updates += 1;

  const ctx = reviewMonitorContext;
  const width = reviewMonitorCanvas.width;
  const height = reviewMonitorCanvas.height;
  const graph = [0.22, 0.28, 0.25, 0.39, 0.35, 0.51, 0.47, 0.61, 0.58, 0.72, 0.68, 0.81];

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#07131d');
  background.addColorStop(1, '#0a1d29');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#76dfff';
  ctx.beginPath();
  ctx.arc(26, 25, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(174, 229, 244, 0.78)';
  ctx.font = '600 15px monospace';
  ctx.fillText('REVIEW', 40, 31);

  const left = 34;
  const top = 58;
  const graphWidth = width - 58;
  const graphHeight = height - 88;
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(110, 201, 225, 0.12)';
  for (let i = 0; i <= 4; i++) {
    const y = top + graphHeight * i / 4;
    ctx.beginPath();
    ctx.moveTo(left, y + 0.5);
    ctx.lineTo(left + graphWidth, y + 0.5);
    ctx.stroke();
  }

  const points = graph.map((value, index) => ({
    x: left + graphWidth * index / (graph.length - 1),
    y: top + graphHeight * (1 - value) + Math.sin(now * 0.9 + index * 0.7) * 2
  }));

  const area = ctx.createLinearGradient(0, top, 0, top + graphHeight);
  area.addColorStop(0, 'rgba(64, 209, 240, 0.28)');
  area.addColorStop(1, 'rgba(64, 209, 240, 0)');
  ctx.beginPath();
  ctx.moveTo(points[0].x, top + graphHeight);
  for (const point of points) ctx.lineTo(point.x, point.y);
  ctx.lineTo(points.at(-1).x, top + graphHeight);
  ctx.closePath();
  ctx.fillStyle = area;
  ctx.fill();

  ctx.beginPath();
  points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#55d9f5';
  ctx.shadowColor = '#34ccec';
  ctx.shadowBlur = 9;
  ctx.stroke();
  ctx.shadowBlur = 0;

  const cursorX = left + graphWidth * reviewMonitorState.cursor;
  ctx.strokeStyle = 'rgba(255, 180, 92, 0.58)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cursorX, top);
  ctx.lineTo(cursorX, top + graphHeight);
  ctx.stroke();

  ctx.fillStyle = 'rgba(94, 211, 238, 0.035)';
  for (let y = 0; y < height; y += 4) ctx.fillRect(0, y, width, 1);

  reviewMonitorTexture.needsUpdate = true;
}
updateReviewMonitor(0, true);
box([0.08, 0.48, 0.1], deskFrameMat, [0.18, 1.53, -0.32], desk, 'MonitorStand');
box([0.36, 0.05, 0.58], deskFrameMat, [0.05, 1.36, -0.32], desk, 'MonitorBase');
const keyboard = box([0.48, 0.055, 1.15], keyMat, [-0.32, 1.39, -0.24], desk, 'Keyboard');
keyboard.rotation.z = 0.015;
for (let row = 0; row < 4; row++) {
  for (let col = 0; col < 9; col++) {
    box([0.075, 0.016, 0.075], deskFrameMat, [-0.55 + row * 0.105, 1.428, -0.56 + col * 0.08], desk);
  }
}
const deskPlant = createFacetedTerracottaPlant('DeskFacetedTerracottaPlant', 0.46);
deskPlant.position.set(-0.24, 1.355, 1.14);
deskPlant.rotation.y = -0.18;
desk.add(deskPlant);
const deskGlow = new THREE.PointLight(0x5dc9ff, 5.5, 2.6, 2);
deskGlow.position.set(-0.1, 2.0, -0.3);
desk.add(deskGlow);
const deskCollider = box(
  [1.45, 2.65, 3.75],
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  [0, 1.32, 0],
  desk,
  'DeskCollider'
);
deskCollider.castShadow = false;
deskCollider.receiveShadow = false;
const DESK_SPOT = new THREE.Vector3(4.88, 0, -1.3);

// Camera-near lounge: a charcoal left-chaise sectional facing a low walnut table.
const lounge = new THREE.Group();
lounge.name = 'FrontRightLounge';
lounge.position.set(4.0, 0, 5.85);
scene.add(lounge);
const loungeFabricMat = new THREE.MeshStandardMaterial({ color: 0x25282c, roughness: 0.94, metalness: 0.01 });
const loungeCushionMat = new THREE.MeshStandardMaterial({ color: 0x30343a, roughness: 0.97, metalness: 0.0 });
const loungeSeamMat = new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: 1 });
const loungeFootMat = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.52, metalness: 0.34 });
const rugMat = new THREE.MeshStandardMaterial({ color: 0x1d2025, roughness: 1, metalness: 0 });
const rugRibMat = new THREE.MeshStandardMaterial({ color: 0x25292e, roughness: 1, metalness: 0 });
const tableWoodMat = new THREE.MeshStandardMaterial({ color: 0x5a3827, roughness: 0.66, metalness: 0.01 });
const tableEdgeMat = new THREE.MeshStandardMaterial({ color: 0x3c251b, roughness: 0.7, metalness: 0.02 });

const loungeRug = box([5.3, 0.025, 3.65], rugMat, [0, 0.018, -2.0], lounge, 'LoungeRug');
loungeRug.receiveShadow = true;
for (let i = 0; i < 16; i++) {
  box([5.08, 0.008, 0.014], rugRibMat, [0, 0.035, -3.65 + i * 0.22], lounge, `RugRib${i + 1}`);
}

box([4.45, 0.34, 1.0], loungeFabricMat, [0, 0.23, 0], lounge, 'SectionalBase');
box([1.3, 0.34, 2.32], loungeFabricMat, [-1.45, 0.23, -0.65], lounge, 'LeftChaiseBase');
box([4.45, 0.72, 0.22], loungeFabricMat, [0, 0.68, 0.43], lounge, 'SectionalBack');
box([0.26, 0.58, 1.02], loungeFabricMat, [-2.1, 0.55, 0], lounge, 'SectionalLeftArm');
box([0.26, 0.58, 1.02], loungeFabricMat, [2.1, 0.55, 0], lounge, 'SectionalRightArm');
const couchColliderMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });
const couchCollider = box([4.7, 1.25, 1.3], couchColliderMaterial, [0, 0.56, 0], lounge, 'CouchCollider');
couchCollider.castShadow = false;
couchCollider.receiveShadow = false;
let couchHits = 0;

const loungeSeatCushions = [
  box([1.22, 0.18, 2.06], loungeCushionMat, [-1.45, 0.49, -0.63], lounge, 'ChaiseCushion'),
  box([1.18, 0.18, 0.84], loungeCushionMat, [0, 0.49, -0.08], lounge, 'SeatCushion2'),
  box([1.18, 0.18, 0.84], loungeCushionMat, [1.36, 0.49, -0.08], lounge, 'SeatCushion3')
];
for (let i = 0; i < 3; i++) {
  const x = -1.45 + i * 1.42;
  const backCushion = box([1.18, 0.5, 0.2], loungeCushionMat, [x, 0.83, 0.28], lounge, `BackCushion${i + 1}`);
  backCushion.rotation.x = -0.08;
}
box([0.055, 0.2, 0.79], loungeSeamMat, [-0.71, 0.505, -0.08], lounge, 'SeatSeam1');
box([0.055, 0.2, 0.79], loungeSeamMat, [0.71, 0.505, -0.08], lounge, 'SeatSeam2');
const throwPillow = box([0.52, 0.48, 0.18], loungeCushionMat, [-1.8, 0.82, 0.18], lounge, 'ThrowPillow');
throwPillow.rotation.z = -0.18;
for (const [x, z] of [[-1.92, 0.31], [1.92, 0.31], [-1.92, -0.32], [1.92, -0.32], [-1.45, -1.65], [-0.95, -1.65]]) {
  box([0.16, 0.12, 0.16], loungeFootMat, [x, 0.06, z], lounge, 'SectionalFoot');
}

const coffeeTable = new THREE.Group();
coffeeTable.name = 'CoffeeTable';
coffeeTable.position.set(0.15, 0, -2.45);
lounge.add(coffeeTable);
box([2.45, 0.18, 1.2], tableWoodMat, [0, 0.46, 0], coffeeTable, 'CoffeeTableTop');
box([2.5, 0.08, 1.24], tableEdgeMat, [0, 0.39, 0], coffeeTable, 'CoffeeTableEdge');
box([2.02, 0.08, 0.82], loungeFootMat, [0, 0.15, 0], coffeeTable, 'CoffeeTableShelf');
for (const [x, z] of [[-0.96, -0.4], [0.96, -0.4], [-0.96, 0.4], [0.96, 0.4]]) {
  box([0.13, 0.4, 0.13], loungeFootMat, [x, 0.22, z], coffeeTable, 'CoffeeTableLeg');
}

const loungePlants = [];
function addLoungePlant(x, z, scale, name, rotationY) {
  const plantGroup = createFacetedTerracottaPlant(name, scale);
  plantGroup.position.set(x, 0.56, z);
  plantGroup.rotation.y = rotationY;
  coffeeTable.add(plantGroup);
  loungePlants.push(plantGroup);
}
addLoungePlant(-0.92, -0.19, 0.38, 'TableFacetedTerracottaPlant1', -0.24);
addLoungePlant(-0.08, 0.24, 0.34, 'TableFacetedTerracottaPlant2', 0.34);

const loungeMagazines = [];
const magazineBottom = box([0.76, 0.045, 0.49], new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.8 }), [0.68, 0.575, 0.08], coffeeTable, 'MagazineBottom');
magazineBottom.rotation.y = -0.1;
loungeMagazines.push(magazineBottom);
const magazineMiddle = box([0.72, 0.045, 0.46], new THREE.MeshStandardMaterial({ color: 0x394d5c, roughness: 0.78 }), [0.68, 0.62, 0.08], coffeeTable, 'MagazineMiddle');
magazineMiddle.rotation.y = -0.1;
loungeMagazines.push(magazineMiddle);
const magazineTop = box([0.68, 0.045, 0.43], new THREE.MeshStandardMaterial({ color: 0x8da8bd, roughness: 0.75 }), [0.68, 0.665, 0.08], coffeeTable, 'MagazineTop');
magazineTop.rotation.y = -0.1;
loungeMagazines.push(magazineTop);
const coverGraphic = box([0.34, 0.012, 0.2], new THREE.MeshStandardMaterial({ color: 0x263846, roughness: 0.7 }), [0.68, 0.693, 0.08], coffeeTable, 'MagazineCoverGraphic');
coverGraphic.rotation.y = -0.1;
box([0.3, 0.012, 0.035], new THREE.MeshBasicMaterial({ color: 0xf0f2f2 }), [0.64, 0.7, -0.08], coffeeTable, 'MagazineTitle').rotation.y = -0.1;

// Precision test bench on the back wall, with inspection and lab equipment.
const testBench = new THREE.Group();
testBench.name = 'TestBench';
testBench.position.set(1.6, 0, -6.18);
scene.add(testBench);
const testTopMat = new THREE.MeshStandardMaterial({ color: 0x53616a, roughness: 0.46, metalness: 0.42 });
const testFrameMat = new THREE.MeshStandardMaterial({ color: 0x20252a, roughness: 0.4, metalness: 0.72 });
const testAccentMat = new THREE.MeshStandardMaterial({ color: 0xf1bd3f, roughness: 0.4, metalness: 0.2 });
const testScreenMat = new THREE.MeshStandardMaterial({ color: 0x0d1317, roughness: 0.15, emissive: 0x1f806f, emissiveIntensity: 2.0 });
box([3.8, 0.16, 1.25], testTopMat, [0, 1.28, 0], testBench, 'TestBenchTop');
box([0.1, 1.2, 0.1], testFrameMat, [-1.55, 0.62, -0.38], testBench);
box([0.1, 1.2, 0.1], testFrameMat, [1.55, 0.62, -0.38], testBench);
box([0.1, 1.2, 0.1], testFrameMat, [-1.55, 0.62, 0.38], testBench);
box([0.1, 1.2, 0.1], testFrameMat, [1.55, 0.62, 0.38], testBench);
box([1.42, 0.86, 0.14], testFrameMat, [-1.05, 2.03, -0.34], testBench, 'TestScreen');
const testScreenFace = box([1.2, 0.66, 0.018], testScreenMat, [-1.05, 2.03, -0.261], testBench, 'TestScreenFace');
testScreenFace.castShadow = false;
box([0.1, 0.48, 0.1], testFrameMat, [-1.05, 1.5, -0.34], testBench, 'TestScreenStand');
box([0.62, 0.06, 0.34], testFrameMat, [-1.05, 1.36, -0.18], testBench, 'TestScreenBase');

// Mounted magnifying glass.
const magnifier = new THREE.Group();
magnifier.name = 'MagnifyingGlass';
magnifier.position.set(0.12, 0, 0.03);
testBench.add(magnifier);
const magnifierHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.72, 14), testFrameMat);
magnifierHandle.position.set(-0.08, 1.76, 0);
magnifierHandle.rotation.z = -0.42;
magnifierHandle.castShadow = true;
magnifier.add(magnifierHandle);
const magnifierRing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.045, 12, 32), testAccentMat);
magnifierRing.position.set(0.07, 2.14, 0);
magnifierRing.castShadow = true;
magnifier.add(magnifierRing);
const magnifierGlass = new THREE.Mesh(
  new THREE.CircleGeometry(0.225, 32),
  new THREE.MeshPhysicalMaterial({ color: 0x9cdcf0, transparent: true, opacity: 0.2, roughness: 0.05, transmission: 0.45, side: THREE.DoubleSide, depthWrite: false })
);
magnifierGlass.position.set(0.07, 2.14, 0.002);
magnifier.add(magnifierGlass);
box([0.42, 0.07, 0.34], testFrameMat, [-0.26, 1.36, 0], magnifier, 'MagnifierBase');

// Compact microscope silhouette: base, stage, curved arm, tube, and objective.
const microscope = new THREE.Group();
microscope.name = 'Microscope';
microscope.position.set(1.1, 0, 0.02);
testBench.add(microscope);
box([0.72, 0.1, 0.5], testFrameMat, [0, 1.38, 0], microscope, 'MicroscopeBase');
box([0.55, 0.07, 0.46], testAccentMat, [-0.03, 1.66, 0], microscope, 'MicroscopeStage');
const scopeColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.72, 16), testFrameMat);
scopeColumn.position.set(0.24, 1.74, -0.08);
scopeColumn.rotation.z = -0.18;
scopeColumn.castShadow = true;
microscope.add(scopeColumn);
const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.64, 18), testTopMat);
scopeBody.position.set(-0.03, 2.08, 0);
scopeBody.rotation.z = -0.48;
scopeBody.castShadow = true;
microscope.add(scopeBody);
const eyepiece = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.28, 16), testFrameMat);
eyepiece.position.set(0.13, 2.34, 0);
eyepiece.rotation.z = -0.48;
eyepiece.castShadow = true;
microscope.add(eyepiece);
const objective = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.045, 0.25, 14), testAccentMat);
objective.position.set(-0.23, 1.82, 0);
objective.rotation.z = -0.48;
objective.castShadow = true;
microscope.add(objective);
const testGlow = new THREE.PointLight(0x48e1c1, 5.5, 3, 2);
testGlow.position.set(-0.9, 2.1, 0.5);
testBench.add(testGlow);
const testBenchCollider = box(
  [4.05, 2.7, 1.5],
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  [0, 1.35, 0],
  testBench,
  'TestBenchCollider'
);
testBenchCollider.castShadow = false;
testBenchCollider.receiveShadow = false;
const TEST_BENCH_SPOT = new THREE.Vector3(1.6, 0, -4.82);

// Back-wall utility shelves: tools, books, and a live-looking oscilloscope.
const backWallUtilities = new THREE.Group();
backWallUtilities.name = 'BackWallUtilities';
backWallUtilities.position.set(-3.53, 0, -6.72);
scene.add(backWallUtilities);
const shelfMetalMat = new THREE.MeshStandardMaterial({ color: 0x202429, roughness: 0.42, metalness: 0.7 });
const shelfWoodMat = new THREE.MeshStandardMaterial({ color: 0x694831, roughness: 0.66, metalness: 0.03 });
const utilityDarkMat = new THREE.MeshStandardMaterial({ color: 0x15191d, roughness: 0.34, metalness: 0.62 });
const utilityAccentMat = new THREE.MeshStandardMaterial({ color: 0xd49b3f, roughness: 0.42, metalness: 0.38 });
const shelfLevels = [2.48, 3.48, 4.48];
for (let i = 0; i < shelfLevels.length; i++) {
  box([3.15, 0.12, 0.52], shelfWoodMat, [0, shelfLevels[i], 0.13], backWallUtilities, `UtilityShelf${i + 1}`);
  box([0.1, 0.5, 0.42], shelfMetalMat, [-1.32, shelfLevels[i] - 0.28, 0.02], backWallUtilities, `ShelfBracket${i * 2 + 1}`);
  box([0.1, 0.5, 0.42], shelfMetalMat, [1.32, shelfLevels[i] - 0.28, 0.02], backWallUtilities, `ShelfBracket${i * 2 + 2}`);
}
box([0.09, 3.1, 0.12], shelfMetalMat, [-1.5, 3.58, -0.08], backWallUtilities, 'ShelfRailLeft');
box([0.09, 3.1, 0.12], shelfMetalMat, [1.5, 3.58, -0.08], backWallUtilities, 'ShelfRailRight');

const oscilloscope = new THREE.Group();
oscilloscope.name = 'Oscilloscope';
oscilloscope.position.set(-0.65, 2.55, 0.08);
backWallUtilities.add(oscilloscope);
box([1.18, 0.72, 0.48], utilityDarkMat, [0, 0.39, 0.08], oscilloscope, 'OscilloscopeBody');
const scopeScreenMat = new THREE.MeshStandardMaterial({ color: 0x03100e, emissive: 0x0b4036, emissiveIntensity: 0.72, roughness: 0.16 });
const scopeScreen = box([0.7, 0.43, 0.025], scopeScreenMat, [-0.14, 0.41, 0.335], oscilloscope, 'OscilloscopeScreen');
scopeScreen.castShadow = false;

const oscilloscopeCanvas = document.createElement('canvas');
oscilloscopeCanvas.width = 384;
oscilloscopeCanvas.height = 240;
const oscilloscopeContext = oscilloscopeCanvas.getContext('2d');
const oscilloscopeTexture = new THREE.CanvasTexture(oscilloscopeCanvas);
oscilloscopeTexture.colorSpace = THREE.SRGBColorSpace;
oscilloscopeTexture.minFilter = THREE.LinearFilter;
oscilloscopeTexture.magFilter = THREE.LinearFilter;
oscilloscopeTexture.generateMipmaps = false;
const oscilloscopeDisplayMaterial = new THREE.MeshBasicMaterial({
  map: oscilloscopeTexture,
  toneMapped: false
});
const oscilloscopeDisplay = new THREE.Mesh(
  new THREE.PlaneGeometry(0.66, 0.39),
  oscilloscopeDisplayMaterial
);
oscilloscopeDisplay.name = 'OscilloscopeDisplayPlane';
oscilloscopeDisplay.position.set(-0.14, 0.41, 0.351);
oscilloscopeDisplay.castShadow = false;
oscilloscope.add(oscilloscopeDisplay);

const oscilloscopeScreenState = {
  type: 'CanvasTexture',
  animated: true,
  mode: 'sine',
  width: oscilloscopeCanvas.width,
  height: oscilloscopeCanvas.height,
  updates: 0,
  phase: 0,
  lastUpdate: -Infinity
};

function updateOscilloscopeDisplay(now, force = false) {
  if (!force && now - oscilloscopeScreenState.lastUpdate < 1 / 30) return;
  oscilloscopeScreenState.lastUpdate = now;
  oscilloscopeScreenState.phase = Number(((now * 2.8) % (Math.PI * 2)).toFixed(4));
  oscilloscopeScreenState.updates += 1;

  const ctx = oscilloscopeContext;
  const width = oscilloscopeCanvas.width;
  const height = oscilloscopeCanvas.height;
  const phase = oscilloscopeScreenState.phase;

  ctx.fillStyle = '#03110e';
  ctx.fillRect(0, 0, width, height);

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(71, 255, 216, 0.10)';
  for (let x = 0; x <= width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 30) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();
  }

  const drawSignal = (lineWidth, color, blur) => {
    ctx.save();
    ctx.beginPath();
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.shadowColor = '#55ffda';
    ctx.shadowBlur = blur;
    for (let x = 0; x <= width; x += 2) {
      const normalized = x / width;
      const envelope = 0.88 + Math.sin(normalized * Math.PI * 2 + phase * 0.35) * 0.08;
      const y = height * 0.5 + Math.sin(normalized * Math.PI * 5 - phase) * height * 0.25 * envelope;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  };
  drawSignal(8, 'rgba(54, 255, 207, 0.18)', 18);
  drawSignal(3, '#8affdf', 10);

  const sweepX = ((phase / (Math.PI * 2)) * width) % width;
  const gradient = ctx.createLinearGradient(sweepX - 30, 0, sweepX + 8, 0);
  gradient.addColorStop(0, 'rgba(102,255,221,0)');
  gradient.addColorStop(1, 'rgba(160,255,232,0.16)');
  ctx.fillStyle = gradient;
  ctx.fillRect(Math.max(0, sweepX - 30), 0, 38, height);

  ctx.fillStyle = 'rgba(124,255,224,0.035)';
  for (let y = 1; y < height; y += 4) ctx.fillRect(0, y, width, 1);

  oscilloscopeTexture.needsUpdate = true;
}
updateOscilloscopeDisplay(0, true);
for (let i = 0; i < 3; i++) {
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.055, 14), utilityAccentMat);
  knob.rotation.x = Math.PI / 2;
  knob.position.set(0.39, 0.57 - i * 0.17, 0.36);
  knob.castShadow = true;
  knob.name = `OscilloscopeKnob${i + 1}`;
  oscilloscope.add(knob);
}
box([0.82, 0.08, 0.34], utilityDarkMat, [0, 0.02, 0.06], oscilloscope, 'OscilloscopeFeet');

const utilityBooks = [];
const bookColors = [0xa84335, 0x2f6d70, 0xc08a3e, 0x485577, 0x7c4f39, 0x597049];
for (let i = 0; i < 6; i++) {
  const height = 0.48 + (i % 3) * 0.08;
  const book = box(
    [0.18 + (i % 2) * 0.035, height, 0.34],
    new THREE.MeshStandardMaterial({ color: bookColors[i], roughness: 0.75 }),
    [0.26 + i * 0.21, 3.55 + height / 2, 0.13],
    backWallUtilities,
    `UtilityBook${i + 1}`
  );
  book.rotation.z = i === 5 ? -0.12 : 0;
  utilityBooks.push(book);
}

const utilityTools = [];
const hammerHandle = box([0.09, 0.72, 0.09], shelfWoodMat, [-0.95, 4.92, 0.21], backWallUtilities, 'ToolHammerHandle');
hammerHandle.rotation.z = -0.18;
utilityTools.push(hammerHandle);
const hammerHead = box([0.5, 0.14, 0.16], shelfMetalMat, [-0.88, 5.25, 0.21], backWallUtilities, 'ToolHammerHead');
hammerHead.rotation.z = -0.18;
utilityTools.push(hammerHead);
const screwdriverShaft = box([0.055, 0.58, 0.055], shelfMetalMat, [-0.25, 4.86, 0.2], backWallUtilities, 'ToolScrewdriver');
screwdriverShaft.rotation.z = 0.1;
utilityTools.push(screwdriverShaft);
const screwdriverHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.075, 0.34, 12), new THREE.MeshStandardMaterial({ color: 0xd94a32, roughness: 0.45 }));
screwdriverHandle.position.set(-0.28, 5.23, 0.2);
screwdriverHandle.rotation.z = 0.1;
screwdriverHandle.castShadow = true;
screwdriverHandle.name = 'ToolScrewdriverHandle';
backWallUtilities.add(screwdriverHandle);
utilityTools.push(screwdriverHandle);
const wrench = new THREE.Group();
wrench.name = 'ToolWrench';
wrench.position.set(0.56, 4.88, 0.22);
backWallUtilities.add(wrench);
const wrenchStem = box([0.11, 0.65, 0.08], shelfMetalMat, [0, 0, 0], wrench, 'WrenchStem');
wrenchStem.rotation.z = -0.12;
const wrenchRing = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.045, 8, 20), shelfMetalMat);
wrenchRing.position.set(-0.04, 0.35, 0);
wrenchRing.castShadow = true;
wrench.add(wrenchRing);
utilityTools.push(wrench);
box([0.72, 0.28, 0.34], utilityAccentMat, [1.05, 4.68, 0.15], backWallUtilities, 'ToolCase');

// High-voltage panel with a dedicated conduit rising into the ceiling.
const electricalPanel = new THREE.Group();
electricalPanel.name = 'ElectricalPanel';
electricalPanel.position.set(-1.25, 0, -6.83);
scene.add(electricalPanel);
const panelMat = new THREE.MeshStandardMaterial({ color: 0x4b5256, roughness: 0.5, metalness: 0.58 });
const panelEdgeMat = new THREE.MeshStandardMaterial({ color: 0x22272b, roughness: 0.38, metalness: 0.78 });
const warningMat = new THREE.MeshStandardMaterial({ color: 0xf3bc35, emissive: 0x5a3300, emissiveIntensity: 0.42, roughness: 0.42 });
box([1.15, 1.5, 0.2], panelMat, [0, 4.44, 0], electricalPanel, 'VoltagePanelCabinet');
box([1.03, 1.36, 0.035], panelEdgeMat, [0, 4.44, 0.12], electricalPanel, 'VoltagePanelDoor');
const warningTriangleShape = new THREE.Shape();
warningTriangleShape.moveTo(0, 0.3);
warningTriangleShape.lineTo(-0.29, -0.24);
warningTriangleShape.lineTo(0.29, -0.24);
warningTriangleShape.closePath();
const warningTriangle = new THREE.Mesh(new THREE.ShapeGeometry(warningTriangleShape), warningMat);
warningTriangle.position.set(0, 4.5, 0.145);
warningTriangle.name = 'VoltageWarningTriangle';
electricalPanel.add(warningTriangle);
const boltShape = new THREE.Shape();
boltShape.moveTo(0.04, 0.22);
boltShape.lineTo(-0.09, 0.02);
boltShape.lineTo(0, 0.02);
boltShape.lineTo(-0.05, -0.2);
boltShape.lineTo(0.14, 0.07);
boltShape.lineTo(0.045, 0.07);
boltShape.closePath();
const voltageSymbol = new THREE.Mesh(new THREE.ShapeGeometry(boltShape), new THREE.MeshBasicMaterial({ color: 0x17191a, toneMapped: false }));
voltageSymbol.position.set(0, 4.47, 0.151);
voltageSymbol.name = 'VoltageSymbol';
electricalPanel.add(voltageSymbol);
box([0.14, 0.08, 0.05], warningMat, [0.38, 3.93, 0.15], electricalPanel, 'PanelLatch');
const panelIndicatorMat = new THREE.MeshStandardMaterial({ color: 0xff4c35, emissive: 0xff1a08, emissiveIntensity: 2.2, roughness: 0.25 });
for (let i = 0; i < 3; i++) box([0.1, 0.1, 0.035], panelIndicatorMat, [-0.3 + i * 0.3, 5.0, 0.15], electricalPanel, `PanelIndicator${i + 1}`);
const conduitMat = new THREE.MeshStandardMaterial({ color: 0x777e80, roughness: 0.31, metalness: 0.86 });
const conduitTop = 6.88;
rodBetween(new THREE.Vector3(0.28, 5.18, 0), new THREE.Vector3(0.28, conduitTop, 0), 0.055, conduitMat, electricalPanel, 'CeilingConduit');
for (const y of [5.52, 6.2, 6.75]) {
  const coupling = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.11, 14), panelEdgeMat);
  coupling.position.set(0.28, y, 0);
  coupling.castShadow = true;
  coupling.name = `ConduitCoupling${y}`;
  electricalPanel.add(coupling);
}
box([0.34, 0.24, 0.25], panelEdgeMat, [0.28, 6.78, 0], electricalPanel, 'ConduitCeilingBox');

const stations = [
  { id: 'workbench', label: 'BENCH', group: workbench, collider: workbenchCollider, spot: WORK_SPOT, finalYaw: -Math.PI / 2, hits: 0 },
  { id: 'desk', label: 'DESK', group: desk, collider: deskCollider, spot: DESK_SPOT, finalYaw: Math.PI / 2, hits: 0 },
  { id: 'testbench', label: 'TEST BENCH', group: testBench, collider: testBenchCollider, spot: TEST_BENCH_SPOT, finalYaw: Math.PI, hits: 0 }
];
const HOME = new THREE.Vector3(0, 0, 0);
const COUCH_SPOT = new THREE.Vector3(4.0, 0, 4.95);

const cubeRig = new THREE.Group();
cubeRig.position.copy(HOME);
scene.add(cubeRig);

const robotRedMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xd63023,
  roughness: 0.34,
  metalness: 0.08,
  clearcoat: 0.58,
  clearcoatRoughness: 0.24
});
const robotDarkMaterial = new THREE.MeshStandardMaterial({ color: 0x202224, roughness: 0.62, metalness: 0.48, flatShading: true });
const robotScreenMaterial = new THREE.MeshPhysicalMaterial({ color: 0x090d10, roughness: 0.12, metalness: 0.14, clearcoat: 0.8 });
const headingMaterial = new THREE.MeshBasicMaterial({ color: 0x8fd5ec, toneMapped: false });
const robotWhiteMaterial = new THREE.MeshBasicMaterial({ color: 0xf0f5f3, toneMapped: false });

function robotBox(name, size, material, position, parent, radius = 0.035) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 2, Math.min(radius, ...size.map(value => value * 0.22))), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function robotCylinder(name, radius, length, material, position, parent, rotation = [0, 0, 0], sides = 10) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, sides, 1, false), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function pivot(name, position, parent) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(...position);
  parent.add(group);
  return group;
}

const cube = new THREE.Group();
cube.name = 'RedBipedRobot';
cubeRig.add(cube);
const robotBody = new THREE.Group();
robotBody.name = 'RobotBody';
cube.add(robotBody);

const torso = pivot('TorsoPivot', [0, 0.66, 0], robotBody);
robotBox('TorsoShell', [0.72, 0.64, 0.5], robotRedMaterial, [0, 0.31, 0], torso, 0.075);
robotBox('ChestSlot', [0.24, 0.055, 0.018], robotWhiteMaterial, [0, 0.42, 0.26], torso, 0.012);
const neck = pivot('NeckJoint', [0, 1.33, 0], robotBody);
robotCylinder('NeckLower', 0.11, 0.16, robotDarkMaterial, [0, 0.02, 0], neck, [0, 0, 0], 8);
robotCylinder('NeckRing', 0.14, 0.055, robotDarkMaterial, [0, 0.1, 0], neck, [0, 0, 0], 8);
const head = pivot('HeadPivot', [0, 0.15, 0], neck);
robotBox('HeadShell', [0.88, 0.56, 0.68], robotRedMaterial, [0, 0.22, 0], head, 0.085);
robotBox('FaceScreen', [0.66, 0.39, 0.035], robotScreenMaterial, [0, 0.21, 0.35], head, 0.07);
for (const side of [-1, 1]) {
  robotBox(side < 0 ? 'LeftEye' : 'RightEye', [0.075, 0.17, 0.018], headingMaterial, [side * 0.15, 0.27, 0.372], head, 0.02);
  robotCylinder(side < 0 ? 'LeftEarDisk' : 'RightEarDisk', 0.18, 0.11, robotDarkMaterial, [side * 0.48, 0.22, 0], head, [0, 0, Math.PI / 2], 10);
  robotCylinder(side < 0 ? 'LeftEarInset' : 'RightEarInset', 0.115, 0.12, robotDarkMaterial, [side * 0.495, 0.22, 0], head, [0, 0, Math.PI / 2], 8);
}
robotBox('MouthBar', [0.22, 0.042, 0.018], headingMaterial, [0, 0.09, 0.372], head, 0.012);
robotBox('AntennaBase', [0.2, 0.08, 0.16], robotDarkMaterial, [0, 0.54, 0], head, 0.02);
robotCylinder('AntennaStem', 0.028, 0.2, robotDarkMaterial, [0, 0.68, 0], head, [0, 0, 0], 8);
const antennaCap = robotBox('AntennaCap', [0.16, 0.16, 0.16], robotRedMaterial, [0, 0.82, 0], head, 0.045);
antennaCap.rotation.y = Math.PI / 4;

function createRobotArm(side, label) {
  const shoulder = pivot(`${label}ShoulderJoint`, [side * 0.46, 1.15, 0], robotBody);
  robotCylinder(`${label}ShoulderHub`, 0.16, 0.15, robotDarkMaterial, [0, 0, 0], shoulder, [0, 0, Math.PI / 2], 10);
  robotBox(`${label}UpperArm`, [0.17, 0.18, 0.18], robotDarkMaterial, [0, -0.11, 0], shoulder, 0.045);
  const elbow = pivot(`${label}ElbowJoint`, [0, -0.22, 0], shoulder);
  robotCylinder(`${label}ElbowHub`, 0.105, 0.16, robotDarkMaterial, [0, 0, 0], elbow, [0, 0, Math.PI / 2], 8);
  robotBox(`${label}ForearmArmor`, [0.24, 0.18, 0.22], robotRedMaterial, [0, -0.11, 0], elbow, 0.06);
  const wrist = pivot(`${label}WristJoint`, [0, -0.24, 0], elbow);
  robotCylinder(`${label}WristCoupler`, 0.075, 0.13, robotDarkMaterial, [0, 0, 0], wrist, [0, 0, Math.PI / 2], 8);
  const claw = pivot(`${label}Claw`, [0, -0.07, 0], wrist);
  robotBox(`${label}ClawPalm`, [0.22, 0.09, 0.16], robotDarkMaterial, [0, -0.03, 0], claw, 0.025);
  robotBox(`${label}ClawOuter`, [0.065, 0.2, 0.09], robotDarkMaterial, [side * 0.08, -0.13, 0], claw, 0.02);
  robotBox(`${label}ClawInner`, [0.065, 0.2, 0.09], robotDarkMaterial, [-side * 0.08, -0.13, 0], claw, 0.02);
  return { shoulder, elbow, wrist, claw };
}

function createRobotLeg(side, label) {
  const hip = pivot(`${label}HipJoint`, [side * 0.2, 0.66, 0], robotBody);
  robotCylinder(`${label}HipHub`, 0.115, 0.15, robotDarkMaterial, [0, 0, 0], hip, [0, 0, Math.PI / 2], 8);
  robotBox(`${label}Thigh`, [0.17, 0.21, 0.18], robotDarkMaterial, [0, -0.135, 0], hip, 0.04);
  const knee = pivot(`${label}KneeJoint`, [0, -0.27, 0], hip);
  robotCylinder(`${label}KneeHub`, 0.11, 0.16, robotDarkMaterial, [0, 0, 0], knee, [0, 0, Math.PI / 2], 8);
  robotBox(`${label}Shin`, [0.16, 0.18, 0.17], robotDarkMaterial, [0, -0.12, 0], knee, 0.035);
  const ankle = pivot(`${label}AnkleJoint`, [0, -0.25, 0], knee);
  const foot = robotBox(`${label}Foot`, [0.3, 0.18, 0.43], robotRedMaterial, [0, -0.035, 0.1], ankle, 0.06);
  return { hip, knee, ankle, foot };
}

const leftArm = createRobotArm(-1, 'Left');
const rightArm = createRobotArm(1, 'Right');
const leftLeg = createRobotLeg(-1, 'Left');
const rightLeg = createRobotLeg(1, 'Right');
const robotJoints = {
  neck,
  head,
  leftShoulder: leftArm.shoulder,
  rightShoulder: rightArm.shoulder,
  leftElbow: leftArm.elbow,
  rightElbow: rightArm.elbow,
  leftWrist: leftArm.wrist,
  rightWrist: rightArm.wrist,
  leftHip: leftLeg.hip,
  rightHip: rightLeg.hip,
  leftKnee: leftLeg.knee,
  rightKnee: rightLeg.knee,
  leftAnkle: leftLeg.ankle,
  rightAnkle: rightLeg.ankle
};
let robotAnimationState = 'idle';
let robotSitStartedAt = 0;
let robotSitProgress = 0;
let robotStandStartedAt = 0;
let robotStandStartProgress = 0;
let robotStandFrames = 0;
const robotAnimationHistory = new Set(['idle']);
let robotMaxHipSwing = 0;
const robotPartNames = [];
cube.traverse((object) => { if (object.isMesh) robotPartNames.push(object.name); });

const contactShadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.74, 48),
  new THREE.MeshBasicMaterial({ color: 0x090909, transparent: true, opacity: 0.2, depthWrite: false })
);
contactShadow.rotation.x = -Math.PI / 2;
contactShadow.position.y = 0.012;
cubeRig.add(contactShadow);

const marker = new THREE.Group();
marker.visible = false;
const markerRing = new THREE.Mesh(
  new THREE.RingGeometry(0.26, 0.34, 48),
  new THREE.MeshBasicMaterial({ color: 0xff604d, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false })
);
markerRing.rotation.x = -Math.PI / 2;
marker.add(markerRing);
for (let i = 0; i < 4; i++) {
  const tick = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16, 0.018),
    new THREE.MeshBasicMaterial({ color: 0xff9c8f, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })
  );
  tick.rotation.x = -Math.PI / 2;
  tick.rotation.z = i * Math.PI / 2;
  tick.position.set(Math.sin(i * Math.PI / 2) * 0.45, 0, Math.cos(i * Math.PI / 2) * 0.45);
  marker.add(tick);
}
marker.position.y = 0.025;
scene.add(marker);

scene.add(new THREE.HemisphereLight(0xd7e0f0, 0x25211e, 1.6));
const key = new THREE.DirectionalLight(0xffe5d1, 4.2);
key.position.set(3.5, 9, 5);
key.target.position.set(0, 0, -1);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -9;
key.shadow.camera.right = 9;
key.shadow.camera.top = 9;
key.shadow.camera.bottom = -9;
key.shadow.bias = -0.00025;
scene.add(key, key.target);
const redRim = new THREE.PointLight(0xff392d, 26, 8, 2);
redRim.position.set(-3, 2.5, -3.5);
scene.add(redRim);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();
const target = new THREE.Vector3();
const screenPoint = new THREE.Vector3();
const motion = {
  phase: 'idle',
  turnPurpose: 'travel',
  from: new THREE.Vector3(),
  to: new THREE.Vector3(),
  startYaw: 0,
  endYaw: 0,
  startedAt: 0,
  duration: 0,
  journey: null,
  targetHits: 0
};
const task = { active: false, station: null, startedAt: 0, duration: 4.8, progress: 0 };

const clampToRoom = value => THREE.MathUtils.clamp(value, -6.15, 6.15);
const wrapAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const easeOutBack = t => 1 + 1.35 * (t - 1) ** 3 + 0.35 * (t - 1) ** 2;
const ROBOT_WALK_SPEED = 3.1;
const ROBOT_STRIDE_DISTANCE = 1.22;
const STAIR_STEP_DURATION = 0.46;
const STAIR_FOOT_CLEARANCE = 0.24;
const ROBOT_SOLE_OFFSET = 0.015;
const stairClimbState = {
  doorHits: 0,
  active: false,
  completed: false,
  descentCompleted: false,
  direction: 'up',
  moveIndex: -1,
  stepProgress: 0,
  contacts: { left: null, right: null },
  moves: [],
  swingTarget: null,
  plants: [],
  descentPlants: [],
  statesPlayed: new Set(),
  maxContactError: 0
};
const stairIkTarget = new THREE.Vector3();
const stairActualContact = new THREE.Vector3();

function setStatus(label, busy = false) {
  statusText.textContent = label;
  statusDot.classList.toggle('busy', busy);
}

function resetRobotJoints() {
  robotBody.position.set(0, 0, 0);
  robotBody.rotation.set(0, 0, 0);
  torso.rotation.set(0, 0, 0);
  neck.rotation.set(0, 0, 0);
  head.rotation.set(0, 0, 0);
  leftArm.shoulder.rotation.set(0, 0, -0.18);
  rightArm.shoulder.rotation.set(0, 0, 0.18);
  leftArm.elbow.rotation.set(0, 0, 0);
  rightArm.elbow.rotation.set(0, 0, 0);
  leftArm.wrist.rotation.set(0, 0, 0);
  rightArm.wrist.rotation.set(0, 0, 0);
  leftLeg.hip.rotation.set(0, 0, 0);
  rightLeg.hip.rotation.set(0, 0, 0);
  leftLeg.knee.rotation.set(0, 0, 0);
  rightLeg.knee.rotation.set(0, 0, 0);
  leftLeg.ankle.rotation.set(0, 0, 0);
  rightLeg.ankle.rotation.set(0, 0, 0);
}

function resetCubePose() {
  cube.position.y = 0;
  cube.rotation.set(0, 0, 0);
  cube.scale.setScalar(1);
  resetRobotJoints();
  contactShadow.scale.setScalar(1);
  contactShadow.material.opacity = 0.2;
  headingMaterial.color.setHex(0x8fd5ec);
}

function startTurn(yaw, purpose) {
  motion.phase = 'turning';
  motion.turnPurpose = purpose;
  motion.startedAt = clock.elapsedTime;
  motion.startYaw = cubeRig.rotation.y;
  motion.endYaw = motion.startYaw + wrapAngle(yaw - motion.startYaw);
  motion.duration = THREE.MathUtils.clamp(Math.abs(motion.endYaw - motion.startYaw) * 0.34, 0.28, 0.72);
  setStatus(purpose === 'face' ? 'POSITIONING' : 'ALIGNING', true);
}

function beginMove(x, z, options = {}) {
  target.set(clampToRoom(x), 0, clampToRoom(z));
  motion.journey = { kind: 'floor', showMarker: true, finalYaw: null, onArrive: null, ...options };
  if (!String(motion.journey.kind).startsWith('network:')) {
    networkEventState.destination = null;
    networkEventState.lastPhase = null;
    networkEventState.workAnimation = false;
  }
  marker.position.set(target.x, 0.025, target.z);
  marker.visible = motion.journey.showMarker;
  marker.scale.setScalar(0.1);
  markerRing.material.opacity = 0.95;
  coordinates.innerHTML = `X ${target.x.toFixed(2)}&nbsp;&nbsp; Z ${target.z.toFixed(2)}`;

  if (robotSitProgress > 0.01) {
    robotStandStartedAt = clock.elapsedTime;
    robotStandStartProgress = robotSitProgress;
    robotStandFrames = 0;
    robotAnimationHistory.add('stand');
    motion.phase = 'standing';
    setStatus('STANDING', true);
    return;
  }
  continueMove();
}

function continueMove() {
  const dx = target.x - cubeRig.position.x;
  const dz = target.z - cubeRig.position.z;
  if (Math.hypot(dx, dz) < 0.05) {
    finishTravel();
    return;
  }
  startTurn(Math.atan2(dx, dz), 'travel');
}

function beginTravel() {
  motion.phase = 'moving';
  motion.startedAt = clock.elapsedTime;
  motion.from.copy(cubeRig.position);
  motion.to.copy(target);
  const distance = motion.from.distanceTo(motion.to);
  motion.duration = Math.max(distance / ROBOT_WALK_SPEED, 0.18);
  setStatus(motion.journey?.kind === 'return' ? 'RETURNING' : 'MOVING', true);
}

function finishTravel() {
  const journey = motion.journey;
  if (journey?.finalYaw != null && Math.abs(wrapAngle(journey.finalYaw - cubeRig.rotation.y)) > 0.025) {
    startTurn(journey.finalYaw, 'face');
    return;
  }
  completeJourney();
}

function completeJourney() {
  const callback = motion.journey?.onArrive;
  motion.journey = null;
  if (callback) callback();
  else {
    motion.phase = 'idle';
    setStatus('READY');
  }
}

function stairContact(foot, x, y, z, step = null, landing = false) {
  return { foot, x, y, z, step, landing };
}

function cloneStairContact(contact) {
  return contact ? { ...contact } : null;
}

function stairRootForContacts(contacts) {
  return new THREE.Vector3(
    (contacts.left.x + contacts.right.x) * 0.5,
    Math.max(0, Math.min(contacts.left.y, contacts.right.y) - ROBOT_SOLE_OFFSET),
    (contacts.left.z + contacts.right.z) * 0.5
  );
}

function prepareStairMove(index) {
  if (index >= stairClimbState.moves.length) {
    stairClimbState.active = false;
    stairClimbState.stepProgress = 1;
    motion.journey = null;
    motion.stairMove = null;
    marker.visible = false;

    if (stairClimbState.direction === 'down') {
      stairClimbState.descentCompleted = true;
      stairClimbState.statesPlayed.add('floor-return');
      motion.phase = 'idle';
      contactShadow.visible = true;
      setStatus('READY');
    } else {
      stairClimbState.completed = true;
      stairClimbState.statesPlayed.add('upper-landing');
      motion.phase = 'door-idle';
      setStatus('AT DOOR');
    }
    return;
  }

  const move = stairClimbState.moves[index];
  const nextContacts = {
    left: cloneStairContact(stairClimbState.contacts.left),
    right: cloneStairContact(stairClimbState.contacts.right)
  };
  nextContacts[move.foot] = cloneStairContact(move.to);
  stairClimbState.moveIndex = index;
  stairClimbState.stepProgress = 0;
  stairClimbState.swingTarget = cloneStairContact(move.from);
  motion.stairMove = {
    ...move,
    rootFrom: cubeRig.position.clone(),
    rootTo: stairRootForContacts(nextContacts)
  };
  motion.startedAt = clock.elapsedTime;
  motion.duration = move.step ? STAIR_STEP_DURATION : STAIR_STEP_DURATION * 1.1;
  const descending = stairClimbState.direction === 'down';
  motion.phase = descending ? 'stair-descending' : 'stair-climbing';
  stairClimbState.statesPlayed.add(descending ? 'stair-descend' : 'stair-climb');
  if (move.step) {
    const ordinal = descending ? STAIR_STEPS - move.step + 1 : move.step;
    setStatus(`${descending ? 'DESCENDING' : 'CLIMBING'} ${ordinal}/${STAIR_STEPS}`, true);
  } else {
    setStatus(descending ? 'LOWER LANDING' : 'UPPER LANDING', true);
  }
}

function startStairClimb() {
  const footOffset = 0.2;
  const initialX = STAIR_BOTTOM_POINT.x + STAIR_RUN * 0.9;
  stairClimbState.active = true;
  stairClimbState.completed = false;
  stairClimbState.descentCompleted = false;
  stairClimbState.direction = 'up';
  stairClimbState.moveIndex = -1;
  stairClimbState.stepProgress = 0;
  stairClimbState.plants = [];
  stairClimbState.descentPlants = [];
  stairClimbState.maxContactError = 0;
  stairClimbState.statesPlayed.add('stair-climb');
  stairClimbState.contacts = {
    left: stairContact('left', initialX, 0, STAIR_TOP_POINT.z - footOffset),
    right: stairContact('right', initialX, 0, STAIR_TOP_POINT.z + footOffset)
  };

  const contacts = {
    left: cloneStairContact(stairClimbState.contacts.left),
    right: cloneStairContact(stairClimbState.contacts.right)
  };
  stairClimbState.moves = stairTreads.map((tread, index) => {
    const foot = index % 2 === 0 ? 'left' : 'right';
    const from = cloneStairContact(contacts[foot]);
    const to = stairContact(
      foot,
      tread.center.x,
      tread.top,
      STAIR_TOP_POINT.z + (foot === 'left' ? -footOffset : footOffset),
      tread.step
    );
    contacts[foot] = cloneStairContact(to);
    return { foot, from, to, step: tread.step };
  });

  const landingTop = landingCenter.y + 0.04;
  const landingX = landingCenter.x + 0.18;
  for (const foot of ['right', 'left']) {
    const from = cloneStairContact(contacts[foot]);
    const to = stairContact(
      foot,
      landingX,
      landingTop,
      STAIR_TOP_POINT.z + (foot === 'left' ? -footOffset : footOffset),
      null,
      true
    );
    contacts[foot] = cloneStairContact(to);
    stairClimbState.moves.push({ foot, from, to, step: null });
  }

  cubeRig.position.set(initialX, 0, STAIR_TOP_POINT.z);
  cubeRig.rotation.y = -Math.PI / 2;
  contactShadow.visible = false;
  prepareStairMove(0);
}

function startStairDescent() {
  const footOffset = 0.2;
  const initialX = STAIR_BOTTOM_POINT.x + STAIR_RUN * 0.9;
  stairClimbState.active = true;
  stairClimbState.direction = 'down';
  stairClimbState.descentCompleted = false;
  stairClimbState.moveIndex = -1;
  stairClimbState.stepProgress = 0;
  stairClimbState.descentPlants = [];
  stairClimbState.maxContactError = 0;
  stairClimbState.statesPlayed.add('stair-descend');

  const ascentLeft = cloneStairContact(stairClimbState.contacts.left);
  const ascentRight = cloneStairContact(stairClimbState.contacts.right);
  stairClimbState.contacts = {
    left: { ...ascentRight, foot: 'left' },
    right: { ...ascentLeft, foot: 'right' }
  };
  const contacts = {
    left: cloneStairContact(stairClimbState.contacts.left),
    right: cloneStairContact(stairClimbState.contacts.right)
  };
  stairClimbState.moves = [...stairTreads].reverse().map((tread, index) => {
    const foot = index % 2 === 0 ? 'right' : 'left';
    const from = cloneStairContact(contacts[foot]);
    const to = stairContact(
      foot,
      tread.center.x,
      tread.top,
      STAIR_TOP_POINT.z + (foot === 'left' ? footOffset : -footOffset),
      tread.step
    );
    contacts[foot] = cloneStairContact(to);
    return { foot, from, to, step: tread.step };
  });

  for (const foot of ['left', 'right']) {
    const from = cloneStairContact(contacts[foot]);
    const to = stairContact(
      foot,
      initialX,
      0,
      STAIR_TOP_POINT.z + (foot === 'left' ? footOffset : -footOffset)
    );
    contacts[foot] = cloneStairContact(to);
    stairClimbState.moves.push({ foot, from, to, step: null });
  }

  cubeRig.rotation.y = Math.PI / 2;
  contactShadow.visible = false;
  prepareStairMove(0);
}

function startStairTurnaround() {
  motion.journey = {
    kind: 'stairs-turnaround',
    targetX: cubeRig.position.x,
    targetZ: cubeRig.position.z,
    targetY: cubeRig.position.y,
    finalYaw: Math.PI / 2,
    onArrive: startStairDescent
  };
  target.set(cubeRig.position.x, 0, cubeRig.position.z);
  motion.targetYaw = Math.PI / 2;
  motion.phase = 'turning';
  motion.startedAt = clock.elapsedTime;
  marker.visible = false;
  setStatus('TURNING DOWN', true);
}

function startDoorRoutine() {
  if (stairClimbState.active) return;
  stairClimbState.doorHits += 1;
  if (motion.phase === 'door-idle') {
    startStairTurnaround();
    return;
  }
  stairClimbState.completed = false;
  stairClimbState.statesPlayed = new Set(['approach']);
  task.active = false;
  task.station = null;
  task.progress = 0;
  workProgress.hidden = true;
  marker.visible = false;
  const approachX = STAIR_BOTTOM_POINT.x + STAIR_RUN * 0.9;
  beginMove(approachX, STAIR_TOP_POINT.z, {
    kind: 'stairs-approach',
    showMarker: false,
    finalYaw: -Math.PI / 2,
    onArrive: startStairClimb
  });
  setStatus('STAIR APPROACH', true);
}

function startStationTask(station) {
  if (task.active) return;
  task.active = true;
  task.station = station;
  task.progress = 0;
  station.hits += 1;
  beginMove(station.spot.x, station.spot.z, {
    kind: station.id,
    finalYaw: station.finalYaw,
    onArrive: startWorking
  });
}

function startWorking() {
  motion.phase = 'working';
  task.startedAt = clock.elapsedTime;
  task.progress = 0;
  marker.visible = false;
  workLabel.textContent = `${task.station.label} TASK`;
  workProgress.hidden = false;
  workPercent.textContent = '0%';
  workProgressFill.style.width = '0%';
  setStatus('WORKING 0%', true);
}

function finishTask() {
  task.active = false;
  task.station = null;
  motion.phase = 'idle';
  marker.visible = false;
  resetCubePose();
  setStatus('READY');
}

const configuredEventPort = new URLSearchParams(window.location.search).get('eventPort') || '8000';
const eventApiUrl = `${window.location.protocol}//${window.location.hostname}:${configuredEventPort}/event`;
const networkDestinations = {
  read: { id: 'workbench', spot: WORK_SPOT, finalYaw: -Math.PI / 2 },
  prepare: { id: 'workbench', spot: WORK_SPOT, finalYaw: -Math.PI / 2 },
  spec: { id: 'workbench', spot: WORK_SPOT, finalYaw: -Math.PI / 2 },
  implement: { id: 'desk', spot: DESK_SPOT, finalYaw: Math.PI / 2 },
  validate: { id: 'testbench', spot: TEST_BENCH_SPOT, finalYaw: Math.PI },
  review: { id: 'testbench', spot: TEST_BENCH_SPOT, finalYaw: Math.PI },
  submit: { id: 'testbench', spot: TEST_BENCH_SPOT, finalYaw: Math.PI },
  sync: { id: 'testbench', spot: TEST_BENCH_SPOT, finalYaw: Math.PI },
  waiting: { id: 'couch', spot: COUCH_SPOT, finalYaw: Math.PI },
  done: { id: 'couch', spot: COUCH_SPOT, finalYaw: Math.PI }
};
const networkEventState = {
  connection: 'connecting',
  lastPhase: null,
  destination: null,
  received: 0,
  lastId: null,
  endpoint: eventApiUrl,
  workAnimation: false
};

function routeNetworkEvent(event) {
  const destination = networkDestinations[event?.phase];
  if (!destination) return;

  task.active = false;
  task.station = null;
  task.progress = 0;
  workProgress.hidden = true;
  marker.visible = false;
  if (robotSitProgress <= 0.01) resetCubePose();

  networkEventState.lastPhase = event.phase;
  networkEventState.destination = destination.id;
  networkEventState.lastId = event.id || null;
  networkEventState.received += 1;
  networkEventState.workAnimation = destination.id !== 'couch';

  beginMove(destination.spot.x, destination.spot.z, {
    kind: `network:${event.phase}`,
    showMarker: false,
    finalYaw: destination.finalYaw,
    onArrive: () => {
      if (destination.id === 'couch') {
        robotSitStartedAt = clock.elapsedTime;
        robotSitProgress = 0;
        motion.phase = 'sitting';
      } else {
        motion.phase = 'network-working';
      }
      marker.visible = false;
      setStatus(event.phase.toUpperCase());
    }
  });
}

const eventStream = new EventSource(eventApiUrl);
eventStream.addEventListener('open', () => { networkEventState.connection = 'open'; });
eventStream.addEventListener('error', () => { networkEventState.connection = 'reconnecting'; });
eventStream.addEventListener('room-event', (message) => {
  try {
    routeNetworkEvent(JSON.parse(message.data));
  } catch {
    networkEventState.connection = 'invalid-event';
  }
});

function getHitStation() {
  return stations.find(station => raycaster.intersectObject(station.collider, false).length) || null;
}

function getHitCouch() {
  return raycaster.intersectObject(couchCollider, false).length > 0;
}

function getHitDoor() {
  return raycaster.intersectObject(doorCollider, false).length > 0;
}

function startCouchRoutine() {
  couchHits += 1;
  routeNetworkEvent({ phase: 'done', id: `couch-click-${couchHits}` });
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
}

function onPointerDown(event) {
  updatePointer(event);
  const station = getHitStation();
  if (station) {
    startStationTask(station);
    return;
  }
  if (getHitDoor()) {
    startDoorRoutine();
    return;
  }
  if (getHitCouch()) {
    startCouchRoutine();
    return;
  }
  if (task.active) return;
  const hit = raycaster.intersectObject(floor, false)[0];
  if (hit) {
    motion.targetHits += 1;
    beginMove(hit.point.x, hit.point.z, { kind: 'floor' });
  }
}

function onPointerMove(event) {
  updatePointer(event);
  canvas.style.cursor = (getHitStation() || getHitDoor() || getHitCouch()) ? 'pointer' : 'crosshair';
}
canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  if (width < 700) {
    camera.fov = 48;
    camera.position.set(9.8, 10.2, 15.5);
    camera.lookAt(0, 0.6, -1.2);
  } else {
    camera.fov = 39;
    camera.position.set(9.6, 8.4, 13.2);
    camera.lookAt(-1.8, 0.75, -0.7);
  }
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function updateProgressPosition() {
  screenPoint.set(cubeRig.position.x, 2.05, cubeRig.position.z).project(camera);
  workProgress.style.left = `${(screenPoint.x * 0.5 + 0.5) * window.innerWidth}px`;
  workProgress.style.top = `${(-screenPoint.y * 0.5 + 0.5) * window.innerHeight - 8}px`;
}

function applyWorkingPose(now) {
  const beat = Math.sin(now * 9.5);
  cube.position.y = 0.025 + Math.abs(Math.sin(now * 7.2)) * 0.045;
  cube.rotation.z = beat * 0.028;
  cube.rotation.x = Math.sin(now * 5.6) * 0.012;
  cube.scale.set(1 - Math.abs(beat) * 0.012, 1 + Math.abs(beat) * 0.018, 1);
  headingMaterial.color.setHSL(0.52, 0.88, 0.62 + Math.abs(beat) * 0.18);
}

function applySeatedPose(amount) {
  leftLeg.hip.rotation.x = -1.18 * amount;
  rightLeg.hip.rotation.x = -1.18 * amount;
  leftLeg.knee.rotation.x = 1.48 * amount;
  rightLeg.knee.rotation.x = 1.48 * amount;
  leftLeg.ankle.rotation.x = -0.3 * amount;
  rightLeg.ankle.rotation.x = -0.3 * amount;
  leftArm.shoulder.rotation.x = -0.24 * amount;
  rightArm.shoulder.rotation.x = -0.24 * amount;
  leftArm.elbow.rotation.x = -0.5 * amount;
  rightArm.elbow.rotation.x = -0.5 * amount;
  robotBody.position.y = -0.08 * amount;
  robotBody.position.z = -0.64 * amount;
  head.rotation.x = -0.04 * amount;
}

function applyStairLegIK(leg, contact) {
  cubeRig.updateMatrixWorld(true);
  stairIkTarget.set(contact.x, contact.y, contact.z);
  cubeRig.worldToLocal(stairIkTarget);

  const upperLength = 0.27;
  const lowerLength = 0.25;
  let forward = stairIkTarget.z - 0.1;
  let down = 0.66 - (stairIkTarget.y + 0.125);
  const minReach = Math.abs(upperLength - lowerLength) + 0.002;
  const maxReach = upperLength + lowerLength - 0.002;
  const rawReach = Math.hypot(forward, down);
  const reach = THREE.MathUtils.clamp(rawReach, minReach, maxReach);
  if (rawReach > 0.0001 && reach !== rawReach) {
    const scale = reach / rawReach;
    forward *= scale;
    down *= scale;
  }

  const kneeAngle = Math.acos(THREE.MathUtils.clamp(
    (reach * reach - upperLength * upperLength - lowerLength * lowerLength) / (2 * upperLength * lowerLength),
    -1,
    1
  ));
  const targetAngle = Math.atan2(forward, down);
  const correction = Math.atan2(
    lowerLength * Math.sin(kneeAngle),
    upperLength + lowerLength * Math.cos(kneeAngle)
  );
  const hipAngle = -targetAngle - correction;

  leg.hip.rotation.x = hipAngle;
  leg.knee.rotation.x = kneeAngle;
  leg.ankle.rotation.x = -(hipAngle + kneeAngle);
}

function stairFootContactWorld(leg, target = new THREE.Vector3()) {
  cubeRig.updateMatrixWorld(true);
  return leg.foot.localToWorld(target.set(0, -0.09, 0));
}

function applyStairClimbPose() {
  const activeMove = motion.stairMove;
  const stairMotionActive = motion.phase === 'stair-climbing' || motion.phase === 'stair-descending';
  const movingFoot = stairMotionActive ? activeMove?.foot : null;
  const leftTarget = movingFoot === 'left' ? stairClimbState.swingTarget : stairClimbState.contacts.left;
  const rightTarget = movingFoot === 'right' ? stairClimbState.swingTarget : stairClimbState.contacts.right;
  if (!leftTarget || !rightTarget) return;

  applyStairLegIK(leftLeg, leftTarget);
  applyStairLegIK(rightLeg, rightTarget);
  const swingDirection = movingFoot === 'left' ? 1 : movingFoot === 'right' ? -1 : 0;
  leftArm.shoulder.rotation.x = -0.24 - swingDirection * 0.24;
  rightArm.shoulder.rotation.x = -0.24 + swingDirection * 0.24;
  leftArm.elbow.rotation.x = -0.24;
  rightArm.elbow.rotation.x = -0.24;
  torso.rotation.x = -0.07;
  head.rotation.x = 0.045;

  cubeRig.updateMatrixWorld(true);
  for (const [foot, leg] of [['left', leftLeg], ['right', rightLeg]]) {
    if (foot === movingFoot) continue;
    const contact = stairClimbState.contacts[foot];
    if (!contact?.step) continue;
    const actual = stairFootContactWorld(leg, stairActualContact);
    const error = actual.distanceTo(new THREE.Vector3(contact.x, contact.y, contact.z));
    stairClimbState.maxContactError = Math.max(stairClimbState.maxContactError, error);
    const plantEvents = stairClimbState.direction === 'down'
      ? stairClimbState.descentPlants
      : stairClimbState.plants;
    const event = plantEvents.find(plant => plant.step === contact.step && plant.foot === foot);
    if (event) event.contactError = event.contactError == null ? error : Math.min(event.contactError, error);
  }
}

function updateRobotAnimation(now) {
  resetRobotJoints();
  if (motion.phase === 'stair-climbing' || motion.phase === 'stair-descending' || motion.phase === 'door-idle') {
    robotAnimationState = motion.phase === 'stair-descending'
      ? 'stair-descend'
      : motion.phase === 'stair-climbing' ? 'stair-climb' : 'idle';
    applyStairClimbPose();
  } else if (motion.phase === 'moving') {
    robotAnimationState = 'walk';
    const walkPhase = ((now - motion.startedAt) * ROBOT_WALK_SPEED / ROBOT_STRIDE_DISTANCE) * Math.PI * 2;
    const stride = Math.sin(walkPhase);
    const liftLeft = Math.max(0, stride);
    const liftRight = Math.max(0, -stride);
    leftLeg.hip.rotation.x = stride * 0.58;
    rightLeg.hip.rotation.x = -stride * 0.58;
    leftLeg.knee.rotation.x = liftLeft * 0.72;
    rightLeg.knee.rotation.x = liftRight * 0.72;
    leftLeg.ankle.rotation.x = -leftLeg.knee.rotation.x * 0.48;
    rightLeg.ankle.rotation.x = -rightLeg.knee.rotation.x * 0.48;
    leftArm.shoulder.rotation.x = -stride * 0.48;
    rightArm.shoulder.rotation.x = stride * 0.48;
    leftArm.elbow.rotation.x = -0.18 - Math.max(0, -stride) * 0.28;
    rightArm.elbow.rotation.x = -0.18 - Math.max(0, stride) * 0.28;
    torso.rotation.z = stride * 0.035;
    head.rotation.y = -stride * 0.055;
  } else if (motion.phase === 'working' || motion.phase === 'network-working') {
    robotAnimationState = 'work';
    const workBeat = Math.sin(now * 7.4);
    const alternate = Math.sin(now * 7.4 + Math.PI);
    leftArm.shoulder.rotation.x = -0.82 + workBeat * 0.2;
    rightArm.shoulder.rotation.x = -0.82 + alternate * 0.2;
    leftArm.elbow.rotation.x = -0.92 + alternate * 0.16;
    rightArm.elbow.rotation.x = -0.92 + workBeat * 0.16;
    leftArm.wrist.rotation.z = workBeat * 0.16;
    rightArm.wrist.rotation.z = alternate * 0.16;
    head.rotation.x = 0.08 + Math.abs(workBeat) * 0.055;
    torso.rotation.x = 0.045;
  } else if (motion.phase === 'standing') {
    robotAnimationState = 'stand';
    applySeatedPose(robotSitProgress);
  } else if ((motion.phase === 'sitting' || motion.phase === 'idle') && networkEventState.destination === 'couch' && ['waiting', 'done'].includes(networkEventState.lastPhase)) {
    robotAnimationState = 'sit';
    applySeatedPose(motion.phase === 'sitting' ? robotSitProgress : 1);
  } else {
    robotAnimationState = 'idle';
    const breath = Math.sin(now * 1.8);
    head.rotation.y = breath * 0.025;
    leftArm.wrist.rotation.z = breath * 0.025;
    rightArm.wrist.rotation.z = -breath * 0.025;
  }
  robotAnimationHistory.add(robotAnimationState);
  robotMaxHipSwing = Math.max(robotMaxHipSwing, Math.abs(leftLeg.hip.rotation.x), Math.abs(rightLeg.hip.rotation.x));
}

function updateStairClimbing(now) {
  const move = motion.stairMove;
  if (!move) return;
  const raw = Math.min((now - motion.startedAt) / motion.duration, 1);
  const eased = raw * raw * (3 - 2 * raw);
  stairClimbState.stepProgress = raw;
  cubeRig.position.lerpVectors(move.rootFrom, move.rootTo, eased);

  stairClimbState.swingTarget = stairContact(
    move.foot,
    THREE.MathUtils.lerp(move.from.x, move.to.x, eased),
    THREE.MathUtils.lerp(move.from.y, move.to.y, eased) + Math.sin(raw * Math.PI) * STAIR_FOOT_CLEARANCE,
    THREE.MathUtils.lerp(move.from.z, move.to.z, eased),
    move.to.step,
    move.to.landing
  );

  if (raw >= 1) {
    cubeRig.position.copy(move.rootTo);
    stairClimbState.contacts[move.foot] = cloneStairContact(move.to);
    if (move.step) {
      const plantEvents = stairClimbState.direction === 'down'
        ? stairClimbState.descentPlants
        : stairClimbState.plants;
      plantEvents.push({
        step: move.step,
        foot: move.foot,
        targetY: move.to.y,
        treadTop: stairTreads[move.step - 1].top,
        contactError: null
      });
    }
    prepareStairMove(stairClimbState.moveIndex + 1);
  }
}

function updateMotion(now) {
  marker.rotation.y += 0.008;
  if (marker.visible && marker.scale.x < 0.999) {
    const s = THREE.MathUtils.lerp(marker.scale.x, 1, 0.18);
    marker.scale.setScalar(s);
  }

  if (motion.phase === 'stair-climbing' || motion.phase === 'stair-descending') {
    updateStairClimbing(now);
  } else if (motion.phase === 'standing') {
    robotStandFrames += 1;
    const rawStand = Math.min((now - robotStandStartedAt) / 0.72, 1);
    const easedStand = rawStand * rawStand * (3 - 2 * rawStand);
    robotSitProgress = robotStandStartProgress * (1 - easedStand);
    if (rawStand >= 1 && robotStandFrames >= 2) {
      robotSitProgress = 0;
      resetCubePose();
      continueMove();
    }
  } else if (motion.phase === 'turning') {
    const t = Math.min((now - motion.startedAt) / motion.duration, 1);
    cubeRig.rotation.y = THREE.MathUtils.lerp(motion.startYaw, motion.endYaw, easeOutBack(t));
    cube.scale.set(1 - Math.sin(t * Math.PI) * 0.04, 1 + Math.sin(t * Math.PI) * 0.055, 1 - Math.sin(t * Math.PI) * 0.04);
    if (t >= 1) {
      cubeRig.rotation.y = motion.endYaw;
      resetCubePose();
      if (motion.turnPurpose === 'travel') beginTravel();
      else completeJourney();
    }
  } else if (motion.phase === 'moving') {
    const t = Math.min((now - motion.startedAt) / motion.duration, 1);
    cubeRig.position.lerpVectors(motion.from, motion.to, t);
    const walkPhase = ((now - motion.startedAt) * ROBOT_WALK_SPEED / ROBOT_STRIDE_DISTANCE) * Math.PI * 2;
    const pulse = Math.abs(Math.sin(walkPhase));
    cube.position.y = pulse * 0.035;
    cube.rotation.z = Math.sin(walkPhase) * 0.009;
    contactShadow.scale.setScalar(1 - pulse * 0.1);
    contactShadow.material.opacity = 0.2 - pulse * 0.035;
    if (t >= 1) {
      cubeRig.position.copy(motion.to);
      resetCubePose();
      finishTravel();
    }
  } else if (motion.phase === 'sitting') {
    const rawSit = Math.min((now - robotSitStartedAt) / 0.8, 1);
    robotSitProgress = rawSit * rawSit * (3 - 2 * rawSit);
    if (rawSit >= 1) motion.phase = 'idle';
  } else if (motion.phase === 'network-working') {
    workProgress.hidden = true;
    applyWorkingPose(now);
  } else if (motion.phase === 'working') {
    const t = Math.min((now - task.startedAt) / task.duration, 1);
    task.progress = Math.min(100, Math.floor(t * 100));
    workPercent.textContent = `${task.progress}%`;
    workProgressFill.style.width = `${task.progress}%`;
    setStatus(`WORKING ${task.progress}%`, true);
    updateProgressPosition();

    applyWorkingPose(now);

    if (t >= 1) {
      task.progress = 100;
      workPercent.textContent = '100%';
      workProgressFill.style.width = '100%';
      workProgress.hidden = true;
      resetCubePose();
      beginMove(HOME.x, HOME.z, { kind: 'return', showMarker: false, onArrive: finishTask });
    }
  }
}

function countVisibleGeometryVertices() {
  let vertices = 0;
  scene.traverseVisible((object) => {
    if (!(object.isMesh || object.isLine || object.isPoints)) return;
    const position = object.geometry?.getAttribute?.('position');
    if (!position) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const contributes = materials.some((material) => material && material.visible !== false && !(material.transparent && material.opacity === 0));
    if (contributes) vertices += position.count;
  });
  return vertices;
}

const performanceMetrics = {
  vertices: countVisibleGeometryVertices(),
  fps: 0,
  frames: 0,
  lastSample: performance.now()
};
vertexCountText.textContent = performanceMetrics.vertices.toLocaleString('en-US');

function updatePerformanceMetrics(timestamp) {
  const now = Number.isFinite(timestamp) ? timestamp : performance.now();
  if (!performanceMetrics.lastSample) {
    performanceMetrics.lastSample = now;
    return;
  }
  performanceMetrics.frames += 1;
  const sampleDuration = now - performanceMetrics.lastSample;
  if (sampleDuration < 750) return;
  performanceMetrics.fps = Math.max(1, Math.round(performanceMetrics.frames * 1000 / sampleDuration));
  performanceMetrics.vertices = countVisibleGeometryVertices();
  performanceMetrics.frames = 0;
  performanceMetrics.lastSample = now;
  vertexCountText.textContent = performanceMetrics.vertices.toLocaleString('en-US');
  fpsCountText.textContent = `${performanceMetrics.fps} FPS`;
}

function animate(timestamp) {
  clock.getDelta();
  const now = clock.elapsedTime;
  updateMotion(now);
  updateRobotAnimation(now);
  updateOscilloscopeDisplay(now);
  updateReviewMonitor(now);
  if (motion.phase === 'idle' && robotAnimationState !== 'sit') cube.position.y = Math.sin(now * 1.55) * 0.006;
  if (robotAnimationState === 'sit') cube.position.y = 0;
  markerRing.material.opacity = marker.visible ? 0.55 + Math.sin(now * 4) * 0.22 : 0;
  redRim.intensity = 25 + Math.sin(now * 0.8) * 2;
  renderer.render(scene, camera);
  updatePerformanceMetrics(timestamp);
}
renderer.setAnimationLoop(animate);

function stationScreen(station) {
  const point = new THREE.Vector3(0, 1.35, 0);
  station.group.localToWorld(point).project(camera);
  return {
    x: (point.x * 0.5 + 0.5) * window.innerWidth,
    y: (-point.y * 0.5 + 0.5) * window.innerHeight
  };
}

function couchScreen() {
  const point = new THREE.Vector3(0, 0.72, 0);
  lounge.localToWorld(point).project(camera);
  return {
    x: (point.x * 0.5 + 0.5) * window.innerWidth,
    y: (-point.y * 0.5 + 0.5) * window.innerHeight
  };
}

function doorScreen() {
  const point = new THREE.Vector3(0, 0, 0);
  elevatedDoor.localToWorld(point).project(camera);
  return {
    x: (point.x * 0.5 + 0.5) * window.innerWidth,
    y: (-point.y * 0.5 + 0.5) * window.innerHeight
  };
}

const stationById = id => stations.find(station => station.id === id);

window.__ROOM__ = {
  ready: true,
  moveTo: (x, z) => { if (!task.active) beginMove(x, z, { kind: 'floor' }); },
  useWorkbench: () => startStationTask(stationById('workbench')),
  useDesk: () => startStationTask(stationById('desk')),
  useTestBench: () => startStationTask(stationById('testbench')),
  setWorkDuration: seconds => { task.duration = Math.max(0.25, Number(seconds) || 4.8); },
  workbenchScreen: () => stationScreen(stationById('workbench')),
  deskScreen: () => stationScreen(stationById('desk')),
  testBenchScreen: () => stationScreen(stationById('testbench')),
  couchScreen,
  doorScreen,
  climbStairs: startDoorRoutine,
  snapshot: () => ({
    phase: motion.phase,
    status: statusText.textContent,
    position: { x: cubeRig.position.x, y: cubeRig.position.y, z: cubeRig.position.z },
    target: { x: target.x, z: target.z },
    yaw: cubeRig.rotation.y,
    targetHits: motion.targetHits,
    workbenchHits: stationById('workbench').hits,
    deskHits: stationById('desk').hits,
    testBenchHits: stationById('testbench').hits,
    workProgress: task.progress,
    taskActive: task.active,
    activeStation: task.station?.id || null,
    cubePoseY: cube.position.y,
    couchHits,
    stairClimb: {
      doorHits: stairClimbState.doorHits,
      active: stairClimbState.active,
      completed: stairClimbState.completed,
      descentCompleted: stairClimbState.descentCompleted,
      direction: stairClimbState.direction,
      moveIndex: stairClimbState.moveIndex,
      stepProgress: stairClimbState.stepProgress,
      movingFoot: (motion.phase === 'stair-climbing' || motion.phase === 'stair-descending')
        ? motion.stairMove?.foot || null
        : null,
      plants: stairClimbState.plants.map(plant => ({ ...plant })),
      descentPlants: stairClimbState.descentPlants.map(plant => ({ ...plant })),
      statesPlayed: [...stairClimbState.statesPlayed],
      maxContactError: stairClimbState.maxContactError,
      footClearance: STAIR_FOOT_CLEARANCE,
      stepDuration: STAIR_STEP_DURATION
    },
    robot: {
      name: cube.name,
      articulated: true,
      parts: robotPartNames.length,
      joints: Object.keys(robotJoints),
      animation: robotAnimationState,
      hasScreenFace: robotPartNames.includes('FaceScreen'),
      hasAntenna: robotPartNames.includes('AntennaCap'),
      hasClaws: robotPartNames.includes('LeftClawOuter') && robotPartNames.includes('RightClawOuter'),
      leftHipAngle: leftLeg.hip.rotation.x,
      rightHipAngle: rightLeg.hip.rotation.x,
      leftKneeAngle: leftLeg.knee.rotation.x,
      rightKneeAngle: rightLeg.knee.rotation.x,
      leftShoulderAngle: leftArm.shoulder.rotation.x,
      rightShoulderAngle: rightArm.shoulder.rotation.x,
      locomotionEasing: 'linear-distance-synchronized',
      walkSpeed: ROBOT_WALK_SPEED,
      strideDistance: ROBOT_STRIDE_DISTANCE,
      statesPlayed: [...robotAnimationHistory],
      maxHipSwing: robotMaxHipSwing,
      hipSwingAmplitude: 0.58,
      sitProgress: robotSitProgress,
      bodyOffsetZ: robotBody.position.z,
      headAspectRatio: 0.88 / 0.56,
      armReach: 0.46,
      legReach: 0.52
    },
    workbench: { x: workbench.position.x, z: workbench.position.z },
    desk: { x: desk.position.x, z: desk.position.z },
    testBench: { x: testBench.position.x, z: testBench.position.z },
    performance: {
      vertices: performanceMetrics.vertices,
      fps: performanceMetrics.fps
    },
    network: {
      connection: networkEventState.connection,
      lastPhase: networkEventState.lastPhase,
      destination: networkEventState.destination,
      received: networkEventState.received,
      lastId: networkEventState.lastId,
      endpoint: networkEventState.endpoint,
      workAnimation: networkEventState.workAnimation
    },
    screens: {
      oscilloscope: {
        type: oscilloscopeScreenState.type,
        animated: oscilloscopeScreenState.animated,
        mode: oscilloscopeScreenState.mode,
        width: oscilloscopeScreenState.width,
        height: oscilloscopeScreenState.height,
        updates: oscilloscopeScreenState.updates,
        phase: oscilloscopeScreenState.phase
      },
      reviewMonitor: {
        type: reviewMonitorState.type,
        animated: reviewMonitorState.animated,
        mode: reviewMonitorState.mode,
        glowing: reviewMonitorState.glowing,
        width: reviewMonitorState.width,
        height: reviewMonitorState.height,
        updates: reviewMonitorState.updates,
        cursor: reviewMonitorState.cursor
      }
    },
    architecture: {
      staircase: {
        steps: STAIR_STEPS,
        topElevation: STAIR_TOP,
        hasLanding: Boolean(stairwell.getObjectByName('UpperLanding')),
        landingDepth: LANDING_DEPTH,
        hasExtraPlatform: Boolean(stairwell.getObjectByName('LandingDeck')),
        hasRail: Boolean(stairwell.getObjectByName('StairHandrail')),
        corner: 'front-left',
        orientation: 'straight-front-wall',
        wallSide: 'front',
        wallClearance: 7 - (STAIR_TOP_POINT.z + 0.77),
        bottom: { x: STAIR_BOTTOM_POINT.x, z: STAIR_BOTTOM_POINT.z },
        top: { x: STAIR_TOP_POINT.x, z: STAIR_TOP_POINT.z },
        railingSide: 'open-room-facing'
      },
      door: {
        elevated: Boolean(stairwell.getObjectByName('ElevatedDoor')),
        wall: 'left',
        color: 'red',
        bottom: doorBottom,
        position: { x: -6.91, y: doorBottom + doorHeight / 2, z: doorZ + stairwell.position.z }
      },
      doorPipes: {
        count: pipeSpecs.length,
        side: 'right-of-door',
        behindStairwell: pipeSpecs.every((spec) => spec.z < STAIR_TOP_POINT.z - 0.7),
        bottom: pipeBottom,
        top: doorPipeTop,
        turnsAtCeiling: pipeSpecs.every((_, index) => Boolean(doorPipeAssembly.getObjectByName(`DoorPipeElbow${index + 1}`))),
        runsOverDoor: pipeSpecs.every((_, index) => Boolean(doorPipeAssembly.getObjectByName(`DoorPipeOverDoor${index + 1}`)))
      },
      planningBench: {
        ...planningBenchVisual.userData.sculptRuntime,
        colliderPreserved: workbenchCollider.parent === workbench,
        semanticGroups: planningBenchVisual.children.map(child => child.name),
        meshCount: (() => {
          let count = 0;
          planningBenchVisual.traverse(child => { if (child.isMesh) count += 1; });
          return count;
        })()
      },
      lounge: {
        corner: 'front-right',
        position: { x: lounge.position.x, z: lounge.position.z },
        chaiseSide: 'left',
        seatCushions: loungeSeatCushions.length,
        hasCoffeeTable: Boolean(lounge.getObjectByName('CoffeeTable')),
        hasRug: Boolean(lounge.getObjectByName('LoungeRug')),
        plants: loungePlants.length,
        magazines: loungeMagazines.length,
        clearOfDesk: lounge.position.z - 3.825 > desk.position.z + 1.9
      },
      plants: {
        model: deskPlant.userData.sculptRuntime.model,
        desk: {
          count: 1,
          leafCount: deskPlant.userData.sculptRuntime.leafCount,
          potSides: deskPlant.userData.sculptRuntime.potSides
        },
        coffeeTable: {
          count: loungePlants.length,
          leafCount: loungePlants[0].userData.sculptRuntime.leafCount,
          potSides: loungePlants[0].userData.sculptRuntime.potSides
        },
        total: 1 + loungePlants.length,
        volumetricLeaves: deskPlant.userData.sculptRuntime.volumetricLeaves,
        flatShaded: deskPlant.userData.sculptRuntime.flatShaded
      },
      backWallUtilities: {
        shelves: shelfLevels.length,
        tools: utilityTools.length,
        books: utilityBooks.length,
        hasOscilloscope: Boolean(backWallUtilities.getObjectByName('Oscilloscope')),
        hasElectricalPanel: Boolean(electricalPanel.getObjectByName('VoltagePanelCabinet')),
        hasVoltageSymbol: Boolean(electricalPanel.getObjectByName('VoltageSymbol')),
        conduitTop
      }
    },
    textures: {
      floor: {
        style: floorTextures.style,
        map: floorMaterial.map?.name || null,
        bumpMap: floorMaterial.bumpMap?.name || null,
        repeat: floorMaterial.map ? floorMaterial.map.repeat.toArray() : null
      },
      walls: {
        style: wallTextures.style,
        map: wallMaterial.map?.name || null,
        bumpMap: wallMaterial.bumpMap?.name || null,
        repeat: wallMaterial.map ? wallMaterial.map.repeat.toArray() : null
      }
    },
    renderer: renderer.info.render
  })
};
