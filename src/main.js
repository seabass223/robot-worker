import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { createCentralRobotBay } from './reference/centralRobotBay.js';
import { createLeftWorkshopDetails } from './reference/leftWorkshopDetails.js';
import { createRightLoungeDetails } from './reference/rightLoungeDetails.js';
import { createCompositionDensityFill } from './reference/compositionDensityFill.js';
import { createStrictReferenceDetailFill } from './reference/strictReferenceDetailFill.js';
import './style.css';

const pageParams = new URLSearchParams(window.location.search);
const legacyAoMode = pageParams.get('legacyAo') === '1';
const showcaseBloom = !legacyAoMode
  && (pageParams.get('bloom') === '1' || (!navigator.webdriver && pageParams.get('bloom') !== '0'));
if (pageParams.get('cinematicCapture') === '1') document.documentElement.classList.add('cinematic-capture');

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
const drawCallCountText = document.querySelector('#draw-call-count');
const editModeToggle = document.querySelector('#edit-mode-toggle');
const editorModeButtons = document.querySelector('#editor-mode-buttons');
const editorSelection = document.querySelector('#editor-selection');
const saveLayoutButton = document.querySelector('#save-layout');
const layoutExport = document.querySelector('#layout-export');
const layoutJson = document.querySelector('#layout-json');
const copyLayoutJsonButton = document.querySelector('#copy-layout-json');
const closeLayoutExportButton = document.querySelector('#close-layout-export');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);
scene.fog = new THREE.Fog(0x0b0d12, 17, 30);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = legacyAoMode ? 1.05 : 0.62;

const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 50);
camera.position.set(10.4, 9.6, 14.2);
camera.lookAt(0.15, 0.9, -0.45);

let composer = null;
if (showcaseBloom) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.24,
    0.35,
    0.80
  ));
  composer.addPass(new OutputPass());
}

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
        const value = 49 + Math.floor((random() - 0.5) * 11);
        colorContext.fillStyle = `rgb(${value},${value + 3},${value + 6})`;
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
  bumpScale: 0.085,
  roughness: 0.68,
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
  bumpScale: 0.18,
  roughness: 0.88,
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

  const indicesByMaterial = [[], [], []];
  const addTriangle = (a, b, c, materialIndex) => {
    indicesByMaterial[materialIndex].push(a, b, c);
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

  const indices = [];
  const groups = [];
  for (let materialIndex = 0; materialIndex < indicesByMaterial.length; materialIndex++) {
    const materialIndices = indicesByMaterial[materialIndex];
    if (!materialIndices.length) continue;
    const start = indices.length;
    indices.push(...materialIndices);
    groups.push({ start, count: materialIndices.length, materialIndex });
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

function createFacetedTerracottaPlant(name, scale = 1, preserveMaterialArray = false) {
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
  for (const [leafIndex, spec] of leafSpecs.entries()) {
    const leafPivot = new THREE.Group();
    leafPivot.name = `${spec.name}Pivot`;
    leafPivot.position.set(spec.x, 0.61, spec.z);
    leafPivot.rotation.y = spec.yaw;
    const leaf = new THREE.Mesh(
      createFacetedLeafGeometry(spec.height, spec.width, spec.thickness, spec.bendX, spec.bendZ),
      preserveMaterialArray && leafIndex === 0
        ? plantLeafMaterials
        : plantLeafMaterials[leafIndex % plantLeafMaterials.length]
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
const stairStepLightMat = new THREE.MeshStandardMaterial({ color: 0xffc06b, emissive: 0xff8a32, emissiveIntensity: 3.2, roughness: 0.32 });
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
  box([0.035, 0.065, 0.9], stairStepLightMat, [center.x + STAIR_RUN * 0.52, Math.max(0.12, height - 0.12), center.z], stairwell, `StairStepLight${i + 1}`);
  stairTreads.push({ step: i + 1, center: center.clone(), top: height + 0.07, mesh: tread });
}
for (const stepIndex of [2, 7]) {
  const step = stairTreads[stepIndex];
  const glow = new THREE.PointLight(0xffa34c, 2.4, 2.1, 2);
  glow.name = `StairWarmPool${stepIndex + 1}`;
  glow.position.set(step.center.x + 0.35, step.top + 0.18, step.center.z);
  stairwell.add(glow);
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
const stairLight = new THREE.PointLight(0xff7566, 8.5, 3.8, 2);
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
  const benchLight = new THREE.PointLight(0xffd2a5, 6.5, 3.0, 2);
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
desk.position.set(5.55, 0, -0.85);
desk.scale.set(1.25, 1, 1.22);
scene.add(desk);
const deskTopMat = new THREE.MeshStandardMaterial({ color: 0x806b56, roughness: 0.48, metalness: 0.03 });
const deskEdgeMat = new THREE.MeshStandardMaterial({ color: 0x563d2d, roughness: 0.56, metalness: 0.02 });
const deskFrameMat = new THREE.MeshStandardMaterial({ color: 0x1d2024, roughness: 0.35, metalness: 0.72 });
const deskElectronicsMat = new THREE.MeshStandardMaterial({ color: 0x24282d, roughness: 0.42, metalness: 0.35 });
const deskConeMat = new THREE.MeshStandardMaterial({ color: 0x587b89, roughness: 0.5, metalness: 0.2 });
const deskCopperMat = new THREE.MeshStandardMaterial({ color: 0xc96f32, roughness: 0.36, metalness: 0.42 });
const deskCyanMat = new THREE.MeshStandardMaterial({ color: 0x55d9f5, roughness: 0.25, emissive: 0x1689a4, emissiveIntensity: 1.25 });
const deskCeramicMat = new THREE.MeshStandardMaterial({ color: 0xe4ddd0, roughness: 0.62, metalness: 0 });
const reviewScreenBackingMat = new THREE.MeshStandardMaterial({ color: 0x081018, roughness: 0.18, metalness: 0.15, emissive: 0x0d3349, emissiveIntensity: 0.85 });
const keyMat = new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.5, metalness: 0.35 });

const softwareStationStructure = new THREE.Group();
softwareStationStructure.name = 'SoftwareStationStructure';
desk.add(softwareStationStructure);
const softwareStationDisplay = new THREE.Group();
softwareStationDisplay.name = 'SoftwareStationDisplay';
desk.add(softwareStationDisplay);
const softwareStationAccessories = new THREE.Group();
softwareStationAccessories.name = 'SoftwareStationAccessories';
desk.add(softwareStationAccessories);
const softwareStationUnderDesk = new THREE.Group();
softwareStationUnderDesk.name = 'SoftwareStationUnderDesk';
desk.add(softwareStationUnderDesk);

box([1.25, 0.15, 3.5], deskTopMat, [0, 1.28, 0], softwareStationStructure, 'DeskTop');
box([0.08, 0.17, 3.54], deskEdgeMat, [-0.59, 1.275, 0], softwareStationStructure, 'WalnutFrontEdge');
for (const z of [-1.4, 1.4]) {
  rodBetween(new THREE.Vector3(-0.38, 1.2, z), new THREE.Vector3(-0.54, 0.05, z), 0.058, deskFrameMat, softwareStationStructure, `TrestleFront${z}`);
  rodBetween(new THREE.Vector3(0.34, 1.2, z), new THREE.Vector3(0.52, 0.05, z), 0.058, deskFrameMat, softwareStationStructure, `TrestleRear${z}`);
  rodBetween(new THREE.Vector3(-0.48, 0.2, z), new THREE.Vector3(0.45, 1.1, z), 0.034, deskFrameMat, softwareStationStructure, `TrestleBrace${z}`);
}
box([0.1, 0.1, 2.62], deskFrameMat, [0.14, 0.17, 0], softwareStationStructure, 'DeskLowerStretcher');
box([0.1, 0.1, 2.9], deskFrameMat, [0.38, 1.13, 0], softwareStationStructure, 'RearCableRail');

for (const z of [-1.18, 1.18]) box([0.08, 1.16, 0.08], deskFrameMat, [0.38, 2.03, z], softwareStationDisplay, 'OverheadFramePost');
box([0.08, 0.08, 2.44], deskFrameMat, [0.38, 2.61, 0], softwareStationDisplay, 'OverheadFrameTopRail');
box([0.08, 0.07, 2.44], deskFrameMat, [0.38, 1.48, 0], softwareStationDisplay, 'OverheadFrameLowerRail');
const monitor = box([0.14, 0.9, 1.45], deskFrameMat, [0.23, 2.02, -0.22], softwareStationDisplay, 'ComputerMonitor');
const monitorScreen = box([0.018, 0.72, 1.25], reviewScreenBackingMat, [0.151, 2.02, -0.22], softwareStationDisplay, 'MonitorScreen');
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
reviewMonitorDisplay.position.set(0.14, 2.02, -0.22);
reviewMonitorDisplay.rotation.y = -Math.PI / 2;
reviewMonitorDisplay.castShadow = false;
softwareStationDisplay.add(reviewMonitorDisplay);
// Present the actual screen toward the cutaway camera and reduce the rear
// housing's foreground silhouette without changing desk interaction geometry.
monitorScreen.position.x = 0.305;
reviewMonitorDisplay.position.x = 0.315;
reviewMonitorDisplay.rotation.y = Math.PI / 2;
softwareStationDisplay.scale.set(1.0, 0.95, 1.05);
softwareStationDisplay.position.y = 0.1;

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
box([0.08, 0.48, 0.1], deskFrameMat, [0.18, 1.53, -0.22], softwareStationDisplay, 'MonitorStand');
box([0.36, 0.05, 0.58], deskFrameMat, [0.05, 1.36, -0.22], softwareStationDisplay, 'MonitorBase');
box([0.54, 0.018, 1.75], keyMat, [-0.31, 1.369, -0.18], softwareStationAccessories, 'DeskMat');
const keyboard = box([0.48, 0.055, 1.15], keyMat, [-0.39, 1.405, -0.28], softwareStationAccessories, 'Keyboard');
keyboard.rotation.z = 0.015;
for (let row = 0; row < 4; row++) {
  for (let col = 0; col < 9; col++) {
    box([0.075, 0.016, 0.075], deskFrameMat, [-0.62 + row * 0.105, 1.444, -0.6 + col * 0.08], softwareStationAccessories, `DeskKey${row}-${col}`);
  }
}
const deskMouse = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 7), deskElectronicsMat);
deskMouse.name = 'DeskMouse';
deskMouse.scale.set(0.46, 0.18, 0.7);
deskMouse.position.set(-0.44, 1.405, 0.52);
deskMouse.castShadow = true;
softwareStationAccessories.add(deskMouse);

function addDeskSpeaker(name, z, height, width) {
  const speaker = new THREE.Group();
  speaker.name = name;
  softwareStationAccessories.add(speaker);
  box([0.22, height, width], deskElectronicsMat, [0, 1.34 + height / 2, z], speaker, `${name}Cabinet`);
  for (const [offsetY, radius] of [[height * 0.22, width * 0.15], [-height * 0.12, width * 0.28]]) {
    const driver = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.025, 16), deskConeMat);
    driver.name = `${name}Driver`;
    driver.rotation.z = Math.PI / 2;
    driver.position.set(-0.125, 1.34 + height / 2 + offsetY, z);
    driver.castShadow = true;
    speaker.add(driver);
  }
  return speaker;
}
const leftDeskSpeaker = addDeskSpeaker('LeftDeskSpeaker', -1.03, 0.34, 0.27);
const rightDeskSpeaker = addDeskSpeaker('RightDeskSpeaker', 0.62, 0.5, 0.32);

const deskFan = new THREE.Group();
deskFan.name = 'DeskFan';
softwareStationAccessories.add(deskFan);
const fanCenter = new THREE.Vector3(-0.3, 1.82, -1.31);
const fanRing = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 8, 24), deskCeramicMat);
fanRing.rotation.y = Math.PI / 2;
fanRing.position.copy(fanCenter);
fanRing.castShadow = true;
deskFan.add(fanRing);
for (let i = 0; i < 12; i++) {
  const angle = i / 12 * Math.PI * 2;
  const start = fanCenter.clone().add(new THREE.Vector3(0, Math.sin(angle) * 0.045, Math.cos(angle) * 0.045));
  const end = fanCenter.clone().add(new THREE.Vector3(0, Math.sin(angle + 0.25) * 0.17, Math.cos(angle + 0.25) * 0.17));
  rodBetween(start, end, 0.014, deskFrameMat, deskFan, `DeskFanBlade${i + 1}`);
}
const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 12), deskElectronicsMat);
fanHub.rotation.z = Math.PI / 2;
fanHub.position.copy(fanCenter);
deskFan.add(fanHub);
rodBetween(new THREE.Vector3(-0.24, 1.39, -1.31), new THREE.Vector3(-0.29, 1.62, -1.31), 0.022, deskFrameMat, deskFan, 'DeskFanStand');

const taskLamp = new THREE.Group();
taskLamp.name = 'SoftwareTaskLamp';
softwareStationAccessories.add(taskLamp);
rodBetween(new THREE.Vector3(0.02, 1.36, -1.48), new THREE.Vector3(0.03, 1.92, -1.48), 0.025, deskFrameMat, taskLamp, 'LampPost');
rodBetween(new THREE.Vector3(0.03, 1.92, -1.48), new THREE.Vector3(-0.2, 2.18, -1.25), 0.028, deskCopperMat, taskLamp, 'LampArm');
const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.2, 10, 1, true), deskCopperMat);
lampShade.name = 'LampShade';
lampShade.rotation.z = Math.PI / 2.5;
lampShade.position.set(-0.24, 2.15, -1.2);
lampShade.castShadow = true;
taskLamp.add(lampShade);

const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.15, 12), deskCeramicMat);
mug.name = 'SoftwareDeskMug';
mug.position.set(-0.15, 1.43, -0.82);
mug.castShadow = true;
softwareStationAccessories.add(mug);

box([0.68, 0.62, 0.52], deskElectronicsMat, [0.12, 0.86, -1.05], softwareStationUnderDesk, 'DeskDrawerCabinet');
for (let i = 0; i < 2; i++) {
  box([0.035, 0.23, 0.45], keyMat, [-0.235, 0.99 - i * 0.27, -1.05], softwareStationUnderDesk, `DeskDrawer${i + 1}`);
  box([0.025, 0.025, 0.18], deskCeramicMat, [-0.26, 0.99 - i * 0.27, -1.05], softwareStationUnderDesk, `DeskDrawerPull${i + 1}`);
}
box([0.72, 0.82, 0.56], deskElectronicsMat, [0.12, 0.61, 1.05], softwareStationUnderDesk, 'SoftwarePcTower');
for (let i = 0; i < 2; i++) {
  const fan = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 8, 20), deskCyanMat);
  fan.name = `SoftwarePcCoolingFan${i + 1}`;
  fan.rotation.y = Math.PI / 2;
  fan.position.set(-0.255, 0.47 + i * 0.29, 1.05);
  fan.castShadow = false;
  softwareStationUnderDesk.add(fan);
}
box([0.17, 0.11, 1.8], deskFrameMat, [0.42, 1.08, 0.08], softwareStationUnderDesk, 'UnderDeskCableTray');
box([0.07, 0.05, 1.22], deskElectronicsMat, [0.35, 0.98, -0.08], softwareStationUnderDesk, 'DeskPowerStrip');
for (let i = 0; i < 3; i++) box([0.018, 0.018, 0.018], deskCyanMat, [0.31, 0.94, -0.34 + i * 0.22], softwareStationUnderDesk, `PowerStripLight${i + 1}`);
rodBetween(new THREE.Vector3(0.36, 1.02, 0.74), new THREE.Vector3(0.31, 0.85, 1.02), 0.018, deskFrameMat, softwareStationUnderDesk, 'BundledPcCable');

for (let i = 0; i < 2; i++) box([0.2, 0.055, 0.28], deskElectronicsMat, [0.05, 1.4 + i * 0.06, 0.9], softwareStationAccessories, `ExternalDrive${i + 1}`);
for (let i = 0; i < 2; i++) box([0.018, 0.018, 0.018], deskCyanMat, [-0.055, 1.4 + i * 0.06, 0.79], softwareStationAccessories, `ExternalDriveLight${i + 1}`);
rodBetween(new THREE.Vector3(0.08, 1.36, 0.82), new THREE.Vector3(0.08, 1.82, 0.82), 0.02, deskFrameMat, softwareStationAccessories, 'HeadphoneStand');
const headphoneBand = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 8, 18, Math.PI), deskFrameMat);
headphoneBand.name = 'DeskHeadphones';
headphoneBand.rotation.y = Math.PI / 2;
headphoneBand.position.set(0.02, 1.78, 0.82);
softwareStationAccessories.add(headphoneBand);

const deskPlant = createFacetedTerracottaPlant('DeskFacetedTerracottaPlant', 0.46, true);
deskPlant.position.set(-0.24, 1.355, 1.38);
deskPlant.rotation.y = -0.18;
softwareStationAccessories.add(deskPlant);
const deskGlow = new THREE.PointLight(0x5dc9ff, 8.5, 3.0, 2);
deskGlow.position.set(-0.1, 2.0, -0.22);
softwareStationDisplay.add(deskGlow);

const softwareStationRuntime = {
  model: 'generated-software-station-v1',
  monitor: { animated: reviewMonitorState.animated, preserved: reviewMonitorDisplay.parent === softwareStationDisplay },
  overheadFrame: true,
  speakerCount: 2,
  deskFanBlades: 12,
  keyboardKeys: 36,
  drawers: 2,
  pcCoolingFans: 2,
  hasDeskMat: true,
  hasTaskLamp: true,
  hasCableManagement: true
};
const deskCollider = box(
  [1.45, 2.65, 3.75],
  new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  [0, 1.32, 0],
  desk,
  'DeskCollider'
);
deskCollider.castShadow = false;
deskCollider.receiveShadow = false;
const DESK_SPOT = new THREE.Vector3(3.9, 0, -0.85);
const COUCH_SPOT = new THREE.Vector3(2.4, 0, 5.2);

// Camera-near lounge: a charcoal left-chaise sectional facing a low walnut table.
const lounge = new THREE.Group();
lounge.name = 'FrontRightLounge';
lounge.position.set(2.4, 0, 6.1);
scene.add(lounge);
const loungeFabricMat = new THREE.MeshStandardMaterial({ color: 0x443b36, emissive: 0x120b07, emissiveIntensity: 0.12, roughness: 0.92, metalness: 0.01 });
const loungeCushionMat = new THREE.MeshStandardMaterial({ color: 0x51453e, emissive: 0x100907, emissiveIntensity: 0.1, roughness: 0.95, metalness: 0.0 });
const loungeSeamMat = new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: 1 });
const loungeFootMat = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.52, metalness: 0.34 });
const rugMat = new THREE.MeshStandardMaterial({ color: 0x1d2025, roughness: 1, metalness: 0 });
const rugRibMat = new THREE.MeshStandardMaterial({ color: 0x25292e, roughness: 1, metalness: 0 });
const tableWoodMat = new THREE.MeshStandardMaterial({ color: 0x5a3827, roughness: 0.66, metalness: 0.01 });
const tableEdgeMat = new THREE.MeshStandardMaterial({ color: 0x3c251b, roughness: 0.7, metalness: 0.02 });

const loungeRug = box([5.8, 0.025, 3.65], rugMat, [0, 0.018, -2.0], lounge, 'LoungeRug');
loungeRug.receiveShadow = true;
for (let i = 0; i < 16; i++) {
  box([5.58, 0.008, 0.014], rugRibMat, [0, 0.035, -3.65 + i * 0.22], lounge, `RugRib${i + 1}`);
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
const loungeAccentPillowMat = new THREE.MeshStandardMaterial({ color: 0x9b4d35, emissive: 0x170804, emissiveIntensity: 0.08, roughness: 0.96 });
const accentPillowA = box([0.58, 0.52, 0.20], loungeAccentPillowMat, [0.62, 0.82, 0.17], lounge, 'RustThrowPillow1');
accentPillowA.rotation.z = 0.14;
const accentPillowB = box([0.54, 0.48, 0.20], loungeAccentPillowMat, [1.65, 0.80, 0.16], lounge, 'RustThrowPillow2');
accentPillowB.rotation.z = -0.12;
for (const [x, z] of [[-1.92, 0.31], [1.92, 0.31], [-1.92, -0.32], [1.92, -0.32], [-1.45, -1.65], [-0.95, -1.65]]) {
  box([0.16, 0.12, 0.16], loungeFootMat, [x, 0.06, z], lounge, 'SectionalFoot');
}

const COFFEE_TABLE_ORIGINAL_X = 0.15;
const COFFEE_TABLE_LOCAL_X = 1.6;
const COFFEE_TABLE_WIDTH = 2.5;
const COFFEE_TABLE_DEPTH = 1.24;
const coffeeTable = new THREE.Group();
coffeeTable.name = 'CoffeeTable';
coffeeTable.position.set(COFFEE_TABLE_LOCAL_X, 0, -2.45);
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

// Sculptural mid-century floor lamp tucked behind the sectional's right arm.
const loungeFloorLamp = new THREE.Group();
loungeFloorLamp.name = 'LoungeArchedFloorLamp';
loungeFloorLamp.position.set(3.55, 0, 0.2);
lounge.add(loungeFloorLamp);
const loungeLampBrassMat = new THREE.MeshStandardMaterial({ color: 0xa77336, roughness: 0.3, metalness: 0.82 });
const loungeLampDarkBrassMat = new THREE.MeshStandardMaterial({ color: 0x4a3422, roughness: 0.42, metalness: 0.74 });
const loungeLampBaseMat = new THREE.MeshStandardMaterial({ color: 0x24282b, roughness: 0.48, metalness: 0.64 });
const loungeLampShadeMat = new THREE.MeshStandardMaterial({
  color: 0xd9aa70,
  emissive: 0x6a2f12,
  emissiveIntensity: 0.72,
  roughness: 0.74,
  metalness: 0,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.94
});
const loungeLampDiffuserMat = new THREE.MeshStandardMaterial({
  color: 0xffe1af,
  emissive: 0xffb45d,
  emissiveIntensity: 1.75,
  roughness: 0.5,
  side: THREE.DoubleSide
});
const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.37, 0.12, 24), loungeLampBaseMat);
lampBase.name = 'LoungeLampWeightedBase';
lampBase.position.y = 0.06;
lampBase.castShadow = true;
lampBase.receiveShadow = true;
loungeFloorLamp.add(lampBase);
const lampBaseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.285, 0.055, 24), loungeLampBrassMat);
lampBaseRing.name = 'LoungeLampBaseBrassRing';
lampBaseRing.position.y = 0.145;
lampBaseRing.castShadow = true;
loungeFloorLamp.add(lampBaseRing);
rodBetween(new THREE.Vector3(0, 0.16, 0), new THREE.Vector3(0, 1.57, 0), 0.035, loungeLampDarkBrassMat, loungeFloorLamp, 'LoungeLampLowerStem');
for (const y of [0.58, 1.12]) {
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.085, 16), loungeLampBrassMat);
  collar.name = `LoungeLampStemCollar${y}`;
  collar.position.y = y;
  collar.castShadow = true;
  loungeFloorLamp.add(collar);
}
const loungeLampArcPoints = [
  new THREE.Vector3(0, 1.57, 0),
  new THREE.Vector3(-0.06, 2.0, -0.05),
  new THREE.Vector3(-0.28, 2.34, -0.24),
  new THREE.Vector3(-0.62, 2.58, -0.52),
  new THREE.Vector3(-1.0, 2.66, -0.78)
];
for (let i = 1; i < loungeLampArcPoints.length; i++) {
  rodBetween(loungeLampArcPoints[i - 1], loungeLampArcPoints[i], 0.04, loungeLampBrassMat, loungeFloorLamp, `LoungeLampArc${i}`);
  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), loungeLampBrassMat);
  joint.name = `LoungeLampArcJoint${i}`;
  joint.position.copy(loungeLampArcPoints[i]);
  joint.castShadow = true;
  loungeFloorLamp.add(joint);
}
rodBetween(new THREE.Vector3(-1.0, 2.66, -0.78), new THREE.Vector3(-1.0, 2.605, -0.78), 0.045, loungeLampDarkBrassMat, loungeFloorLamp, 'LoungeLampShadeDrop');
const loungeLampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.44, 0.43, 24, 1, true), loungeLampShadeMat);
loungeLampShade.name = 'LoungeLampLinenShade';
loungeLampShade.position.set(-1.0, 2.39, -0.78);
loungeLampShade.castShadow = true;
loungeFloorLamp.add(loungeLampShade);
const loungeLampShadeTop = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.018, 8, 24), loungeLampBrassMat);
loungeLampShadeTop.name = 'LoungeLampShadeTopRing';
loungeLampShadeTop.rotation.x = Math.PI / 2;
loungeLampShadeTop.position.set(-1.0, 2.605, -0.78);
loungeFloorLamp.add(loungeLampShadeTop);
const loungeLampShadeBottom = new THREE.Mesh(new THREE.TorusGeometry(0.435, 0.018, 8, 24), loungeLampBrassMat);
loungeLampShadeBottom.name = 'LoungeLampShadeBottomRing';
loungeLampShadeBottom.rotation.x = Math.PI / 2;
loungeLampShadeBottom.position.set(-1.0, 2.175, -0.78);
loungeFloorLamp.add(loungeLampShadeBottom);
const loungeLampDiffuser = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.025, 24), loungeLampDiffuserMat);
loungeLampDiffuser.name = 'LoungeLampWarmDiffuser';
loungeLampDiffuser.position.set(-1.0, 2.17, -0.78);
loungeFloorLamp.add(loungeLampDiffuser);
const loungeLampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12), loungeLampDiffuserMat);
loungeLampBulb.name = 'LoungeLampBulb';
loungeLampBulb.position.set(-1.0, 2.29, -0.78);
loungeFloorLamp.add(loungeLampBulb);
rodBetween(new THREE.Vector3(-0.73, 2.56, -0.58), new THREE.Vector3(-0.73, 2.08, -0.58), 0.009, loungeLampDarkBrassMat, loungeFloorLamp, 'LoungeLampPullChain');
const loungeLampPull = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), loungeLampBrassMat);
loungeLampPull.name = 'LoungeLampPullBead';
loungeLampPull.position.set(-0.73, 2.04, -0.58);
loungeFloorLamp.add(loungeLampPull);
const loungeLampLight = new THREE.PointLight(0xffb45f, 25, 5.1, 2);
loungeLampLight.name = 'LoungeLampWarmPointLight';
loungeLampLight.position.set(-1.0, 2.1, -0.78);
loungeFloorLamp.add(loungeLampLight);
const loungeLampWorldPosition = {
  x: lounge.position.x + loungeFloorLamp.position.x,
  z: lounge.position.z + loungeFloorLamp.position.z
};
const loungeFloorLampRuntime = {
  model: 'mid-century-arched-floor-lamp-v1',
  corner: 'front-right-by-couch',
  style: 'aged-brass-and-warm-linen',
  position: { ...loungeLampWorldPosition },
  hasWeightedBase: lampBase.parent === loungeFloorLamp,
  hasArchedStem: loungeLampArcPoints.length >= 4,
  hasLinenShade: loungeLampShade.parent === loungeFloorLamp,
  hasDiffuser: loungeLampDiffuser.parent === loungeFloorLamp,
  warmPointLight: loungeLampLight.parent === loungeFloorLamp,
  colliderFree: true,
  clearOfCouchPath: loungeLampWorldPosition.x > COUCH_SPOT.x + 2
    && loungeLampWorldPosition.z > COUCH_SPOT.z + 1,
  insideRoomBounds: loungeLampWorldPosition.x + 0.37 < 7
    && loungeLampWorldPosition.z + 0.37 < 7,
  parts: loungeFloorLamp.children.filter(child => child.isMesh).length
};

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
  new THREE.MeshPhysicalMaterial({ color: 0x9cdcf0, transparent: true, opacity: 0.22, roughness: 0.08, transmission: 0, side: THREE.DoubleSide, depthWrite: false })
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
const testGlow = new THREE.PointLight(0x48e1c1, 8.5, 3.4, 2);
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

// The generated developer workstation belongs to the back-wall review station.
// Preserve the TestBench interaction root/collider, replace only its visuals, and
// rotate the right-wall-authored local coordinates so the station faces into the room.
for (const child of [...testBench.children]) {
  if (child !== testBenchCollider) testBench.remove(child);
}
const reviewStationVisual = new THREE.Group();
reviewStationVisual.name = 'GeneratedReviewStationVisual';
reviewStationVisual.rotation.y = Math.PI / 2;
reviewStationVisual.add(softwareStationStructure, softwareStationDisplay, softwareStationAccessories, softwareStationUnderDesk);
testBench.add(reviewStationVisual);

// Second interpretation of the approved workstation reference for the right-wall
// software station. The ComputerDesk root, DeskCollider, DESK_SPOT and plant API stay stable.
const softwareStationV2Visual = new THREE.Group();
softwareStationV2Visual.name = 'SoftwareStationV2Visual';
desk.add(softwareStationV2Visual);
const softwareV2Structure = new THREE.Group();
softwareV2Structure.name = 'SoftwareV2Structure';
const softwareV2Displays = new THREE.Group();
softwareV2Displays.name = 'SoftwareV2Displays';
const softwareV2InputDeck = new THREE.Group();
softwareV2InputDeck.name = 'SoftwareV2InputDeck';
const softwareV2Accessories = new THREE.Group();
softwareV2Accessories.name = 'SoftwareV2Accessories';
const softwareV2UnderDesk = new THREE.Group();
softwareV2UnderDesk.name = 'SoftwareV2UnderDesk';
softwareStationV2Visual.add(softwareV2Structure, softwareV2Displays, softwareV2InputDeck, softwareV2Accessories, softwareV2UnderDesk);

const softwareAmberMat = new THREE.MeshStandardMaterial({ color: 0xe5a33c, roughness: 0.34, metalness: 0.28, emissive: 0x7d430c, emissiveIntensity: 0.55 });
const softwareGraphiteMat = new THREE.MeshStandardMaterial({ color: 0x252a30, roughness: 0.38, metalness: 0.56 });
const softwareSilverMat = new THREE.MeshStandardMaterial({ color: 0xaeb8bf, roughness: 0.3, metalness: 0.72 });
box([1.25, 0.09, 3.5], deskTopMat, [0, 1.28, 0], softwareV2Structure, 'SoftwareV2DeskTop');
box([0.025, 0.025, 3.36], softwareAmberMat, [-0.626, 1.275, 0], softwareV2Structure, 'SoftwareV2AmberFrontStripe');
for (const z of [-1.42, 1.42]) {
  rodBetween(new THREE.Vector3(-0.38, 1.2, z), new THREE.Vector3(-0.54, 0.05, z), 0.06, deskFrameMat, softwareV2Structure, `SoftwareV2FrontLeg${z}`);
  rodBetween(new THREE.Vector3(0.34, 1.2, z), new THREE.Vector3(0.52, 0.05, z), 0.06, deskFrameMat, softwareV2Structure, `SoftwareV2RearLeg${z}`);
}
box([0.1, 0.1, 2.72], deskFrameMat, [0.18, 0.18, 0], softwareV2Structure, 'SoftwareV2LowStretcher');
for (const z of [-1.4, 1.4]) box([0.05, 1.2, 0.05], deskFrameMat, [0.43, 1.96, z], softwareV2Structure, 'SoftwareV2EquipmentRailPost');
box([0.24, 0.065, 2.88], softwareGraphiteMat, [0.36, 2.55, 0], softwareV2Structure, 'SoftwareV2EquipmentShelf');
box([0.025, 0.02, 2.65], softwareAmberMat, [0.225, 2.505, 0], softwareV2Structure, 'SoftwareV2ShelfTaskLight');
for (let i = 0; i < 5; i++) box([0.02, 0.012, 0.13], softwareAmberMat, [0.205, 2.485, -0.96 + i * 0.48], softwareV2Structure, `SoftwareV2TaskLightSegment${i + 1}`);

function makeSoftwareV2ScreenTexture(mode) {
  const canvas = document.createElement('canvas');
  canvas.width = mode === 'primary' ? 512 : 240;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#061017';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = mode === 'primary' ? '#51d9f5' : '#f2a63a';
  if (mode === 'primary') {
    for (let row = 0; row < 13; row++) {
      const y = 28 + row * 21;
      const indent = (row % 4) * 12;
      ctx.globalAlpha = 0.35 + (row % 3) * 0.16;
      ctx.fillRect(24 + indent, y, 120 + ((row * 29) % 220), 5);
      ctx.fillRect(385, y, 70 + ((row * 13) % 34), 5);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#1989aa';
    ctx.lineWidth = 2;
    ctx.strokeRect(360, 22, 126, 276);
  } else {
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = i % 2 ? '#50d9ef' : '#f2a63a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(120, 52 + i * 54, 12 + i * 2, 0, Math.PI * 2);
      ctx.stroke();
      if (i < 4) {
        ctx.beginPath();
        ctx.moveTo(120, 68 + i * 54);
        ctx.lineTo(120, 88 + i * 54);
        ctx.stroke();
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}
box([0.14, 0.92, 1.52], softwareGraphiteMat, [0.23, 2.02, -0.38], softwareV2Displays, 'SoftwareV2PrimaryMonitor');
const softwarePrimaryScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 0.72), new THREE.MeshBasicMaterial({ map: makeSoftwareV2ScreenTexture('primary'), toneMapped: false }));
softwarePrimaryScreen.name = 'SoftwareV2PrimaryCodeScreen';
softwarePrimaryScreen.position.set(0.151, 2.02, -0.38);
softwarePrimaryScreen.rotation.y = -Math.PI / 2;
softwareV2Displays.add(softwarePrimaryScreen);
box([0.12, 0.7, 0.46], softwareGraphiteMat, [0.23, 1.93, 0.72], softwareV2Displays, 'SoftwareV2VerticalMonitor');
const softwareSecondaryScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.37, 0.56), new THREE.MeshBasicMaterial({ map: makeSoftwareV2ScreenTexture('secondary'), toneMapped: false }));
softwareSecondaryScreen.name = 'SoftwareV2VerticalStatusScreen';
softwareSecondaryScreen.position.set(0.16, 1.93, 0.72);
softwareSecondaryScreen.rotation.y = -Math.PI / 2;
softwareV2Displays.add(softwareSecondaryScreen);
box([0.08, 0.48, 0.1], deskFrameMat, [0.2, 1.52, -0.38], softwareV2Displays, 'SoftwareV2MonitorStand');
box([0.28, 0.055, 1.72], deskFrameMat, [0.07, 1.36, -0.12], softwareV2Displays, 'SoftwareV2MonitorBridge');

box([0.5, 0.025, 2.0], softwareGraphiteMat, [-0.34, 1.375, -0.1], softwareV2InputDeck, 'SoftwareV2DeskMat');
box([0.38, 0.05, 1.05], keyMat, [-0.42, 1.41, -0.38], softwareV2InputDeck, 'SoftwareV2KeyboardBase');
for (let row = 0; row < 4; row++) {
  for (let col = 0; col < 9; col++) {
    const keyMaterial = (row + col) % 7 === 0 ? softwareAmberMat : ((row + col) % 5 === 0 ? deskCyanMat : deskFrameMat);
    box([0.07, 0.018, 0.075], keyMaterial, [-0.62 + row * 0.11, 1.449, -0.7 + col * 0.08], softwareV2InputDeck, `SoftwareV2Key${row}-${col}`);
  }
}
box([0.23, 0.04, 0.18], deskElectronicsMat, [-0.43, 1.42, 0.46], softwareV2InputDeck, 'SoftwareV2Mouse');
box([0.25, 0.045, 0.32], softwareGraphiteMat, [-0.43, 1.42, 0.88], softwareV2InputDeck, 'SoftwareV2MacroPad');
for (let i = 0; i < 6; i++) box([0.055, 0.018, 0.055], i === 0 ? softwareAmberMat : deskCyanMat, [-0.56 + (i % 2) * 0.1, 1.453, 0.79 + Math.floor(i / 2) * 0.09], softwareV2InputDeck, `SoftwareV2MacroKey${i + 1}`);

const softwareFan = new THREE.Group();
softwareFan.name = 'SoftwareV2RadialFan';
softwareV2Accessories.add(softwareFan);
const softwareFanRing = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.026, 10, 32), softwareSilverMat);
softwareFanRing.rotation.y = Math.PI / 2;
softwareFanRing.position.set(-0.16, 1.82, -1.24);
softwareFan.add(softwareFanRing);
for (let i = 0; i < 10; i++) {
  const a = i / 10 * Math.PI * 2;
  rodBetween(new THREE.Vector3(-0.16, 1.82, -1.24), new THREE.Vector3(-0.16, 1.82 + Math.cos(a) * 0.125, -1.24 + Math.sin(a) * 0.125), 0.01, deskFrameMat, softwareFan, `SoftwareV2FanBlade${i + 1}`);
}
const softwareFanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 12), softwareAmberMat);
softwareFanHub.rotation.z = Math.PI / 2;
softwareFanHub.position.set(-0.16, 1.82, -1.24);
softwareFan.add(softwareFanHub);
rodBetween(new THREE.Vector3(0.12, 1.36, -0.92), new THREE.Vector3(-0.12, 1.68, -0.96), 0.025, deskCopperMat, softwareV2Accessories, 'SoftwareV2LampLowerArm');
rodBetween(new THREE.Vector3(-0.12, 1.68, -0.96), new THREE.Vector3(-0.22, 2.18, -0.92), 0.025, deskCopperMat, softwareV2Accessories, 'SoftwareV2LampUpperArm');
const softwareLampShade = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.22, 10, 1, true), softwareAmberMat);
softwareLampShade.rotation.z = -Math.PI / 2;
softwareLampShade.position.set(-0.32, 2.19, -0.92);
softwareV2Accessories.add(softwareLampShade);
box([0.42, 0.68, 0.12], softwareSilverMat, [-0.18, 1.72, 1.02], softwareV2Accessories, 'SoftwareV2VerticalLaptopDock');
for (let i = 0; i < 4; i++) box([0.035, 0.32, 0.035], deskFrameMat, [-0.41, 1.68, 0.88 + i * 0.09], softwareV2Accessories, `SoftwareV2LaptopDockFin${i + 1}`);
box([0.25, 0.54, 0.34], softwareGraphiteMat, [-0.24, 1.72, 1.1], softwareV2Accessories, 'SoftwareV2SpeakerBody');
for (const y of [1.6, 1.84]) {
  const driver = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.025, 18), deskCyanMat);
  driver.name = 'SoftwareV2SpeakerDriver';
  driver.rotation.z = Math.PI / 2;
  driver.position.set(-0.38, y, 1.1);
  softwareV2Accessories.add(driver);
}

deskPlant.position.set(-0.24, 1.355, 1.52);
deskPlant.rotation.y = -0.18;
softwareV2Accessories.add(deskPlant);
const reviewStationPlant = createFacetedTerracottaPlant('ReviewStationFacetedTerracottaPlant', 0.46);
reviewStationPlant.position.set(-0.24, 1.355, 1.38);
reviewStationPlant.rotation.y = -0.18;
softwareStationAccessories.add(reviewStationPlant);

box([0.58, 0.56, 0.46], softwareGraphiteMat, [0.3, 0.96, -1.22], softwareV2UnderDesk, 'SoftwareV2DrawerCabinet');
for (let i = 0; i < 2; i++) {
  box([0.025, 0.21, 0.4], deskElectronicsMat, [-0.002, 0.84 + i * 0.235, -1.22], softwareV2UnderDesk, `SoftwareV2Drawer${i + 1}`);
  box([0.03, 0.03, 0.18], softwareAmberMat, [-0.02, 0.84 + i * 0.235, -1.22], softwareV2UnderDesk, `SoftwareV2DrawerPull${i + 1}`);
}
box([0.58, 0.72, 0.48], softwareGraphiteMat, [0.28, 0.62, 1.22], softwareV2UnderDesk, 'SoftwareV2PcTower');
box([0.025, 0.48, 0.34], new THREE.MeshPhysicalMaterial({ color: 0x25303a, transparent: true, opacity: 0.48, roughness: 0.12, metalness: 0.22 }), [-0.023, 0.64, 1.22], softwareV2UnderDesk, 'SoftwareV2PcWindow');
const towerFan = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 10, 24), deskCyanMat);
towerFan.name = 'SoftwareV2TowerHexFan';
towerFan.rotation.y = Math.PI / 2;
towerFan.position.set(-0.055, 0.64, 1.22);
softwareV2UnderDesk.add(towerFan);
box([0.018, 0.22, 0.035], softwareAmberMat, [-0.065, 0.68, 1.41], softwareV2UnderDesk, 'SoftwareV2TowerStatusStrip');
box([0.16, 0.11, 2.45], deskFrameMat, [0.42, 1.09, 0], softwareV2UnderDesk, 'SoftwareV2CableRaceway');
box([0.07, 0.05, 1.32], deskElectronicsMat, [0.35, 0.99, -0.18], softwareV2UnderDesk, 'SoftwareV2PowerStrip');
rodBetween(new THREE.Vector3(0.36, 1.04, 0.72), new THREE.Vector3(0.28, 0.96, 1.0), 0.018, deskFrameMat, softwareV2UnderDesk, 'SoftwareV2TowerCable');
rodBetween(new THREE.Vector3(0.36, 1.04, -0.42), new THREE.Vector3(0.18, 1.44, -0.3), 0.018, deskFrameMat, softwareV2UnderDesk, 'SoftwareV2MonitorCable');
const softwareDeskGlow = new THREE.PointLight(0x48cde8, 7.5, 3.0, 2);
softwareDeskGlow.position.set(-0.15, 2.05, -0.15);
softwareV2Displays.add(softwareDeskGlow);

const softwareStationV2Runtime = {
  model: 'software-command-station-v2',
  screens: { count: 2, primary: 'cyan-code', secondary: 'vertical-status' },
  splayedLegs: 4,
  equipmentRail: true,
  keyboardKeys: 36,
  fanBlades: 10,
  drawers: 2,
  towerFans: 1,
  hasCableManagement: true,
  plantPreserved: deskPlant.parent === softwareV2Accessories
};

// Large HTML-canvas-backed LED matrix mounted in the back-wall mid band. Drawing
// is isolated from transport so incoming SSE data only mutates normalized state.
const LED_MATRIX_WIDTH = 1024;
const LED_MATRIX_HEIGHT = 360;
const LED_MATRIX_COLUMNS = 160;
const LED_MATRIX_ROWS = 36;
const LED_MATRIX_PHYSICAL_WIDTH = 4.4;
const LED_MATRIX_PHYSICAL_HEIGHT = 1.55;
const ledMatrixCanvas = document.createElement('canvas');
ledMatrixCanvas.width = LED_MATRIX_WIDTH;
ledMatrixCanvas.height = LED_MATRIX_HEIGHT;
ledMatrixCanvas.id = 'wall-led-matrix-canvas';
ledMatrixCanvas.dataset.displaySurface = 'sse-led-matrix';
const ledMatrixContentCanvas = document.createElement('canvas');
ledMatrixContentCanvas.width = LED_MATRIX_WIDTH;
ledMatrixContentCanvas.height = LED_MATRIX_HEIGHT;
const ledMatrixContext = ledMatrixCanvas.getContext('2d', { alpha: false });
const ledMatrixContentContext = ledMatrixContentCanvas.getContext('2d', { willReadFrequently: true });
const ledMatrixState = {
  type: 'CanvasTexture',
  canvasElement: ledMatrixCanvas instanceof HTMLCanvasElement,
  mode: 'led-dot-matrix',
  width: LED_MATRIX_WIDTH,
  height: LED_MATRIX_HEIGHT,
  columns: LED_MATRIX_COLUMNS,
  rows: LED_MATRIX_ROWS,
  physicalWidth: LED_MATRIX_PHYSICAL_WIDTH,
  physicalHeight: LED_MATRIX_PHYSICAL_HEIGHT,
  wall: 'back',
  sseCapable: true,
  endpoint: null,
  source: 'fallback',
  title: 'RAYCAST ROOM',
  lines: ['SYSTEM MATRIX ONLINE', 'AWAITING SSE DATA'],
  status: 'LOCAL FALLBACK',
  accent: '#59f3ff',
  messages: 0,
  updates: 0,
  lastEventId: null,
  lastReceivedAt: null
};
const ledMatrixActivityState = {
  active: false,
  schemaVersion: null,
  eventId: null,
  ticketId: null,
  phase: null,
  phaseState: null,
  eventType: null,
  summary: null,
  timestampUtc: null,
  timestampMs: null,
  durationSeconds: 0,
  metadata: null
};

function fitMatrixText(context, text, maxWidth, startSize, weight = 700) {
  let size = startSize;
  do {
    context.font = `${weight} ${size}px "Courier New", monospace`;
    size -= 2;
  } while (size > 16 && context.measureText(text).width > maxWidth);
}

function normalizeLedDisplay(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (typeof value.title !== 'string' || !value.title.trim() || value.title.length > 40) return null;
  if (!Array.isArray(value.lines) || value.lines.length < 1 || value.lines.length > 4) return null;
  if (value.lines.some(line => typeof line !== 'string' || !line.trim() || line.length > 80)) return null;
  return {
    title: value.title.trim(),
    lines: value.lines.map(line => line.trim()),
    status: typeof value.status === 'string' && value.status.length <= 32 ? value.status.trim() : 'LIVE',
    accent: typeof value.accent === 'string' && /^#[0-9a-f]{6}$/i.test(value.accent)
      ? value.accent.toLowerCase()
      : '#59f3ff'
  };
}

function normalizeActivityStream(value) {
  const info = value?.info;
  const timestampMs = Date.parse(value?.timestampUtc);
  if (value?.schemaVersion !== 1 || typeof value.eventId !== 'string' || !value.eventId.trim()) return null;
  if (!Number.isFinite(timestampMs) || !info || typeof info !== 'object' || Array.isArray(info)) return null;
  for (const key of ['ticketId', 'phase', 'phaseState', 'eventType', 'summary']) {
    if (typeof info[key] !== 'string' || !info[key].trim()) return null;
  }
  return {
    schemaVersion: 1,
    eventId: value.eventId,
    ticketId: info.ticketId,
    phase: info.phase,
    phaseState: info.phaseState,
    eventType: info.eventType,
    summary: info.summary,
    timestampUtc: value.timestampUtc,
    timestampMs,
    durationSeconds: Math.max(0, Math.floor((Date.now() - timestampMs) / 1000)),
    metadata: info.metadata
  };
}

const LED_MATRIX_BITMAP_FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '101111111111101', O: '010101101101010', P: '110101110100100',
  Q: '010101101111011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001111100111', 3: '110001111001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
  8: '111101111101111', 9: '111101111001110',
  ':': '000010000010000', ';': '000010000010100', '-': '000000111000000', '.': '000000000000010',
  '/': '001001010100100', ' ': '000000000000000'
};

function drawLedBitmapText(context, text, startColumn, startRow) {
  const cellWidth = LED_MATRIX_WIDTH / LED_MATRIX_COLUMNS;
  const cellHeight = LED_MATRIX_HEIGHT / LED_MATRIX_ROWS;
  let column = startColumn;
  for (const character of text.toUpperCase()) {
    const glyph = LED_MATRIX_BITMAP_FONT[character] || LED_MATRIX_BITMAP_FONT[' '];
    if (column + 3 > LED_MATRIX_COLUMNS) break;
    for (let row = 0; row < 5; row += 1) {
      for (let glyphColumn = 0; glyphColumn < 3; glyphColumn += 1) {
        if (glyph[row * 3 + glyphColumn] !== '1') continue;
        context.fillRect(
          (column + glyphColumn) * cellWidth,
          (startRow + row) * cellHeight,
          cellWidth,
          cellHeight
        );
      }
    }
    column += 4;
  }
}

function drawActivityStreamContent(context) {
  const activity = ledMatrixActivityState;
  const timestampToSeconds = new Date(activity.timestampMs).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const rows = [
    `ticketId: ${activity.ticketId}`,
    `phase: ${activity.phase}`,
    `summary: ${activity.summary}`,
    `timestampUtc: ${timestampToSeconds}`,
    `duration: ${activity.durationSeconds}s`
  ];
  context.fillStyle = '#ffffff';
  rows.forEach((line, index) => drawLedBitmapText(context, line, 2, 1 + index * 7));
}

const ledMatrixTexture = new THREE.CanvasTexture(ledMatrixCanvas);
ledMatrixTexture.name = 'WallLedMatrixCanvasTexture';
ledMatrixTexture.colorSpace = THREE.SRGBColorSpace;
ledMatrixTexture.minFilter = THREE.LinearFilter;
ledMatrixTexture.magFilter = THREE.NearestFilter;

function renderLedMatrix() {
  const content = ledMatrixContentContext;
  content.fillStyle = '#000000';
  content.fillRect(0, 0, LED_MATRIX_WIDTH, LED_MATRIX_HEIGHT);
  if (ledMatrixState.source === 'activityStream' && ledMatrixActivityState.active) {
    drawActivityStreamContent(content);
  } else {
    content.textBaseline = 'middle';
  content.textAlign = 'left';
  content.fillStyle = '#ffffff';
  fitMatrixText(content, ledMatrixState.title, 850, 54, 800);
  content.fillText(ledMatrixState.title, 72, 56);
  content.fillRect(72, 88, 880, 4);

  const lineGap = ledMatrixState.lines.length === 4 ? 49 : 58;
  const lineStart = ledMatrixState.lines.length === 4 ? 122 : 132;
  ledMatrixState.lines.forEach((line, index) => {
    fitMatrixText(content, line, 880, 36, 700);
    content.fillText(line, 72, lineStart + index * lineGap);
  });
  fitMatrixText(content, ledMatrixState.status, 500, 24, 700);
  content.fillText(ledMatrixState.status, 72, 328);
    content.fillRect(762, 318, 190, 8);
  }

  const pixels = content.getImageData(0, 0, LED_MATRIX_WIDTH, LED_MATRIX_HEIGHT).data;
  const context = ledMatrixContext;
  const background = context.createLinearGradient(0, 0, LED_MATRIX_WIDTH, LED_MATRIX_HEIGHT);
  background.addColorStop(0, '#03090c');
  background.addColorStop(0.55, '#061116');
  background.addColorStop(1, '#020608');
  context.fillStyle = background;
  context.fillRect(0, 0, LED_MATRIX_WIDTH, LED_MATRIX_HEIGHT);

  const cellWidth = LED_MATRIX_WIDTH / LED_MATRIX_COLUMNS;
  const cellHeight = LED_MATRIX_HEIGHT / LED_MATRIX_ROWS;
  const radius = Math.min(cellWidth, cellHeight) * 0.32;
  const bitmapActivityMode = ledMatrixState.source === 'activityStream' && ledMatrixActivityState.active;
  for (let row = 0; row < LED_MATRIX_ROWS; row += 1) {
    for (let column = 0; column < LED_MATRIX_COLUMNS; column += 1) {
      const x = Math.round((column + 0.5) * cellWidth);
      const y = Math.round((row + 0.5) * cellHeight);
      let lit = 0;
      for (const [dx, dy] of [[0, 0], [-4, 0], [4, 0], [0, -4], [0, 4]]) {
        const sampleX = Math.max(0, Math.min(LED_MATRIX_WIDTH - 1, x + dx));
        const sampleY = Math.max(0, Math.min(LED_MATRIX_HEIGHT - 1, y + dy));
        const offset = (sampleY * LED_MATRIX_WIDTH + sampleX) * 4;
        lit = Math.max(lit, pixels[offset], pixels[offset + 1], pixels[offset + 2]);
      }
      if (bitmapActivityMode) {
        context.shadowBlur = 0;
        context.globalAlpha = lit > 30 ? 0.94 : 0.08;
        context.fillStyle = lit > 30 ? ledMatrixState.accent : '#17313a';
        context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
        continue;
      }
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      if (lit > 30) {
        context.shadowColor = ledMatrixState.accent;
        context.shadowBlur = 10;
        context.globalAlpha = 0.68 + lit / 850;
        context.fillStyle = ledMatrixState.accent;
      } else {
        context.shadowBlur = 0;
        context.globalAlpha = 0.16;
        context.fillStyle = '#17313a';
      }
      context.fill();
    }
  }
  context.globalAlpha = 1;
  context.shadowBlur = 0;
  ledMatrixTexture.needsUpdate = true;
  ledMatrixState.updates += 1;
}

const ledMatrixScreenMaterial = new THREE.MeshBasicMaterial({ map: ledMatrixTexture, color: 0xffffff, toneMapped: false });
const ledMatrixFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x15191d, roughness: 0.3, metalness: 0.82 });
const ledMatrixTrimMaterial = new THREE.MeshStandardMaterial({ color: 0x364149, roughness: 0.38, metalness: 0.74 });
const ledMatrixAssembly = new THREE.Group();
ledMatrixAssembly.name = 'WallLedMatrix';
ledMatrixAssembly.position.set(2.15, 3.65, -6.82);
scene.add(ledMatrixAssembly);
box([4.72, 1.86, 0.15], ledMatrixFrameMaterial, [0, 0, -0.02], ledMatrixAssembly, 'LedMatrixBackplate');
box([4.62, 0.09, 0.13], ledMatrixTrimMaterial, [0, 0.86, 0.07], ledMatrixAssembly, 'LedMatrixTopTrim');
box([4.62, 0.09, 0.13], ledMatrixTrimMaterial, [0, -0.86, 0.07], ledMatrixAssembly, 'LedMatrixBottomTrim');
box([0.09, 1.64, 0.13], ledMatrixTrimMaterial, [-2.27, 0, 0.07], ledMatrixAssembly, 'LedMatrixLeftTrim');
box([0.09, 1.64, 0.13], ledMatrixTrimMaterial, [2.27, 0, 0.07], ledMatrixAssembly, 'LedMatrixRightTrim');
const ledMatrixScreen = new THREE.Mesh(new THREE.PlaneGeometry(LED_MATRIX_PHYSICAL_WIDTH, LED_MATRIX_PHYSICAL_HEIGHT), ledMatrixScreenMaterial);
ledMatrixScreen.name = 'LedMatrixCanvasDisplay';
ledMatrixScreen.position.z = 0.075;
ledMatrixScreen.castShadow = false;
ledMatrixAssembly.add(ledMatrixScreen);
for (const [x, y] of [[-2.28, -0.87], [-2.28, 0.87], [2.28, -0.87], [2.28, 0.87]]) {
  const fastener = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12), ledMatrixTrimMaterial);
  fastener.rotation.x = Math.PI / 2;
  fastener.position.set(x, y, 0.14);
  fastener.castShadow = true;
  ledMatrixAssembly.add(fastener);
}
box([0.08, 0.72, 0.08], ledMatrixTrimMaterial, [2.14, -1.25, -0.02], ledMatrixAssembly, 'LedMatrixLowerConduit');
const ledMatrixGlow = new THREE.PointLight(0x59f3ff, 10.5, 4.2, 2);
ledMatrixGlow.position.set(0, -0.12, 0.72);
ledMatrixAssembly.add(ledMatrixGlow);
renderLedMatrix();

function renderActivityStreamMatrix() {
  const activity = ledMatrixActivityState;
  Object.assign(ledMatrixState, {
    source: 'activityStream',
    title: `ticketId: ${activity.ticketId}`,
    lines: [
      `phase: ${activity.phase}`,
      `summary: ${activity.summary}`,
      `timestampUtc: ${activity.timestampUtc}`,
      `duration: ${activity.durationSeconds}s`
    ],
    status: `${activity.eventType} / ${activity.phaseState}`,
    accent: '#59f3ff'
  });
  ledMatrixGlow.color.set(ledMatrixState.accent);
  renderLedMatrix();
}

function routeActivityStreamEvent(event) {
  const activity = normalizeActivityStream(event?.activityStream);
  if (!activity) return false;
  Object.assign(ledMatrixActivityState, activity, { active: true });
  Object.assign(ledMatrixState, {
    messages: ledMatrixState.messages + 1,
    lastEventId: event.id || activity.eventId,
    lastReceivedAt: event.receivedAt || null
  });
  renderActivityStreamMatrix();
  return true;
}

function updateActivityStreamDuration() {
  if (!ledMatrixActivityState.active) return;
  const durationSeconds = Math.max(0, Math.floor((Date.now() - ledMatrixActivityState.timestampMs) / 1000));
  if (durationSeconds === ledMatrixActivityState.durationSeconds) return;
  ledMatrixActivityState.durationSeconds = durationSeconds;
  renderActivityStreamMatrix();
}
window.setInterval(updateActivityStreamDuration, 250);

function routeLedMatrixEvent(event) {
  const display = normalizeLedDisplay(event?.display);
  if (!display) return false;
  ledMatrixActivityState.active = false;
  Object.assign(ledMatrixState, display, {
    source: 'sse',
    messages: ledMatrixState.messages + 1,
    lastEventId: event.id || null,
    lastReceivedAt: event.receivedAt || null
  });
  ledMatrixGlow.color.set(display.accent);
  renderLedMatrix();
  return true;
}

const ledMatrixRuntime = {
  model: 'wall-led-matrix-v1',
  wall: 'back',
  sizable: LED_MATRIX_PHYSICAL_WIDTH >= 4,
  colliderFree: true,
  position: { x: ledMatrixAssembly.position.x, y: ledMatrixAssembly.position.y, z: ledMatrixAssembly.position.z },
  physicalWidth: LED_MATRIX_PHYSICAL_WIDTH,
  physicalHeight: LED_MATRIX_PHYSICAL_HEIGHT,
  canvasBacked: true,
  transport: 'POST /event -> room-event SSE'
};

// Deep-set panoramic window with a deterministic canvas skyline and animated rain.
const CITY_WINDOW_WIDTH = 1024;
const CITY_WINDOW_HEIGHT = 288;
const CITY_WINDOW_PHYSICAL_WIDTH = 5.2;
const CITY_WINDOW_PHYSICAL_HEIGHT = 1.45;
const CITY_WINDOW_OUTER_WIDTH = 5.6;
const CITY_WINDOW_OUTER_HEIGHT = 1.8;
const CITY_WINDOW_RAIN_STREAKS = 120;
const cityWindowCanvas = document.createElement('canvas');
cityWindowCanvas.width = CITY_WINDOW_WIDTH;
cityWindowCanvas.height = CITY_WINDOW_HEIGHT;
cityWindowCanvas.id = 'rainy-city-window-canvas';
cityWindowCanvas.dataset.displaySurface = 'rainy-night-city-window';
const cityWindowContext = cityWindowCanvas.getContext('2d', { alpha: false });
const citySkylineCanvas = document.createElement('canvas');
citySkylineCanvas.width = CITY_WINDOW_WIDTH;
citySkylineCanvas.height = CITY_WINDOW_HEIGHT;
const citySkylineContext = citySkylineCanvas.getContext('2d', { alpha: false });
let citySeed = 0x36c0ffee;
const cityRandom = () => {
  citySeed = (Math.imul(citySeed, 1664525) + 1013904223) >>> 0;
  return citySeed / 0x100000000;
};

function drawNightSkylineBase() {
  citySeed = 0x36c0ffee;
  const context = citySkylineContext;
  const sky = context.createLinearGradient(0, 0, 0, CITY_WINDOW_HEIGHT);
  sky.addColorStop(0, '#020713');
  sky.addColorStop(0.48, '#06182a');
  sky.addColorStop(1, '#07111c');
  context.fillStyle = sky;
  context.fillRect(0, 0, CITY_WINDOW_WIDTH, CITY_WINDOW_HEIGHT);

  const horizonGlow = context.createRadialGradient(690, 168, 8, 690, 168, 390);
  horizonGlow.addColorStop(0, 'rgba(17, 118, 170, .26)');
  horizonGlow.addColorStop(0.45, 'rgba(6, 58, 94, .14)');
  horizonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  context.fillStyle = horizonGlow;
  context.fillRect(0, 0, CITY_WINDOW_WIDTH, CITY_WINDOW_HEIGHT);

  // Tall middle-distance anchors keep the city dense and readable through wet glass.
  const heroBuildings = [
    { x: 34, width: 82, top: 66, color: '#07182a', edge: '#0b668f', antenna: 24 },
    { x: 142, width: 108, top: 98, color: '#081526', edge: '#0d4d72', antenna: 0 },
    { x: 282, width: 74, top: 42, color: '#061426', edge: '#1084aa', antenna: 36 },
    { x: 386, width: 128, top: 84, color: '#071321', edge: '#0b5c85', antenna: 18 },
    { x: 548, width: 88, top: 54, color: '#061729', edge: '#1693b7', antenna: 30 },
    { x: 674, width: 118, top: 76, color: '#07131f', edge: '#0c668d', antenna: 0 },
    { x: 824, width: 72, top: 34, color: '#061526', edge: '#1280a7', antenna: 42 },
    { x: 918, width: 94, top: 92, color: '#07121f', edge: '#0e557d', antenna: 16 }
  ];
  heroBuildings.forEach((building, buildingIndex) => {
    const height = 260 - building.top;
    const facade = context.createLinearGradient(building.x, 0, building.x + building.width, 0);
    facade.addColorStop(0, building.color);
    facade.addColorStop(0.78, '#040c16');
    facade.addColorStop(1, '#020811');
    context.fillStyle = facade;
    context.fillRect(building.x, building.top, building.width, height);
    context.fillStyle = building.edge;
    context.globalAlpha = 0.5;
    context.fillRect(building.x + 5, building.top + 8, 2, height * 0.8);
    context.globalAlpha = 1;
    if (building.antenna) {
      context.fillStyle = '#0b2d46';
      context.fillRect(building.x + building.width * 0.52, building.top - building.antenna, 3, building.antenna);
      context.fillStyle = buildingIndex % 2 ? '#f04b54' : '#26bfe7';
      context.fillRect(building.x + building.width * 0.52, building.top - building.antenna - 2, 3, 3);
    }
    const columns = Math.max(3, Math.floor(building.width / 14));
    const rows = Math.floor(height / 14);
    for (let column = 0; column < columns; column++) {
      for (let row = 0; row < rows; row++) {
        const lightCode = (column * 17 + row * 29 + buildingIndex * 11) % 13;
        if (lightCode > 4) continue;
        const warm = lightCode === 0 && (row + buildingIndex) % 4 === 0;
        context.fillStyle = warm ? 'rgba(239, 68, 69, .58)' : lightCode < 3 ? 'rgba(36, 178, 218, .64)' : 'rgba(15, 97, 143, .55)';
        context.fillRect(building.x + 9 + column * 13, building.top + 13 + row * 14, lightCode === 4 ? 5 : 3, 5 + (row % 2) * 3);
      }
    }
  });

  // Distant aerial traffic and haze add depth without making the skyline loud.
  context.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const y = 74 + cityRandom() * 142;
    const x = cityRandom() * 890;
    context.strokeStyle = i % 4 === 0 ? 'rgba(238, 58, 73, .24)' : 'rgba(27, 155, 202, .2)';
    context.lineWidth = 1 + cityRandom();
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + 18 + cityRandom() * 70, y - 1 - cityRandom() * 3);
    context.stroke();
  }

  for (let i = 0; i < 26; i++) {
    const x = cityRandom() * CITY_WINDOW_WIDTH;
    const y = 16 + cityRandom() * 126;
    context.fillStyle = `rgba(76, 175, 220, ${0.08 + cityRandom() * 0.16})`;
    context.fillRect(x, y, 1 + cityRandom() * 2, 1 + cityRandom() * 2);
  }

  const layers = [
    { baseline: 245, minWidth: 38, maxWidth: 92, minHeight: 52, maxHeight: 138, color: '#081526', window: '#17648c', chance: 0.18, alpha: 0.48 },
    { baseline: 270, minWidth: 46, maxWidth: 116, minHeight: 76, maxHeight: 196, color: '#06111d', window: '#1598c4', chance: 0.23, alpha: 0.72 },
    { baseline: 294, minWidth: 58, maxWidth: 132, minHeight: 64, maxHeight: 168, color: '#030912', window: '#17b8df', chance: 0.13, alpha: 0.88 }
  ];
  layers.forEach((layer, layerIndex) => {
    let x = -30 - cityRandom() * 70;
    while (x < CITY_WINDOW_WIDTH + 40) {
      const width = layer.minWidth + cityRandom() * (layer.maxWidth - layer.minWidth);
      const height = layer.minHeight + cityRandom() * (layer.maxHeight - layer.minHeight);
      const top = layer.baseline - height;
      context.globalAlpha = layer.alpha;
      context.fillStyle = layer.color;
      context.fillRect(Math.round(x), Math.round(top), Math.ceil(width), Math.ceil(height));
      if (cityRandom() > 0.64) context.fillRect(Math.round(x + width * 0.42), Math.round(top - 12 - cityRandom() * 22), Math.max(3, width * 0.08), 18 + cityRandom() * 26);
      context.globalAlpha = 1;
      const columns = Math.max(2, Math.floor(width / 13));
      const rows = Math.max(3, Math.floor(height / 15));
      for (let column = 0; column < columns; column++) {
        for (let row = 0; row < rows; row++) {
          if (cityRandom() > layer.chance) continue;
          const warm = cityRandom() > 0.92;
          context.fillStyle = warm ? `rgba(255, 92, 55, ${0.34 + cityRandom() * 0.4})` : layer.window;
          context.globalAlpha = warm ? 1 : 0.34 + cityRandom() * 0.55;
          context.fillRect(Math.round(x + 7 + column * 12), Math.round(top + 10 + row * 14), 3 + layerIndex, 5 + cityRandom() * 6);
        }
      }
      context.globalAlpha = 1;
      if (cityRandom() > 0.7) {
        context.fillStyle = layerIndex === 1 ? 'rgba(15, 187, 235, .68)' : 'rgba(12, 99, 151, .52)';
        context.fillRect(Math.round(x + width * (0.18 + cityRandom() * 0.62)), Math.round(top + 9), 2 + layerIndex, Math.max(20, height * 0.72));
      }
      x += width * (0.68 + cityRandom() * 0.23);
    }
  });

  context.globalAlpha = 1;
  context.fillStyle = 'rgba(4, 18, 29, .92)';
  context.fillRect(648, 83, 116, 42);
  context.strokeStyle = 'rgba(35, 202, 245, .7)';
  context.lineWidth = 2;
  context.strokeRect(650, 85, 112, 38);
  context.fillStyle = '#4edcff';
  context.font = '700 26px monospace';
  context.fillText('36C', 677, 114);
  context.shadowColor = '#ff304c';
  context.shadowBlur = 12;
  context.fillStyle = 'rgba(235, 44, 71, .85)';
  for (let i = 0; i < 5; i++) context.fillRect(840 + i * 23, 132 + (i % 2) * 7, 15, 5 + (i % 3) * 7);
  context.shadowBlur = 0;

  const streetGlow = context.createLinearGradient(0, 224, 0, 288);
  streetGlow.addColorStop(0, 'rgba(5, 42, 66, 0)');
  streetGlow.addColorStop(1, 'rgba(4, 73, 102, .3)');
  context.fillStyle = streetGlow;
  context.fillRect(0, 214, CITY_WINDOW_WIDTH, 74);
  for (let i = 0; i < 18; i++) {
    context.fillStyle = cityRandom() > 0.5 ? 'rgba(9, 172, 222, .35)' : 'rgba(255, 67, 49, .28)';
    context.fillRect(cityRandom() * CITY_WINDOW_WIDTH, 248 + cityRandom() * 30, 12 + cityRandom() * 48, 2);
  }
}

drawNightSkylineBase();
const cityRainDrops = Array.from({ length: CITY_WINDOW_RAIN_STREAKS }, () => ({
  x: cityRandom() * CITY_WINDOW_WIDTH,
  y: cityRandom() * CITY_WINDOW_HEIGHT,
  length: 14 + cityRandom() * 64,
  speed: 34 + cityRandom() * 92,
  drift: -2 + cityRandom() * 5,
  alpha: 0.08 + cityRandom() * 0.25,
  width: 0.6 + cityRandom() * 1.8
}));
const cityWindowState = {
  type: 'CanvasTexture',
  canvasElement: cityWindowCanvas instanceof HTMLCanvasElement,
  animated: true,
  mode: 'rainy-night-city',
  width: CITY_WINDOW_WIDTH,
  height: CITY_WINDOW_HEIGHT,
  skylineLayers: 3,
  rainStreaks: CITY_WINDOW_RAIN_STREAKS,
  updates: 0,
  lastFrameAt: -Infinity,
  phase: 0
};
const cityWindowTexture = new THREE.CanvasTexture(cityWindowCanvas);
cityWindowTexture.name = 'RainyNightCityCanvasTexture';
cityWindowTexture.colorSpace = THREE.SRGBColorSpace;
cityWindowTexture.minFilter = THREE.LinearFilter;
cityWindowTexture.magFilter = THREE.LinearFilter;

function updateRainyCityWindow(now, force = false) {
  if (!force && now - cityWindowState.lastFrameAt < 1 / 5) return;
  cityWindowState.lastFrameAt = now;
  cityWindowState.phase = now;
  const context = cityWindowContext;
  context.drawImage(citySkylineCanvas, 0, 0);
  const glassTint = context.createLinearGradient(0, 0, CITY_WINDOW_WIDTH, CITY_WINDOW_HEIGHT);
  glassTint.addColorStop(0, 'rgba(2, 18, 31, .16)');
  glassTint.addColorStop(0.55, 'rgba(6, 48, 72, .06)');
  glassTint.addColorStop(1, 'rgba(1, 8, 16, .24)');
  context.fillStyle = glassTint;
  context.fillRect(0, 0, CITY_WINDOW_WIDTH, CITY_WINDOW_HEIGHT);
  context.lineCap = 'round';
  const rainOpacities = [0.1, 0.16, 0.22, 0.3];
  rainOpacities.forEach((opacity, bucket) => {
    context.strokeStyle = `rgba(118, 207, 238, ${opacity})`;
    context.lineWidth = 0.8 + bucket * 0.42;
    context.beginPath();
    cityRainDrops.forEach((drop, index) => {
      if (index % rainOpacities.length !== bucket) return;
      const y = (drop.y + now * drop.speed + index * 1.7) % (CITY_WINDOW_HEIGHT + drop.length) - drop.length;
      const x = (drop.x + now * drop.drift + CITY_WINDOW_WIDTH) % CITY_WINDOW_WIDTH;
      context.moveTo(x, y);
      context.lineTo(x + 2.5, y + drop.length);
    });
    context.stroke();
  });
  for (let i = 0; i < 18; i++) {
    const drop = cityRainDrops[i * 5];
    const y = (drop.y * 1.7 + now * drop.speed * 0.22) % CITY_WINDOW_HEIGHT;
    context.fillStyle = `rgba(164, 226, 248, ${drop.alpha * 0.45})`;
    context.beginPath();
    context.ellipse(drop.x, y, 1.5 + drop.width, 3 + drop.width * 2.4, 0.08, 0, Math.PI * 2);
    context.fill();
  }
  const vignette = context.createRadialGradient(CITY_WINDOW_WIDTH * 0.52, CITY_WINDOW_HEIGHT * 0.48, 80, CITY_WINDOW_WIDTH * 0.52, CITY_WINDOW_HEIGHT * 0.48, 590);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 2, 8, .46)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, CITY_WINDOW_WIDTH, CITY_WINDOW_HEIGHT);
  cityWindowTexture.needsUpdate = true;
  cityWindowState.updates += 1;
}

const cityWindowAssembly = new THREE.Group();
cityWindowAssembly.name = 'RainyCityWindow';
cityWindowAssembly.position.set(2.15, 5.65, -6.82);
scene.add(cityWindowAssembly);
const cityWindowFrameMat = new THREE.MeshStandardMaterial({ color: 0x07121d, roughness: 0.36, metalness: 0.76, emissive: 0x031a32, emissiveIntensity: 0.24 });
const cityWindowRecessMat = new THREE.MeshStandardMaterial({ color: 0x03070c, roughness: 0.84, metalness: 0.18 });
const cityWindowSillMat = new THREE.MeshStandardMaterial({ color: 0x0a1012, roughness: 0.58, metalness: 0.38 });
const cityWindowCyanMat = new THREE.MeshBasicMaterial({ color: 0x168fc5, transparent: true, opacity: 0.62, toneMapped: false });
box([CITY_WINDOW_OUTER_WIDTH, CITY_WINDOW_OUTER_HEIGHT, 0.2], cityWindowRecessMat, [0, 0, -0.04], cityWindowAssembly, 'CityWindowRecessBack');
const cityWindowView = new THREE.Mesh(new THREE.PlaneGeometry(CITY_WINDOW_PHYSICAL_WIDTH, CITY_WINDOW_PHYSICAL_HEIGHT), new THREE.MeshBasicMaterial({ map: cityWindowTexture, color: 0xffffff, toneMapped: false }));
cityWindowView.name = 'CityWindowAnimatedSkyline';
cityWindowView.position.z = 0.075;
cityWindowView.castShadow = false;
cityWindowAssembly.add(cityWindowView);
const cityWindowGlass = new THREE.Mesh(new THREE.PlaneGeometry(CITY_WINDOW_PHYSICAL_WIDTH, CITY_WINDOW_PHYSICAL_HEIGHT), new THREE.MeshPhysicalMaterial({ color: 0x164763, transparent: true, opacity: 0.14, roughness: 0.16, metalness: 0.05, transmission: 0, side: THREE.DoubleSide }));
cityWindowGlass.name = 'CityWindowWetGlass';
cityWindowGlass.position.z = 0.095;
cityWindowAssembly.add(cityWindowGlass);
box([5.5, 0.16, 0.19], cityWindowFrameMat, [0, 0.82, 0.08], cityWindowAssembly, 'CityWindowTopFrame');
box([5.5, 0.16, 0.19], cityWindowFrameMat, [0, -0.82, 0.08], cityWindowAssembly, 'CityWindowBottomFrame');
box([0.16, 1.5, 0.19], cityWindowFrameMat, [-2.68, 0, 0.08], cityWindowAssembly, 'CityWindowLeftFrame');
box([0.16, 1.5, 0.19], cityWindowFrameMat, [2.68, 0, 0.08], cityWindowAssembly, 'CityWindowRightFrame');
for (const [index, x] of [[1, -1.3], [2, 0.73]]) box([0.09, 1.45, 0.16], cityWindowFrameMat, [x, 0, 0.12], cityWindowAssembly, `CityWindowMullion${index}`);
box([5.72, 0.14, 0.38], cityWindowSillMat, [0, -0.84, 0.16], cityWindowAssembly, 'CityWindowSill');
box([5.18, 0.025, 0.04], cityWindowCyanMat, [0, -0.735, 0.14], cityWindowAssembly, 'CityWindowLowerBlueEdge');
box([0.025, 1.42, 0.04], cityWindowCyanMat, [-2.575, 0, 0.14], cityWindowAssembly, 'CityWindowLeftBlueEdge');
const cityWindowGlow = new THREE.PointLight(0x1a8fca, 8.0, 4.4, 2);
cityWindowGlow.name = 'CityWindowCoolInteriorGlow';
cityWindowGlow.position.set(0, -0.28, 0.82);
cityWindowAssembly.add(cityWindowGlow);
updateRainyCityWindow(0, true);
const cityWindowBottom = cityWindowAssembly.position.y - CITY_WINDOW_OUTER_HEIGHT / 2;
const ledMatrixTop = ledMatrixAssembly.position.y + 1.86 / 2;
const cityWindowRuntime = {
  model: 'recessed-rainy-city-window-v1',
  wall: 'back',
  position: { x: cityWindowAssembly.position.x, y: cityWindowAssembly.position.y, z: cityWindowAssembly.position.z },
  physicalWidth: CITY_WINDOW_PHYSICAL_WIDTH,
  physicalHeight: CITY_WINDOW_PHYSICAL_HEIGHT,
  panes: 3,
  mullions: 2,
  recessed: true,
  wetGlass: cityWindowGlass.parent === cityWindowAssembly,
  colliderFree: true,
  aboveLedMatrix: cityWindowBottom > ledMatrixTop,
  verticalGapAboveMatrix: cityWindowBottom - ledMatrixTop,
  ceilingClearance: 7 - (cityWindowAssembly.position.y + CITY_WINDOW_OUTER_HEIGHT / 2),
  canvasBacked: true
};

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
const ELECTRICAL_PANEL_Z = 3.85;
electricalPanel.position.set(-6.83, 0, ELECTRICAL_PANEL_Z);
electricalPanel.rotation.y = Math.PI / 2;
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

const electricalPanelHalfWidth = 1.15 / 2;
const electricalPanelRightEdgeZ = ELECTRICAL_PANEL_Z + electricalPanelHalfWidth;
const doorRoomViewRightEdgeZ = doorZ - 0.65;
const stairRoomViewRightEdgeZ = STAIR_TOP_POINT.z + railOffset.z;
const electricalPanelRuntime = {
  wall: 'left',
  side: 'room-view-right-of-stairs-and-door',
  position: {
    x: electricalPanel.position.x,
    y: electricalPanel.position.y,
    z: electricalPanel.position.z
  },
  rotationY: electricalPanel.rotation.y,
  rotatedToWall: Math.abs(electricalPanel.rotation.y - Math.PI / 2) < 0.001,
  conduitAttached: electricalPanel.getObjectByName('CeilingConduit')?.parent === electricalPanel,
  conduitTop,
  entirelyRightOfDoor: electricalPanelRightEdgeZ < doorRoomViewRightEdgeZ,
  entirelyRightOfStairs: electricalPanelRightEdgeZ < stairRoomViewRightEdgeZ,
  doorClearance: doorRoomViewRightEdgeZ - electricalPanelRightEdgeZ,
  stairClearance: stairRoomViewRightEdgeZ - electricalPanelRightEdgeZ
};

const stations = [
  { id: 'workbench', label: 'BENCH', group: workbench, collider: workbenchCollider, spot: WORK_SPOT, finalYaw: -Math.PI / 2, hits: 0 },
  { id: 'desk', label: 'DESK', group: desk, collider: deskCollider, spot: DESK_SPOT, finalYaw: Math.PI / 2, hits: 0 },
  { id: 'testbench', label: 'TEST BENCH', group: testBench, collider: testBenchCollider, spot: TEST_BENCH_SPOT, finalYaw: Math.PI, hits: 0 }
];
const HOME = new THREE.Vector3(0, 0, 0);
const coffeeTableWorldCenter = {
  x: lounge.position.x + coffeeTable.position.x,
  z: lounge.position.z + coffeeTable.position.z
};
const coffeeTablePathFacingZ = coffeeTableWorldCenter.z + COFFEE_TABLE_DEPTH / 2;
const couchPathXAtTable = HOME.x + (COUCH_SPOT.x - HOME.x)
  * ((coffeeTablePathFacingZ - HOME.z) / (COUCH_SPOT.z - HOME.z));
const coffeeTableApproachSideClearance = coffeeTableWorldCenter.x - COFFEE_TABLE_WIDTH / 2 - couchPathXAtTable;
const coffeeTableRuntime = {
  movedAsAssembly: loungePlants.every(plant => plant.parent === coffeeTable)
    && loungeMagazines.every(magazine => magazine.parent === coffeeTable),
  direction: 'room-right-positive-x',
  shiftRight: coffeeTable.position.x - COFFEE_TABLE_ORIGINAL_X,
  localPosition: { x: coffeeTable.position.x, z: coffeeTable.position.z },
  worldPosition: { ...coffeeTableWorldCenter },
  width: COFFEE_TABLE_WIDTH,
  depth: COFFEE_TABLE_DEPTH,
  approachSideClearance: coffeeTableApproachSideClearance,
  onRug: Math.abs(coffeeTable.position.x) + COFFEE_TABLE_WIDTH / 2 <= 5.8 / 2
    && Math.abs(coffeeTable.position.z - (-2.0)) + COFFEE_TABLE_DEPTH / 2 <= 3.65 / 2
};

// Three independently-authored semantic overlays add the reference's missing
// hero platform and lived-in workshop density without replacing interactions.
const referenceSetDressing = new THREE.Group();
referenceSetDressing.name = 'CozyRoboticsWorkshopReferenceSet';
scene.add(referenceSetDressing);

const centralRobotBay = createCentralRobotBay({
  platformRadius: 1.82,
  platformHeight: 0.08,
  includeLights: !legacyAoMode,
  lightIntensity: 4.0,
  cartSide: 1,
  castShadow: false,
  receiveShadow: false
});
centralRobotBay.position.y = -0.07;
const referencePartsCart = centralRobotBay.getObjectByName('RedRobotPartsCart');
if (referencePartsCart) {
  referencePartsCart.scale.setScalar(1.9);
  referencePartsCart.position.set(3.0, 0, 1.2);
}
referenceSetDressing.add(centralRobotBay);

const leftWorkshopReference = createLeftWorkshopDetails({
  position: [-6.18, 0, -1.5],
  lights: !legacyAoMode,
  shadows: false
});
leftWorkshopReference.position.z += 0.65;
leftWorkshopReference.scale.set(1.05, 1.16, 1.18);
const buildDebugSign = leftWorkshopReference.getObjectByName('BuildDebugDeployRepeatCyanSign');
if (buildDebugSign) {
  const signCenter = new THREE.Vector3(-0.65, 3.45, 1.28);
  for (const child of buildDebugSign.children) {
    child.position.sub(signCenter);
    if (child.isMesh) child.scale.multiplyScalar(1.55);
    if (child.name === 'CyanSignFace') {
      child.position.x = 0.135;
      child.material.emissiveIntensity = 3.2;
      child.material.toneMapped = false;
      child.material.side = THREE.DoubleSide;
      child.material.needsUpdate = true;
    }
  }
  buildDebugSign.position.set(-6.45, 4.55, 2.3);
  buildDebugSign.rotation.y = 0;
  referenceSetDressing.add(buildDebugSign);
}
referenceSetDressing.add(leftWorkshopReference);

const rightLoungeReference = createRightLoungeDetails({
  lights: !legacyAoMode,
  shadows: false
});
const rightNarrative = rightLoungeReference.getObjectByName('CodingWallNarrative');
for (const panelName of ['WideSystemStatusDisplay', 'CyanCodePanel', 'RainyCityTelemetryPanel']) {
  const duplicatePanel = rightNarrative?.getObjectByName(panelName);
  if (duplicatePanel) duplicatePanel.visible = false;
}
const todoBoard = rightNarrative?.getObjectByName('TodoWhiteboard');
if (todoBoard) {
  todoBoard.position.set(6.35, 4.30, -1.15);
  todoBoard.rotation.set(0, Math.PI / 3.1, 0);
  todoBoard.scale.setScalar(0.92);
  const todoSurface = todoBoard.getObjectByName('TodoWhiteboardCanvasSurface');
  if (todoSurface?.material) {
    todoSurface.material.toneMapped = true;
    todoSurface.material.color.set(0xd4d0c6);
  }
}
const duplicateTallPlant = rightLoungeReference.getObjectByName('TallRightWallPlant');
if (duplicateTallPlant) duplicateTallPlant.visible = false;
const beverageFridge = rightLoungeReference.getObjectByName('BlueLitBeverageFridge');
if (beverageFridge) beverageFridge.position.set(5.35, 0, 4.15);
const rightVentPipe = rightLoungeReference.getObjectByName('RightWallVentPipe');
if (rightVentPipe) rightVentPipe.position.set(0, 0, -1.15);
const deskEmbellishments = rightLoungeReference.getObjectByName('CodingDeskEmbellishments');
if (deskEmbellishments) deskEmbellishments.position.set(-0.63, 0, 0.45);
const loungeForegroundAccents = rightLoungeReference.getObjectByName('LoungeForegroundAccents');
if (loungeForegroundAccents) loungeForegroundAccents.position.set(-1.6, 0, 0.25);
const patternedRugOverlay = rightLoungeReference.getObjectByName('PatternedRugOverlay');
if (patternedRugOverlay) patternedRugOverlay.scale.x = 5.7;
const loungeMusic = rightLoungeReference.getObjectByName('LoungeGuitarAndAmp');
let referenceGuitar = null;
if (loungeMusic) {
  loungeMusic.position.set(-8.45, 0, 5.45);
  loungeMusic.scale.setScalar(1);
  referenceGuitar = loungeMusic.getObjectByName('RustElectricGuitar');
  if (referenceGuitar) {
    referenceGuitar.position.x += 1.3;
    referenceGuitar.position.z += 0.9;
    referenceGuitar.scale.setScalar(1.35);
    referenceGuitar.traverse((child) => {
      if (!child.isMesh) return;
      child.material = child.material.clone();
      child.material.depthTest = false;
      child.material.depthWrite = false;
      child.renderOrder = 6;
      if (!/Guitar(LowerBout|UpperBout|Headstock)/.test(child.name)) return;
      child.material.color.setHex(0xe3743f);
      child.material.emissive?.setHex(0x351006);
      child.material.emissiveIntensity = 0.32;
    });
  }
  const referenceAmp = loungeMusic.getObjectByName('GuitarAmpCabinet')?.parent;
  if (referenceAmp && referenceAmp !== loungeMusic) referenceAmp.scale.setScalar(1.0);
  loungeMusic.traverse((child) => {
    if (child.isMesh || child.isInstancedMesh) child.userData.noAutoBatch = true;
  });
}
referenceSetDressing.add(rightLoungeReference);

function consolidateReferenceStaticMeshes(root, batchPrefix) {
  for (const child of [...root.children]) {
    if (!child.userData.manualBatchOutput || child.userData.batchPrefix !== batchPrefix) continue;
    root.remove(child);
    child.geometry?.dispose();
  }
  root.traverse((object) => {
    if (object.userData.manualBatchSourcePrefix === batchPrefix) object.visible = true;
  });
  root.updateMatrixWorld(true);
  const rootInverse = root.matrixWorld.clone().invert();
  const materialGroups = new Map();
  root.traverse((object) => {
    if (!object.isMesh || object.isInstancedMesh || !object.visible || Array.isArray(object.material) || object.userData.manualBatchOutput) return;
    if (!object.geometry?.attributes?.position || object.material.transparent) return;
    const key = object.material.uuid;
    if (!materialGroups.has(key)) materialGroups.set(key, { material: object.material, meshes: [] });
    materialGroups.get(key).meshes.push(object);
  });
  let batchIndex = 0;
  for (const { material, meshes } of materialGroups.values()) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map((mesh) => {
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(rootInverse.clone().multiply(mesh.matrixWorld));
      return geometry;
    });
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) continue;
    const batch = new THREE.Mesh(merged, material);
    batch.name = `${batchPrefix}-${++batchIndex}`;
    batch.castShadow = false;
    batch.receiveShadow = false;
    batch.userData.noAutoBatch = true;
    batch.userData.manualBatchOutput = true;
    batch.userData.batchPrefix = batchPrefix;
    batch.userData.sourceMeshes = meshes;
    root.add(batch);
    meshes.forEach((mesh) => {
      mesh.userData.manualBatchSourcePrefix = batchPrefix;
      mesh.visible = false;
    });
  }
  return batchIndex;
}

const compositionDensityFill = createCompositionDensityFill({
  shadows: false,
  lights: !legacyAoMode,
  lightIntensity: 2.1,
  warm: 0xffa354
});
referenceSetDressing.add(compositionDensityFill);
const densityUpperBand = compositionDensityFill.getObjectByName('UpperCenterBackWallShelfAndDuctBand');
if (densityUpperBand) {
  densityUpperBand.position.set(1.1, -0.84, 0);
  densityUpperBand.scale.set(1.4, 1.2, 1);
}
const densityCabinet = compositionDensityFill.getObjectByName('LowEquipmentCabinetToolCase');
if (densityCabinet) densityCabinet.position.set(-0.35, 0, -0.2);
const centralPegboard = compositionDensityFill.getObjectByName('CentralWorkbenchPegboard');
if (centralPegboard) {
  const pegCanvas = document.createElement('canvas');
  pegCanvas.width = 1024;
  pegCanvas.height = 512;
  const context = pegCanvas.getContext('2d');
  context.fillStyle = '#302d29';
  context.fillRect(0, 0, pegCanvas.width, pegCanvas.height);
  context.fillStyle = '#5a554c';
  for (let y = 24; y < 500; y += 28) for (let x = 22; x < 1010; x += 28) {
    context.beginPath(); context.arc(x, y, 3.3, 0, Math.PI * 2); context.fill();
  }
  context.strokeStyle = '#c0c5bf'; context.fillStyle = '#c0c5bf'; context.lineWidth = 7; context.lineCap = 'round';
  const tools = Array.from({ length: 13 }, (_, index) => {
    const x = 70 + index * 72;
    return [x, 92 + (index % 3) * 24, x + (index % 2 ? 11 : -9), 320 + (index % 4) * 17];
  });
  tools.forEach(([x1, y1, x2, y2], index) => {
    context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke();
    context.lineWidth = 11; context.beginPath(); context.moveTo(x1 - 12, y1 + 8); context.lineTo(x1 + 12, y1 - 8); context.stroke(); context.lineWidth = 7;
    context.fillStyle = index % 2 ? '#d85a38' : '#d39a42'; context.fillRect(x2 - 9, y2 - 3, 18, 62); context.fillStyle = '#c0c5bf';
  });
  context.strokeStyle = '#7dd2df'; context.lineWidth = 3; context.strokeRect(34, 32, 956, 444);
  context.font = 'bold 28px monospace'; context.fillStyle = '#e5c078'; context.fillText('ROBOTICS / FABRICATION', 54, 70);
  context.font = '20px monospace'; context.fillStyle = '#8cb8bd'; context.fillText('CALIBRATE  •  REPAIR  •  TEST', 590, 466);
  const pegTexture = new THREE.CanvasTexture(pegCanvas);
  pegTexture.colorSpace = THREE.SRGBColorSpace;
  pegTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  pegTexture.name = 'central-workbench-detailed-pegboard';
  centralPegboard.material = new THREE.MeshStandardMaterial({
    name: 'CentralWorkbenchDetailedPegboard', map: pegTexture, roughness: 0.82, metalness: 0.04
  });
}
const centralWorkbenchTop = compositionDensityFill.getObjectByName('CentralWorkbenchTop');
if (centralWorkbenchTop) {
  centralWorkbenchTop.material = new THREE.MeshStandardMaterial({
    name: 'CentralWorkbenchProceduralWood', color: 0xa36a3e,
    map: floorTextures.map, bumpMap: floorTextures.bumpMap, bumpScale: 0.075,
    roughness: 0.70, metalness: 0.02
  });
}
const densityManualBatchCount = consolidateReferenceStaticMeshes(compositionDensityFill, 'CompositionDensityMaterialBatch');
const densityRawRuntime = compositionDensityFill.userData.referenceRuntime;
const compositionFillRuntime = {
  model: 'reference-composition-density-fill-v1',
  upperWall: {
    shelves: densityRawRuntime.counts.shelfLevels,
    stockedProps: densityRawRuntime.counts.shelfBooks
      + densityRawRuntime.counts.storageBins + 5,
    hasCurvedDuct: densityRawRuntime.counts.ductSegments > 0,
    hasCableTray: densityRawRuntime.counts.cableTrayRungs > 0
  },
  stairBase: {
    hasEquipmentCabinet: densityRawRuntime.counts.equipmentCases > 0,
    hasPlant: densityRawRuntime.counts.leafyPlants > 0,
    hasCoiledCable: densityRawRuntime.counts.cableCoils > 0
  },
  practicalLights: densityRawRuntime.counts.lightCount,
  anchors: densityRawRuntime.anchors,
  constraints: densityRawRuntime.constraints
};

const strictReferenceDetailFill = createStrictReferenceDetailFill({
  shadows: false,
  lights: !legacyAoMode,
  lightIntensity: 1.1,
  warm: 0xff9f55,
  cyan: 0x56d9ff
});
const strictLeftBooster = strictReferenceDetailFill.getObjectByName('LeftWorkbenchPegboardBooster');
if (strictLeftBooster) {
  strictLeftBooster.position.add(new THREE.Vector3(0.3, 0.2, 0.4));
  strictLeftBooster.rotation.y = 0.12;
  strictLeftBooster.scale.setScalar(1.25);
}
const strictLoungeBooster = strictReferenceDetailFill.getObjectByName('ForegroundLoungeBooster');
const duplicateRustBeanbag = strictReferenceDetailFill.getObjectByName('RustBeanbagAssembly');
if (duplicateRustBeanbag) duplicateRustBeanbag.scale.setScalar(0.001);
if (strictLoungeBooster) {
  strictLoungeBooster.position.add(new THREE.Vector3(0, 0, 1.0));
  strictLoungeBooster.rotation.y = 0.21;
  strictLoungeBooster.scale.setScalar(1.15);
}
const strictRightBooster = strictReferenceDetailFill.getObjectByName('RightWorkstationBooster');
if (strictRightBooster) {
  strictRightBooster.position.add(new THREE.Vector3(-0.35, 0, -0.35));
  strictRightBooster.rotation.y = -0.21;
  strictRightBooster.scale.set(1.05, 0.82, 1.24);
}
consolidateReferenceStaticMeshes(strictReferenceDetailFill, 'StrictDetailMaterialBatch');
referenceSetDressing.add(strictReferenceDetailFill);
const strictRawRuntime = strictReferenceDetailFill.userData.referenceRuntime;
const strictCounts = strictRawRuntime.counts;
const strictDetailRuntime = {
  model: strictRawRuntime.model,
  clusters: strictRawRuntime.constraints.clusterCount,
  workbench: {
    toolSilhouettes: strictCounts.drills + strictCounts.wrenches + strictCounts.solderStations + strictCounts.hangingLeads,
    partsBins: strictCounts.partsBins,
    cableReel: strictCounts.cableReels > 0
  },
  lounge: {
    beanbag: strictCounts.beanbags > 0,
    accessories: strictCounts.sideCrates + strictCounts.readingStacks + strictCounts.mugs + strictCounts.headphones + strictCounts.beanbags,
    floorCable: strictCounts.floorCableCoils > 0
  },
  workstation: {
    extraMonitors: strictCounts.secondMonitors,
    speakers: strictCounts.speakerPairs * 2,
    cableBundle: strictCounts.cableBundles > 0
  },
  practicalLights: strictCounts.pointLights,
  raw: strictRawRuntime
};

const upperLeftServiceBand = new THREE.Group();
upperLeftServiceBand.name = 'ReferenceUpperLeftServiceBand';
referenceSetDressing.add(upperLeftServiceBand);
const serviceDarkMaterial = new THREE.MeshStandardMaterial({
  color: 0x20262b, roughness: 0.58, metalness: 0.72
});
const serviceSilverMaterial = new THREE.MeshStandardMaterial({
  color: 0x9ba3a5, roughness: 0.3, metalness: 0.88
});
const serviceCopperMaterial = new THREE.MeshStandardMaterial({
  color: 0xa8663d, roughness: 0.4, metalness: 0.72
});
const serviceRedMaterial = new THREE.MeshStandardMaterial({
  color: 0xa52e29, emissive: 0x3b0705, emissiveIntensity: 0.35, roughness: 0.66
});
const serviceBlueMaterial = new THREE.MeshStandardMaterial({
  color: 0x2d6679, emissive: 0x062b38, emissiveIntensity: 0.45, roughness: 0.62
});
const addServicePipe = (name, x, y, z, radius, length, material) => {
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 12), material);
  pipe.name = name;
  pipe.rotation.x = Math.PI / 2;
  pipe.position.set(x, y, z);
  pipe.castShadow = false;
  pipe.receiveShadow = false;
  upperLeftServiceBand.add(pipe);
};
const serviceTray = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 8.8), serviceDarkMaterial);
serviceTray.name = 'UpperLeftOverheadCableTray';
serviceTray.position.set(-6.74, 6.28, -1.55);
upperLeftServiceBand.add(serviceTray);
addServicePipe('UpperLeftSilverMain', -6.62, 5.88, -1.65, 0.14, 8.3, serviceSilverMaterial);
addServicePipe('UpperLeftCopperReturn', -6.48, 5.55, -1.45, 0.10, 7.8, serviceCopperMaterial);
addServicePipe('UpperLeftRedCable', -6.36, 6.12, -1.52, 0.045, 8.1, serviceRedMaterial);
addServicePipe('UpperLeftBlueCable', -6.26, 6.02, -1.52, 0.045, 8.1, serviceBlueMaterial);
for (let index = 0; index < 7; index += 1) {
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.1, 0.12), serviceDarkMaterial);
  bracket.name = `UpperLeftServiceBracket${index + 1}`;
  bracket.position.set(-6.48, 5.72, -5.0 + index * 1.12);
  upperLeftServiceBand.add(bracket);
}
if (!legacyAoMode) {
  const serviceInspectionLight = new THREE.PointLight(0xff9f55, 6.5, 4.4, 2);
  serviceInspectionLight.name = 'UpperLeftServiceInspectionLight';
  serviceInspectionLight.position.set(-6.22, 5.05, -0.7);
  serviceInspectionLight.castShadow = false;
  upperLeftServiceBand.add(serviceInspectionLight);
}

// Ground the largest furniture clusters with inexpensive soft contact patches.
// These provide the reference's dark furniture/floor separation without static
// shadow maps or another scene render.
const contactPatchCanvas = document.createElement('canvas');
contactPatchCanvas.width = 128;
contactPatchCanvas.height = 128;
const contactPatchContext = contactPatchCanvas.getContext('2d');
const contactPatchGradient = contactPatchContext.createRadialGradient(64, 64, 4, 64, 64, 62);
contactPatchGradient.addColorStop(0, 'rgba(0, 0, 0, 0.28)');
contactPatchGradient.addColorStop(0.56, 'rgba(0, 0, 0, 0.12)');
contactPatchGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
contactPatchContext.fillStyle = contactPatchGradient;
contactPatchContext.fillRect(0, 0, 128, 128);
const contactPatchTexture = new THREE.CanvasTexture(contactPatchCanvas);
contactPatchTexture.name = 'ReferenceFurnitureContactPatchTexture';
const contactPatchMaterial = new THREE.MeshBasicMaterial({
  map: contactPatchTexture,
  transparent: true,
  opacity: 0.24,
  depthWrite: false,
  toneMapped: false
});
const contactPatches = new THREE.Group();
contactPatches.name = 'ReferenceFurnitureContactPatches';
referenceSetDressing.add(contactPatches);
for (const [name, x, z, width, depth] of [
  ['WorkbenchContact', -6.0, -1.5, 1.1, 3.8],
  ['CodingDeskContact', 5.55, -0.85, 1.5, 3.9],
  ['TestBenchContact', 1.6, -6.05, 3.5, 1.0],
  ['LoungeContact', 2.4, 5.4, 4.8, 3.0]
]) {
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), contactPatchMaterial);
  patch.name = name;
  patch.rotation.x = -Math.PI / 2;
  patch.position.set(x, 0.012, z);
  patch.renderOrder = 1;
  contactPatches.add(patch);
}

const referenceMatchRuntime = {
  enabled: true,
  model: 'cozy-robotics-workshop-reference-v1',
  camera: {
    projection: 'perspective-isometric',
    heroVisible: true,
    framing: 'full-room-three-quarter'
  },
  zones: {
    centralRobotBay: centralRobotBay.userData.referenceRuntime,
    leftWorkshop: leftWorkshopReference.userData.referenceRuntime,
    rightLounge: rightLoungeReference.userData.referenceRuntime,
    compositionFill: compositionFillRuntime,
    strictDetail: strictDetailRuntime
  },
  identityFeatures: [
    'hazard-platform',
    'warm-platform-rim-bulbs',
    'robot-parts-cart',
    'cyan-battery-pillar',
    'build-debug-deploy-repeat-sign',
    'danger-electrical-cabinet',
    'robot-blueprint',
    'todo-whiteboard',
    'system-status-display',
    'guitar-and-amp',
    'patterned-rug',
    'blue-lit-beverage-fridge',
    'coffee-station',
    'vent-pipe',
    'upper-center-density-fill',
    'strict-reference-detail-fill'
  ],
  targetPalette: ['warm-amber', 'cyan-blue', 'warning-red', 'dark-brick', 'warm-wood']
};

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

scene.add(new THREE.HemisphereLight(0x74849a, 0x170c08, 0.18));
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
const redRim = new THREE.PointLight(0xff392d, 14, 7, 2);
redRim.position.set(-3, 2.5, -3.5);
scene.add(redRim);
const rearLeftRedPractical = new THREE.PointLight(0xff3227, 9.5, 5.2, 2);
rearLeftRedPractical.name = 'RearLeftDoorWorkshopRedPractical';
rearLeftRedPractical.position.set(-5.75, 3.85, -3.85);
scene.add(rearLeftRedPractical);

const STATIC_SCENE_LAYER = 0;
const ROBOT_LIGHT_LAYER = 1;

function createBakedAoTexture(size = 128) {
  const aoCanvas = document.createElement('canvas');
  aoCanvas.width = aoCanvas.height = size;
  const context = aoCanvas.getContext('2d');
  const image = context.createImageData(size, size);
  let seed = 0xa05c3e11;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const edgeDistance = Math.min(u, v, 1 - u, 1 - v) * 2;
      const cornerDistance = Math.min(
        Math.hypot(u, v),
        Math.hypot(1 - u, v),
        Math.hypot(u, 1 - v),
        Math.hypot(1 - u, 1 - v)
      );
      const edgeOcclusion = THREE.MathUtils.smoothstep(edgeDistance, 0, 0.32);
      const cornerOcclusion = 1 - THREE.MathUtils.smoothstep(cornerDistance, 0.02, 0.48);
      const value = THREE.MathUtils.clamp(0.7 + edgeOcclusion * 0.22 - cornerOcclusion * 0.08 + (random() - 0.5) * 0.035, 0.58, 0.94);
      const channel = Math.round(value * 255);
      const offset = (y * size + x) * 4;
      image.data[offset] = channel;
      image.data[offset + 1] = channel;
      image.data[offset + 2] = channel;
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(aoCanvas);
  texture.name = 'room-static-ao-bake-v1';
  texture.channel = 1;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

const staticAoTexture = createBakedAoTexture();
const staticAoMaterialCache = new Map();
const bakedLightDirection = new THREE.Vector3(-0.35, 0.82, 0.45).normalize();
const bakedNormal = new THREE.Vector3();
const bakedPosition = new THREE.Vector3();
const bakedNormalMatrix = new THREE.Matrix3();
let staticMeshesBaked = 0;
let staticAoMaterials = 0;

function isRobotDescendant(object) {
  for (let current = object; current; current = current.parent) {
    if (current === cubeRig) return true;
  }
  return false;
}

function bakeStaticVertexLighting(mesh) {
  const source = mesh.geometry;
  if (!source?.attributes?.position || !source.attributes.normal) return;
  const geometry = source.clone();
  mesh.geometry = geometry;
  if (geometry.attributes.uv && !geometry.attributes.uv1) {
    geometry.setAttribute('uv1', geometry.attributes.uv.clone());
  }

  bakedNormalMatrix.getNormalMatrix(mesh.matrixWorld);
  const normal = geometry.attributes.normal;
  const position = geometry.attributes.position;
  const colors = new Float32Array(position.count * 3);
  for (let index = 0; index < position.count; index++) {
    bakedNormal.fromBufferAttribute(normal, index).applyMatrix3(bakedNormalMatrix).normalize();
    bakedPosition.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld);
    const directional = Math.max(0, bakedNormal.dot(bakedLightDirection));
    const upwardFill = Math.max(0, bakedNormal.y) * 0.08;
    const floorContact = bakedPosition.y < 0.18 ? THREE.MathUtils.lerp(0.78, 1, Math.max(0, bakedPosition.y) / 0.18) : 1;
    const wallContact = Math.max(Math.abs(bakedPosition.x), Math.abs(bakedPosition.z)) > 6.72 ? 0.9 : 1;
    const underside = bakedNormal.y < -0.15 ? 0.78 : 1;
    const irradiance = THREE.MathUtils.clamp((0.62 + directional * 0.3 + upwardFill) * floorContact * wallContact * underside, 0.54, 0.98);
    colors[index * 3] = irradiance;
    colors[index * 3 + 1] = irradiance;
    colors[index * 3 + 2] = irradiance;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

function bakedStaticMaterial(source) {
  if (staticAoMaterialCache.has(source.uuid)) return staticAoMaterialCache.get(source.uuid);
  const hasVisibleEmissive = source.emissive?.getHex?.() !== 0 && source.emissiveIntensity > 0.45;
  const isDisplay = source.map?.isCanvasTexture || hasVisibleEmissive;
  const color = source.color?.clone?.() || new THREE.Color(0xffffff);
  if (!isDisplay && Math.max(color.r, color.g, color.b) < 0.13) {
    color.lerp(new THREE.Color(0x4b4d50), 0.18);
  }
  if (source.emissive?.getHex?.() !== 0 && source.emissiveIntensity > 0) {
    color.lerp(source.emissive, Math.min(0.28, source.emissiveIntensity * 0.1));
  }
  const material = new THREE.MeshBasicMaterial({
    name: `${source.name || source.type}-ao-baked`,
    color,
    map: source.map || null,
    aoMap: isDisplay || !source.map && source.transparent ? null : staticAoTexture,
    aoMapIntensity: 0.82,
    alphaMap: source.alphaMap || null,
    transparent: source.transparent,
    opacity: source.opacity,
    alphaTest: source.alphaTest,
    side: source.side,
    depthTest: source.depthTest,
    depthWrite: source.depthWrite,
    colorWrite: source.colorWrite,
    blending: source.blending,
    fog: source.fog,
    toneMapped: source.toneMapped,
    vertexColors: !isDisplay
  });
  material.polygonOffset = source.polygonOffset;
  material.polygonOffsetFactor = source.polygonOffsetFactor;
  material.polygonOffsetUnits = source.polygonOffsetUnits;
  staticAoMaterialCache.set(source.uuid, material);
  if (material.aoMap) staticAoMaterials += 1;
  return material;
}

scene.updateMatrixWorld(true);
if (legacyAoMode) {
  scene.traverse((object) => {
    if (!object.isMesh || isRobotDescendant(object) || object === contactShadow || object.material?.isShadowMaterial) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    if (!materials.every(material => material && !(material.transparent && material.opacity === 0))) {
      object.castShadow = false;
      object.receiveShadow = false;
      return;
    }
    bakeStaticVertexLighting(object);
    object.material = Array.isArray(object.material)
      ? materials.map(material => bakedStaticMaterial(material))
      : bakedStaticMaterial(object.material);
    object.castShadow = false;
    object.receiveShadow = false;
    object.layers.set(STATIC_SCENE_LAYER);
    staticMeshesBaked += 1;
  });

  scene.traverse((object) => {
    if (!object.isLight || object === key) return;
    object.visible = false;
    object.intensity = 0;
    object.castShadow = false;
  });
} else {
  // Cinematic reference mode keeps real PBR materials and practical lights. Static
  // shadows remain disabled so the robot is still the sole real-time shadow caster.
  scene.traverse((object) => {
    if (object.isMesh && !isRobotDescendant(object) && object !== contactShadow && !object.material?.isShadowMaterial) {
      object.castShadow = false;
      object.receiveShadow = false;
      object.layers.set(STATIC_SCENE_LAYER);
    }
    if (object.isLight && object !== key) {
      object.visible = true;
      object.castShadow = false;
    }
  });
}

for (const object of [...scene.children]) {
  // Child lights are handled by traversal above; semantic fixtures stay attached.
  if (object.isLight && object !== key) object.castShadow = false;
}

key.name = 'RobotShadowKey';
key.layers.set(ROBOT_LIGHT_LAYER);
key.shadow.camera.layers.set(ROBOT_LIGHT_LAYER);
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -2.4;
key.shadow.camera.right = 2.4;
key.shadow.camera.top = 2.4;
key.shadow.camera.bottom = -2.4;
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 18;
key.shadow.bias = -0.0001;
key.shadow.normalBias = 0.018;
camera.layers.enable(ROBOT_LIGHT_LAYER);
cube.traverse((object) => {
  if (!object.isMesh) return;
  object.layers.set(ROBOT_LIGHT_LAYER);
  object.castShadow = true;
  object.receiveShadow = false;
});
contactShadow.material.visible = false;
contactShadow.userData.dynamic = true;

const robotShadowReceiver = new THREE.Mesh(
  new THREE.PlaneGeometry(14, 14),
  new THREE.ShadowMaterial({ color: 0x020305, opacity: 0.62, transparent: true, depthWrite: false })
);
robotShadowReceiver.name = 'RobotDynamicShadowReceiver';
robotShadowReceiver.rotation.x = -Math.PI / 2;
robotShadowReceiver.position.y = 0.018;
robotShadowReceiver.receiveShadow = true;
robotShadowReceiver.castShadow = false;
robotShadowReceiver.layers.set(ROBOT_LIGHT_LAYER);
robotShadowReceiver.userData.dynamic = true;
robotShadowReceiver.raycast = () => {};
scene.add(robotShadowReceiver);

function createRobotProjectedShadowTexture(size = 192) {
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = size;
  const context = shadowCanvas.getContext('2d');
  context.clearRect(0, 0, size, size);
  context.save();
  context.translate(size / 2, size / 2);
  context.scale(0.62, 1);
  const gradient = context.createRadialGradient(0, -size * 0.08, size * 0.03, 0, 0, size * 0.47);
  gradient.addColorStop(0, 'rgba(0,0,0,0.82)');
  gradient.addColorStop(0.35, 'rgba(0,0,0,0.52)');
  gradient.addColorStop(0.72, 'rgba(0,0,0,0.18)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(-size, -size, size * 2, size * 2);
  context.restore();
  const texture = new THREE.CanvasTexture(shadowCanvas);
  texture.name = 'robot-directional-shadow-texture-v1';
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

const robotProjectedShadowTexture = createRobotProjectedShadowTexture();
const robotProjectedShadow = new THREE.Mesh(
  new THREE.PlaneGeometry(1.45, 2.25),
  new THREE.MeshBasicMaterial({
    color: 0x050608,
    map: robotProjectedShadowTexture,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
    toneMapped: false
  })
);
robotProjectedShadow.name = 'RobotProjectedShadowTexture';
robotProjectedShadow.rotation.x = -Math.PI / 2;
robotProjectedShadow.position.set(cubeRig.position.x - 0.38, 0.021, cubeRig.position.z - 0.56);
robotProjectedShadow.renderOrder = 2;
robotProjectedShadow.userData.dynamic = true;
robotProjectedShadow.raycast = () => {};
scene.add(robotProjectedShadow);

let decorativeDynamicLights = 0;
scene.traverse((object) => {
  if (object.isLight && object !== key && object.visible && object.intensity > 0) decorativeDynamicLights += 1;
});

const lightingRuntime = {
  mode: legacyAoMode ? 'ao-baked-static' : 'cinematic-practicals',
  bakedAoTexture: legacyAoMode ? staticAoTexture.name : null,
  staticMeshesBaked,
  staticAoMaterials,
  decorativeDynamicLights,
  dynamicShadowLights: 1,
  staticShadowCasters: 0,
  robotShadowCasters: robotPartNames.length,
  shadowReceiverMaterial: robotShadowReceiver.material.type,
  projectedShadowTexture: robotProjectedShadowTexture.name,
  robotLightLayer: ROBOT_LIGHT_LAYER,
  staticLayer: STATIC_SCENE_LAYER,
  shadowMapEnabled: renderer.shadowMap.enabled,
  palette: ['warm-amber', 'cyan-blue', 'warning-red'],
  animatedEmissiveDisplaysPreserved: true
};

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();
let editorController = null;
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
const STAIR_DESCENT_DURATION = 0.72;
const STAIR_DESCENT_DROP_START = 0.52;
const STAIR_DESCENT_DROP_END = 0.70;
const STAIR_DESCENT_SWING_END = 0.70;
const STAIR_DESCENT_CLEARANCE = 0.32;
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
  descentProfiles: [],
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
  const descending = stairClimbState.direction === 'down';
  const stepDuration = descending ? STAIR_DESCENT_DURATION : STAIR_STEP_DURATION;
  motion.duration = move.step ? stepDuration : stepDuration * 1.1;
  motion.stairMove.trace = descending && move.step ? [] : null;
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
  stairClimbState.descentProfiles = [];
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
  stairClimbState.descentProfiles = [];
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

function cancelGameplayForEditing() {
  motion.phase = 'idle';
  motion.journey = null;
  motion.stairMove = null;
  motion.turnPurpose = 'travel';
  target.set(cubeRig.position.x, 0, cubeRig.position.z);
  marker.visible = false;

  task.active = false;
  task.station = null;
  task.startedAt = 0;
  task.progress = 0;
  workProgress.hidden = true;
  workLabel.textContent = 'TASK';
  workPercent.textContent = '0%';
  workProgressFill.style.width = '0%';

  stairClimbState.active = false;
  stairClimbState.completed = false;
  stairClimbState.descentCompleted = false;
  stairClimbState.moveIndex = -1;
  stairClimbState.stepProgress = 0;
  stairClimbState.moves = [];
  stairClimbState.swingTarget = null;

  robotSitProgress = 0;
  robotSitStartedAt = 0;
  robotStandStartProgress = 0;
  robotStandFrames = 0;
  robotAnimationState = 'idle';
  cubeRig.position.y = 0;
  resetCubePose();
  contactShadow.visible = true;
  networkEventState.workAnimation = false;
}

const configuredEventPort = new URLSearchParams(window.location.search).get('eventPort') || '8000';
const eventApiUrl = `${window.location.protocol}//${window.location.hostname}:${configuredEventPort}/event`;
ledMatrixState.endpoint = eventApiUrl;
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
    const event = JSON.parse(message.data);
    if (!routeActivityStreamEvent(event) && !routeLedMatrixEvent(event)) routeNetworkEvent(event);
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
  if (editorController?.active) {
    editorController.pointerDown(event);
    return;
  }
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
  if (editorController?.active) {
    if (editorController.pointerMove(event)) return;
    updatePointer(event);
    canvas.style.cursor = editorController.transformControls.axis ? 'grabbing' : 'pointer';
    return;
  }
  updatePointer(event);
  canvas.style.cursor = (getHitStation() || getHitDoor() || getHitCouch()) ? 'pointer' : 'crosshair';
}
canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', event => {
  if (editorController?.active) editorController.pointerUp(event);
});
canvas.addEventListener('pointercancel', event => {
  if (editorController?.active) editorController.pointerUp(event);
});

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  composer?.setSize(width, height);
  camera.aspect = width / height;
  const reviewParams = new URLSearchParams(window.location.search);
  const loungeLampCloseup = reviewParams.has('loungeLampReview');
  const electricalPanelCloseup = reviewParams.has('electricalPanelReview');
  const ledMatrixCloseup = reviewParams.has('ledMatrixReview');
  const softwareStationCloseup = reviewParams.has('softwareStationReview');
  const reviewStationCloseup = reviewParams.has('reviewStationReview');
  if (loungeLampCloseup) {
    camera.fov = 40;
    camera.position.set(6.8, 2.2, 1.0);
    camera.lookAt(5.95, 1.3, 6.0);
  } else if (electricalPanelCloseup) {
    camera.fov = 38;
    camera.position.set(3.5, 4.6, 4.7);
    camera.lookAt(-6.55, 3.6, 4.9);
  } else if (ledMatrixCloseup) {
    camera.fov = 36;
    camera.position.set(2.15, 4.72, 0.8);
    camera.lookAt(2.15, 4.72, -6.82);
  } else if (softwareStationCloseup) {
    camera.fov = 33;
    camera.position.set(0.7, 2.8, -1.3);
    camera.lookAt(6.12, 1.32, -1.3);
  } else if (reviewStationCloseup) {
    camera.fov = 33;
    camera.position.set(1.6, 2.8, 0.4);
    camera.lookAt(1.6, 1.32, -6.12);
  } else if (pageParams.get('camTop') === '1') {
    camera.fov = 41;
    camera.position.set(9.8, 9.7, 13.4);
    camera.lookAt(-0.35, 0.72, 0.05);
  } else if (pageParams.get('camLow') === '1') {
    camera.fov = 39;
    camera.position.set(9.8, 7.4, 13.4);
    camera.lookAt(-0.35, 0.75, 0.1);
  } else if (width < 700) {
    camera.fov = 48;
    camera.position.set(9.8, 10.2, 15.5);
    camera.lookAt(0, 0.6, -1.2);
  } else {
    camera.fov = 41;
    camera.position.set(9.8, 8.9, 13.4);
    camera.lookAt(-0.35, 0.78, 0.12);
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
  const descending = stairClimbState.direction === 'down';
  if (descending) {
    const swingPhase = THREE.MathUtils.clamp(stairClimbState.stepProgress / STAIR_DESCENT_SWING_END, 0, 1);
    const swingPulse = Math.sin(swingPhase * Math.PI);
    const armDrive = swingDirection * swingPulse * 0.38;
    leftArm.shoulder.rotation.x = -0.24 - armDrive;
    rightArm.shoulder.rotation.x = -0.24 + armDrive;
    torso.rotation.x = -0.11;
    torso.rotation.z = swingDirection * swingPulse * 0.09;
    head.rotation.z = -torso.rotation.z * 0.45;
  } else {
    leftArm.shoulder.rotation.x = -0.24 - swingDirection * 0.24;
    rightArm.shoulder.rotation.x = -0.24 + swingDirection * 0.24;
    torso.rotation.x = -0.07;
  }
  leftArm.elbow.rotation.x = -0.24;
  rightArm.elbow.rotation.x = -0.24;
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
  const smoothstep = value => value * value * (3 - 2 * value);
  const eased = smoothstep(raw);
  const descending = stairClimbState.direction === 'down';
  stairClimbState.stepProgress = raw;

  let rootProgress = eased;
  let swingProgress = eased;
  let swingArc = Math.sin(raw * Math.PI);
  if (descending) {
    const dropRaw = THREE.MathUtils.clamp(
      (raw - STAIR_DESCENT_DROP_START) / (STAIR_DESCENT_DROP_END - STAIR_DESCENT_DROP_START),
      0,
      1
    );
    const swingRaw = THREE.MathUtils.clamp(raw / STAIR_DESCENT_SWING_END, 0, 1);
    rootProgress = smoothstep(dropRaw);
    swingProgress = smoothstep(swingRaw);
    swingArc = Math.sin(swingRaw * Math.PI);
  }

  cubeRig.position.lerpVectors(move.rootFrom, move.rootTo, rootProgress);
  if (move.trace) move.trace.push({ progress: raw, rootY: cubeRig.position.y });

  stairClimbState.swingTarget = stairContact(
    move.foot,
    THREE.MathUtils.lerp(move.from.x, move.to.x, swingProgress),
    THREE.MathUtils.lerp(move.from.y, move.to.y, swingProgress)
      + swingArc * (descending ? STAIR_DESCENT_CLEARANCE : STAIR_FOOT_CLEARANCE),
    THREE.MathUtils.lerp(move.from.z, move.to.z, swingProgress),
    move.to.step,
    move.to.landing
  );

  if (raw >= 1) {
    cubeRig.position.copy(move.rootTo);
    stairClimbState.contacts[move.foot] = cloneStairContact(move.to);
    if (move.step) {
      const plantEvents = descending ? stairClimbState.descentPlants : stairClimbState.plants;
      plantEvents.push({
        step: move.step,
        foot: move.foot,
        targetY: move.to.y,
        treadTop: stairTreads[move.step - 1].top,
        contactError: null
      });
      if (descending) {
        const trace = move.trace || [];
        const drift = (samples, targetY) => samples.reduce(
          (maximum, sample) => Math.max(maximum, Math.abs(sample.rootY - targetY)),
          0
        );
        stairClimbState.descentProfiles.push({
          step: move.step,
          fromY: move.rootFrom.y,
          toY: move.rootTo.y,
          verticalDrop: move.rootFrom.y - move.rootTo.y,
          startHoldDrift: drift(trace.filter(sample => sample.progress <= 0.5), move.rootFrom.y),
          endHoldDrift: drift(trace.filter(sample => sample.progress >= 0.82), move.rootTo.y),
          dropStartsAt: STAIR_DESCENT_DROP_START,
          dropEndsAt: STAIR_DESCENT_DROP_END,
          samples: trace.length
        });
      }
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

const STATIC_BATCH_CELL_SIZE = 5;
const staticBatchRoot = new THREE.Group();
staticBatchRoot.name = 'AutoStaticBatches';
staticBatchRoot.userData.autoBatchOutput = true;
scene.add(staticBatchRoot);

const staticBatchState = {
  enabled: true,
  cellSize: STATIC_BATCH_CELL_SIZE,
  sourceMeshes: 0,
  mergedSourceMeshes: 0,
  batches: 0,
  cells: 0,
  estimatedDrawCallsSaved: 0,
  semanticObjectsPreserved: true
};
let hiddenStaticBatchSources = [];

function hasAncestor(object, ancestor) {
  for (let current = object; current; current = current.parent) {
    if (current === ancestor) return true;
  }
  return false;
}

function geometryLayoutKey(geometry) {
  const attributes = Object.entries(geometry.attributes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, attribute]) => `${name}:${attribute.itemSize}:${attribute.normalized ? 1 : 0}`)
    .join(',');
  return `${geometry.index ? 'indexed' : 'plain'}|${attributes}`;
}

function autoBatchRejectionReason(mesh) {
  if (!mesh?.isMesh) return 'not-mesh';
  if (!mesh.visible) return 'hidden';
  if (!mesh.geometry) return 'no-geometry';
  if (mesh.isInstancedMesh) return 'instanced-preserved';
  if (Array.isArray(mesh.material)) return 'material-array';
  if (!mesh.material || mesh.material.visible === false) return 'material-hidden';
  if (mesh.material.transparent || mesh.material.opacity < 1) return 'transparent';
  if (mesh.isSkinnedMesh) return 'skinned';
  if (mesh.morphTargetInfluences) return 'morph-targets';
  if (mesh.userData.dynamic || mesh.userData.noAutoBatch) return 'dynamic-opt-out';
  if (mesh.userData.autoBatchOutput) return 'batch-output';
  if (mesh === floor) return 'raycast-floor';
  if (mesh.name?.includes('Collider')) return 'collider';
  if (hasAncestor(mesh, cubeRig)) return 'robot';
  if (hasAncestor(mesh, marker)) return 'marker';
  if (hasAncestor(mesh, staticBatchRoot)) return 'batch-output';
  for (let parent = mesh.parent; parent; parent = parent.parent) {
    if (parent.visible === false) return 'hidden-ancestor';
    if (parent.userData?.dynamic || parent.userData?.noAutoBatch) return 'ancestor-opt-out';
  }
  if (mesh.geometry.drawRange.start !== 0 || mesh.geometry.drawRange.count !== Infinity) return 'partial-draw-range';
  if (mesh.matrixWorld.determinant() <= 0) return 'mirrored-transform';
  return null;
}

function isAutoBatchCandidate(mesh) {
  return autoBatchRejectionReason(mesh) === null;
}

function clearStaticBatches() {
  for (const source of hiddenStaticBatchSources) source.mesh.visible = source.visible;
  hiddenStaticBatchSources = [];
  for (const batch of [...staticBatchRoot.children]) {
    staticBatchRoot.remove(batch);
    batch.geometry.dispose();
  }
}

function rebatchStaticMeshes() {
  clearStaticBatches();
  scene.updateMatrixWorld(true);

  const buckets = new Map();
  const cells = new Set();
  const center = new THREE.Vector3();
  let sourceMeshes = 0;

  scene.traverse((object) => {
    if (!isAutoBatchCandidate(object)) return;
    sourceMeshes += 1;
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    object.geometry.boundingBox.getCenter(center).applyMatrix4(object.matrixWorld);
    const cell = [center.x, center.y, center.z]
      .map(value => Math.floor(value / STATIC_BATCH_CELL_SIZE))
      .join(':');
    cells.add(cell);
    const key = [
      cell,
      object.material.uuid,
      geometryLayoutKey(object.geometry),
      object.castShadow ? 1 : 0,
      object.receiveShadow ? 1 : 0,
      object.renderOrder,
      object.layers.mask
    ].join('|');
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(object);
  });

  let mergedSourceMeshes = 0;
  let batchCount = 0;
  for (const meshes of buckets.values()) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map(mesh => mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));
    const mergedGeometry = mergeGeometries(geometries, false);
    for (const geometry of geometries) geometry.dispose();
    if (!mergedGeometry) continue;

    const first = meshes[0];
    const batch = new THREE.Mesh(mergedGeometry, first.material);
    batch.name = `AutoStaticBatch-${batchCount + 1}`;
    batch.castShadow = first.castShadow;
    batch.receiveShadow = first.receiveShadow;
    batch.renderOrder = first.renderOrder;
    batch.layers.mask = first.layers.mask;
    batch.userData.autoBatchOutput = true;
    batch.userData.sourceMeshes = meshes;
    staticBatchRoot.add(batch);

    for (const mesh of meshes) {
      hiddenStaticBatchSources.push({ mesh, visible: mesh.visible });
      mesh.visible = false;
    }
    mergedSourceMeshes += meshes.length;
    batchCount += 1;
  }

  staticBatchState.sourceMeshes = sourceMeshes;
  staticBatchState.mergedSourceMeshes = mergedSourceMeshes;
  staticBatchState.batches = batchCount;
  staticBatchState.cells = cells.size;
  staticBatchState.estimatedDrawCallsSaved = mergedSourceMeshes - batchCount;
  staticBatchState.semanticObjectsPreserved = hiddenStaticBatchSources.every(({ mesh }) => Boolean(mesh.parent));
  return { ...staticBatchState };
}

rebatchStaticMeshes();

function createSceneEditor() {
  const additionalSemanticNames = [
    'CoffeeTable', 'SoftwareTaskLamp', 'Oscilloscope', 'ElectricalPanel',
    'RustElectricGuitar', 'LoungeGuitarAndAmp', 'GuitarAmpCabinet',
    'CharcoalBeanbag', 'BlueLitBeverageFridge', 'TallRightWallPlant',
    'StockedCyanShelfUnit', 'DeskHeadphonesWithStand', 'RustCodingMug',
    'DensePegboardToolWall', 'CompactOscilloscope', 'HangingTaskLampAndOrangeHoist',
    'CentralWorkbenchRun', 'ReferenceWorkstationSwivelChair', 'CoffeeTableStoryProps'
  ];
  const namedEditableRoots = [
    workbench, desk, testBench, lounge, coffeeTable, loungeFloorLamp,
    taskLamp, oscilloscope, electricalPanel,
    centralRobotBay, referencePartsCart, leftWorkshopReference,
    rightLoungeReference, compositionDensityFill, strictReferenceDetailFill,
    buildDebugSign, todoBoard,
    centralRobotBay.getObjectByName('CentralRobotPlatform'),
    compositionDensityFill.getObjectByName('CentralWorkbenchRun'),
    strictLeftBooster, strictRightBooster, strictLoungeBooster,
    ...additionalSemanticNames.map(name => scene.getObjectByName(name))
  ].filter(Boolean);
  const roots = [...new Set(namedEditableRoots)];
  const rootSet = new Set(roots);
  for (const root of roots) root.userData.editorRoot = true;

  const transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.disconnect();
  renderer.domElement.style.touchAction = 'none';
  transformControls.setSpace('world');
  transformControls.setSize(0.82);
  const transformHelper = transformControls.getHelper();
  transformHelper.name = 'SceneEditorTransformGizmo';
  transformHelper.visible = false;
  const retainNamedHandles = (group, names) => {
    if (!group) return;
    for (const child of [...group.children]) {
      if (!names.includes(child.name)) group.remove(child);
    }
  };
  const transformGizmo = transformControls._gizmo;
  if (!transformGizmo?.gizmo?.translate || !transformGizmo?.picker?.translate
    || !transformGizmo?.gizmo?.rotate || !transformGizmo?.picker?.rotate
    || !transformGizmo?.gizmo?.scale || !transformGizmo?.picker?.scale) {
    throw new Error('Incompatible Three.js TransformControls gizmo structure');
  }
  retainNamedHandles(transformGizmo.gizmo.translate, ['X', 'Y', 'Z']);
  retainNamedHandles(transformGizmo.picker.translate, ['X', 'Y', 'Z']);
  retainNamedHandles(transformGizmo.gizmo.scale, ['XYZ']);
  retainNamedHandles(transformGizmo.picker.scale, ['XYZ']);
  retainNamedHandles(transformGizmo.gizmo.rotate, ['X', 'Y', 'Z']);
  retainNamedHandles(transformGizmo.picker.rotate, ['X', 'Y', 'Z']);
  scene.add(transformHelper);
  const selectionBox = new THREE.BoxHelper(new THREE.Object3D(), 0x67dff2);
  selectionBox.name = 'SceneEditorSelectionOutline';
  selectionBox.material.depthTest = false;
  selectionBox.material.transparent = true;
  selectionBox.material.opacity = 0.9;
  selectionBox.renderOrder = 999;
  selectionBox.visible = false;
  scene.add(selectionBox);

  const state = {
    active: false,
    mode: 'translate',
    selected: null,
    dragging: false,
    nativeDrag: null,
    uniformScaleDrag: null,
    explodedBatches: 0,
    manualBatchRoots: new Map(),
    changed: new Map()
  };

  const objectLabel = object => object?.name || `Object-${object?.id ?? 'unknown'}`;
  const isVisibleInHierarchy = object => {
    for (let current = object; current; current = current.parent) {
      if (!current.visible) return false;
    }
    return true;
  };
  const semanticRootFor = object => {
    for (let current = object; current; current = current.parent) {
      if (rootSet.has(current)) return current;
    }
    return null;
  };
  const explodeAutoBatchesFor = root => {
    let exploded = 0;
    for (const batch of staticBatchRoot.children) {
      const sources = batch.userData.sourceMeshes || [];
      if (!sources.some(mesh => hasAncestor(mesh, root))) continue;
      batch.visible = false;
      for (const mesh of sources) mesh.visible = true;
      exploded += 1;
    }
    state.explodedBatches = exploded;
  };
  const explodeManualBatchesFor = selectedRoot => {
    scene.traverse((object) => {
      if (!object.userData.manualBatchOutput) return;
      const sources = object.userData.sourceMeshes || [];
      if (!sources.some(mesh => hasAncestor(mesh, selectedRoot))) return;
      object.visible = false;
      for (const mesh of sources) mesh.visible = true;
      state.manualBatchRoots.set(object.parent.uuid, {
        root: object.parent,
        prefix: object.userData.batchPrefix
      });
    });
  };
  const rebuildExplodedManualBatches = () => {
    for (const { root, prefix } of state.manualBatchRoots.values()) {
      consolidateReferenceStaticMeshes(root, prefix);
    }
    state.manualBatchRoots.clear();
  };
  const vectorPayload = vector => ({
    x: Number(vector.x.toFixed(5)),
    y: Number(vector.y.toFixed(5)),
    z: Number(vector.z.toFixed(5))
  });
  const transformFor = object => object ? {
    position: vectorPayload(object.position),
    rotation: vectorPayload(object.rotation),
    scale: vectorPayload(object.scale)
  } : null;
  const originalTransforms = new Map(roots.map(object => [object, transformFor(object)]));
  const transformsEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  const rememberTransform = object => {
    if (!object) return;
    const current = transformFor(object);
    if (transformsEqual(current, originalTransforms.get(object))) state.changed.delete(object);
    else state.changed.set(object, current);
  };
  const applyDelta = (mode, axis, amount) => {
    if (!state.active || !state.selected || !Number.isFinite(Number(amount))) return false;
    const delta = Number(amount);
    setMode(mode);
    if (mode === 'translate' && ['X', 'Y', 'Z'].includes(axis)) {
      state.selected.position[axis.toLowerCase()] += delta;
    } else if (mode === 'rotate' && ['X', 'Y', 'Z'].includes(axis)) {
      state.selected.rotation[axis.toLowerCase()] += delta;
    } else if (mode === 'scale' && axis === 'XYZ') {
      state.selected.scale.setScalar(THREE.MathUtils.clamp(state.selected.scale.x + delta, 0.05, 8));
    } else {
      return false;
    }
    state.selected.updateMatrixWorld(true);
    selectionBox.setFromObject(state.selected);
    rememberTransform(state.selected);
    refreshUi();
    return true;
  };
  const serialize = () => ({
    schema: 'raycast-room-layout/v1',
    coordinateSpace: 'local-to-parent',
    angleUnits: 'radians-and-degrees',
    objects: [...state.changed.entries()].map(([object, transform]) => {
      const name = objectLabel(object);
      return {
        name,
        parent: object?.parent?.name || null,
        position: transform.position,
        rotationRadians: transform.rotation,
        rotationDegrees: {
          x: Number(THREE.MathUtils.radToDeg(transform.rotation.x).toFixed(3)),
          y: Number(THREE.MathUtils.radToDeg(transform.rotation.y).toFixed(3)),
          z: Number(THREE.MathUtils.radToDeg(transform.rotation.z).toFixed(3))
        },
        scale: transform.scale
      };
    })
  });
  const refreshUi = () => {
    editModeToggle.setAttribute('aria-pressed', String(state.active));
    editModeToggle.textContent = state.active ? 'EXIT EDIT' : 'EDIT MODE';
    editorModeButtons.hidden = !state.active;
    editorSelection.hidden = !state.active;
    editorSelection.textContent = state.selected
      ? `${objectLabel(state.selected)} · ${state.mode.toUpperCase()}`
      : 'SELECT AN OBJECT';
    for (const button of editorModeButtons.querySelectorAll('[data-editor-mode]')) {
      button.classList.toggle('is-active', button.dataset.editorMode === state.mode);
    }
    document.body.classList.toggle('editor-active', state.active);
  };
  const applyScaleHandleVisibility = () => {
    if (state.mode !== 'scale') return;
    transformHelper.traverse((child) => {
      if (['X', 'Y', 'Z', 'XY', 'YZ', 'XZ'].includes(child.name)) child.visible = false;
    });
  };
  const setMode = mode => {
    if (!['translate', 'rotate', 'scale'].includes(mode)) return;
    if (state.dragging && mode !== state.mode) finishActiveDrag(null, true);
    state.mode = mode;
    transformControls.setMode(mode);
    transformControls.axis = null;
    if (state.selected) transformHelper.visible = true;
    applyScaleHandleVisibility();
    refreshUi();
  };
  const select = object => {
    if (state.selected !== object) {
      transformControls.detach();
      rebuildExplodedManualBatches();
      rebatchStaticMeshes();
      state.explodedBatches = 0;
    }
    state.selected = object;
    if (object) {
      explodeAutoBatchesFor(object);
      explodeManualBatchesFor(object);
      transformControls.attach(object);
      selectionBox.setFromObject(object);
      selectionBox.visible = true;
      transformHelper.visible = true;
      setMode(state.mode);
      setStatus(`EDIT ${objectLabel(object).toUpperCase()}`);
    } else {
      transformControls.detach();
      transformHelper.visible = false;
      selectionBox.visible = false;
      setStatus('EDIT MODE');
    }
    refreshUi();
  };
  const enter = () => {
    if (state.active) return;
    staticBatchState.enabled = true;
    state.active = true;
    cancelGameplayForEditing();
    setStatus('EDIT MODE');
    refreshUi();
  };
  const exit = () => {
    if (!state.active) return;
    finishActiveDrag(null, true);
    select(null);
    state.active = false;
    staticBatchState.enabled = true;
    setStatus('READY');
    canvas.style.cursor = 'crosshair';
    layoutExport.hidden = true;
    refreshUi();
  };
  const controlPointerFor = event => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
      button: event.button
    };
  };
  const capturePointer = pointerId => {
    try { canvas.setPointerCapture?.(pointerId); } catch { /* synthetic pointer events are not capturable */ }
  };
  const releasePointer = pointerId => {
    try {
      if (canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture(pointerId);
    } catch { /* pointer may already be released */ }
  };
  const finishActiveDrag = (event = null, cancel = false) => {
    if (state.uniformScaleDrag) {
      const { pointerId, startScale, object } = state.uniformScaleDrag;
      if (cancel && object) {
        object.scale.setScalar(startScale);
        object.updateMatrixWorld(true);
        selectionBox.setFromObject(object);
        rememberTransform(object);
      }
      releasePointer(pointerId);
      state.uniformScaleDrag = null;
      state.dragging = false;
      canvas.style.cursor = 'pointer';
      return true;
    }
    if (state.nativeDrag || transformControls.dragging) {
      const pointerId = state.nativeDrag?.pointerId;
      if (cancel) transformControls.reset();
      transformControls.pointerUp(null);
      releasePointer(pointerId);
      state.nativeDrag = null;
      state.dragging = false;
      canvas.style.cursor = 'pointer';
      return true;
    }
    return false;
  };
  const pointerDown = event => {
    const controlPointer = controlPointerFor(event);
    transformControls.pointerHover(controlPointer);
    if (state.mode === 'scale' && state.selected && transformControls.axis === 'XYZ') {
      event.preventDefault();
      event.stopImmediatePropagation();
      state.uniformScaleDrag = {
        startY: event.clientY,
        startScale: state.selected.scale.x,
        pointerId: event.pointerId,
        object: state.selected
      };
      capturePointer(event.pointerId);
      state.dragging = true;
      canvas.style.cursor = 'ns-resize';
      return;
    }
    if (transformControls.axis && state.selected) {
      event.preventDefault();
      event.stopImmediatePropagation();
      transformControls.pointerDown(controlPointer);
      if (transformControls.dragging) {
        state.nativeDrag = { pointerId: event.pointerId, object: state.selected };
        capturePointer(event.pointerId);
      }
      return;
    }
    if (state.dragging) return;
    updatePointer(event);
    const hits = raycaster.intersectObjects(roots, true);
    const hit = hits.find(candidate => semanticRootFor(candidate.object));
    select(hit ? semanticRootFor(hit.object) : null);
  };
  const pointerMove = event => {
    if (state.uniformScaleDrag && state.selected) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const factor = Math.exp((state.uniformScaleDrag.startY - event.clientY) * 0.012);
      const scale = THREE.MathUtils.clamp(state.uniformScaleDrag.startScale * factor, 0.05, 8);
      state.selected.scale.setScalar(scale);
      state.selected.updateMatrixWorld(true);
      selectionBox.setFromObject(state.selected);
      rememberTransform(state.selected);
      refreshUi();
      return true;
    }
    const controlPointer = controlPointerFor(event);
    if (transformControls.dragging) {
      event.preventDefault();
      event.stopImmediatePropagation();
      transformControls.pointerMove(controlPointer);
      return true;
    }
    transformControls.pointerHover(controlPointer);
    return false;
  };
  const pointerUp = event => {
    const handled = finishActiveDrag(event, event.type === 'pointercancel');
    if (handled) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    return handled;
  };
  const gizmoHandleNames = mode => [...new Set(
    (transformGizmo.gizmo[mode]?.children || []).map(child => child.name).filter(Boolean)
  )];
  const objectScreen = name => {
    const object = roots.find(candidate => candidate.name === name);
    if (!object) return null;
    object.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(object);
    const point = box.isEmpty() ? object.getWorldPosition(new THREE.Vector3()) : box.getCenter(new THREE.Vector3());
    point.project(camera);
    return {
      x: (point.x * 0.5 + 0.5) * window.innerWidth,
      y: (-point.y * 0.5 + 0.5) * window.innerHeight
    };
  };

  transformControls.addEventListener('dragging-changed', event => { state.dragging = event.value; });
  transformControls.addEventListener('objectChange', () => {
    if (state.mode === 'scale' && state.selected) {
      const uniform = THREE.MathUtils.clamp((state.selected.scale.x + state.selected.scale.y + state.selected.scale.z) / 3, 0.05, 8);
      state.selected.scale.setScalar(uniform);
    }
    rememberTransform(state.selected);
    if (state.selected) selectionBox.setFromObject(state.selected);
    applyScaleHandleVisibility();
    refreshUi();
  });
  editModeToggle.addEventListener('click', () => state.active ? exit() : enter());
  editorModeButtons.addEventListener('click', event => {
    const button = event.target.closest('[data-editor-mode]');
    if (button) setMode(button.dataset.editorMode);
  });
  saveLayoutButton.addEventListener('click', () => {
    layoutJson.value = JSON.stringify(serialize(), null, 2);
    layoutExport.hidden = false;
  });
  closeLayoutExportButton.addEventListener('click', () => { layoutExport.hidden = true; });
  copyLayoutJsonButton.addEventListener('click', async () => {
    if (!layoutJson.value) layoutJson.value = JSON.stringify(serialize(), null, 2);
    let resetDelay = 1200;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(layoutJson.value);
      copyLayoutJsonButton.textContent = 'COPIED';
    } catch {
      copyLayoutJsonButton.textContent = 'COPY FAILED';
      setStatus('COPY FAILED');
      resetDelay = 4000;
    }
    window.setTimeout(() => { copyLayoutJsonButton.textContent = 'COPY JSON'; }, resetDelay);
  });
  window.addEventListener('keydown', event => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key === 'Escape' && state.active) {
      event.preventDefault();
      exit();
      return;
    }
    if (!state.active || !state.selected) return;
    const mode = { m: 'translate', r: 'rotate', s: 'scale' }[event.key.toLowerCase()];
    if (mode) {
      event.preventDefault();
      setMode(mode);
    }
  });

  refreshUi();
  return {
    get active() { return state.active; },
    transformControls,
    pointerDown,
    pointerMove,
    pointerUp,
    enter,
    exit,
    select,
    setMode,
    objectScreen,
    originScreen: () => {
      if (!state.selected) return null;
      const point = state.selected.getWorldPosition(new THREE.Vector3()).project(camera);
      return {
        x: (point.x * 0.5 + 0.5) * window.innerWidth,
        y: (-point.y * 0.5 + 0.5) * window.innerHeight
      };
    },
    axisGuideScreen: axis => {
      if (!state.selected || !['X', 'Y', 'Z'].includes(axis)) return null;
      const origin = state.selected.getWorldPosition(new THREE.Vector3());
      const endpoint = origin.clone();
      endpoint[axis.toLowerCase()] += 1.8;
      const project = point => {
        point.project(camera);
        return {
          x: (point.x * 0.5 + 0.5) * window.innerWidth,
          y: (-point.y * 0.5 + 0.5) * window.innerHeight
        };
      };
      return { origin: project(origin), endpoint: project(endpoint) };
    },
    transformFor: name => transformFor(roots.find(candidate => candidate.name === name)),
    applyDelta,
    serialize,
    snapshot: () => ({
      active: state.active,
      selected: state.selected ? objectLabel(state.selected) : null,
      mode: state.mode,
      handles: state.mode === 'translate' && state.selected ? gizmoHandleNames('translate') : [],
      rotationArcs: state.mode === 'rotate' && state.selected ? gizmoHandleNames('rotate') : [],
      uniformScaleOnly: state.mode === 'scale' && gizmoHandleNames('scale').join(',') === 'XYZ',
      dragging: state.dragging,
      hoveredAxis: transformControls.axis,
      explodedBatches: state.explodedBatches,
      batchingStrategy: 'selective-source-explode',
      editableObjects: roots.map(objectLabel),
      changedObjects: [...state.changed.keys()].map(objectLabel)
    })
  };
}

editorController = createSceneEditor();

function countVisibleGeometryVertices() {
  let vertices = 0;
  scene.traverseVisible((object) => {
    if (!(object.isMesh || object.isLine || object.isPoints)) return;
    const position = object.geometry?.getAttribute?.('position');
    if (!position) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const contributes = materials.some((material) => material && material.visible !== false && !(material.transparent && material.opacity === 0));
    if (contributes) vertices += position.count * (object.isInstancedMesh ? object.count : 1);
  });
  return vertices;
}

const performanceMetrics = {
  vertices: countVisibleGeometryVertices(),
  fps: 0,
  drawCalls: 0,
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
  performanceMetrics.drawCalls = renderer.info.render.calls;
  performanceMetrics.frames = 0;
  performanceMetrics.lastSample = now;
  vertexCountText.textContent = performanceMetrics.vertices.toLocaleString('en-US');
  fpsCountText.textContent = `${performanceMetrics.fps} FPS`;
  drawCallCountText.textContent = `${performanceMetrics.drawCalls.toLocaleString('en-US')} CALLS`;
}

function inspectAutoBatchRejections() {
  const rows = [];
  const rootName = (object) => {
    let current = object;
    while (current?.parent && current.parent !== room && current.parent !== scene) current = current.parent;
    return current?.name || object?.name || object?.type || 'Unnamed';
  };
  scene.traverseVisible((object) => {
    if (!object.isMesh || object.userData.autoBatchOutput) return;
    const reason = autoBatchRejectionReason(object);
    const materialSlots = Array.isArray(object.material) ? object.material.length : 1;
    const geometryGroups = object.geometry?.groups?.length || 0;
    rows.push({
      root: rootName(object),
      object: object.name || object.type,
      reason: reason || 'eligible-singleton',
      materialSlots,
      geometryGroups,
      estimatedCalls: Array.isArray(object.material) ? geometryGroups : 1
    });
  });
  return rows.sort((a, b) => b.estimatedCalls - a.estimatedCalls);
}

function animate(timestamp) {
  clock.getDelta();
  const now = clock.elapsedTime;
  updateMotion(now);
  updateRobotAnimation(now);
  updateOscilloscopeDisplay(now);
  updateReviewMonitor(now);
  updateRainyCityWindow(now);
  updateActivityStreamDuration();
  if (motion.phase === 'idle' && robotAnimationState !== 'sit') cube.position.y = Math.sin(now * 1.55) * 0.006;
  if (robotAnimationState === 'sit') cube.position.y = 0;
  const shadowHeight = Math.max(0, cubeRig.position.y);
  robotProjectedShadow.visible = contactShadow.visible && shadowHeight < 2.2;
  robotProjectedShadow.position.set(cubeRig.position.x - 0.38, 0.021, cubeRig.position.z - 0.56);
  robotProjectedShadow.material.opacity = 0.48 / (1 + shadowHeight * 0.75);
  robotProjectedShadow.scale.setScalar(1 + shadowHeight * 0.16);
  key.position.set(cubeRig.position.x + 3.5, cubeRig.position.y + 9, cubeRig.position.z + 5);
  key.target.position.set(cubeRig.position.x, cubeRig.position.y, cubeRig.position.z - 1);
  key.target.updateMatrixWorld();
  markerRing.material.opacity = marker.visible ? 0.55 + Math.sin(now * 4) * 0.22 : 0;
  redRim.intensity = 13.5 + Math.sin(now * 0.8) * 1.5;
  if (composer) composer.render();
  else renderer.render(scene, camera);
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
  doorCollider.localToWorld(point).project(camera);
  return {
    x: (point.x * 0.5 + 0.5) * window.innerWidth,
    y: (-point.y * 0.5 + 0.5) * window.innerHeight
  };
}

function objectScreenBounds(object) {
  if (!object) return null;
  scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  const projected = [];
  for (const x of [bounds.min.x, bounds.max.x]) {
    for (const y of [bounds.min.y, bounds.max.y]) {
      for (const z of [bounds.min.z, bounds.max.z]) {
        const point = new THREE.Vector3(x, y, z).project(camera);
        projected.push({
          x: (point.x * 0.5 + 0.5) * window.innerWidth,
          y: (-point.y * 0.5 + 0.5) * window.innerHeight
        });
      }
    }
  }
  const xs = projected.map((point) => point.x);
  const ys = projected.map((point) => point.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys)
  };
}

const stationById = id => stations.find(station => station.id === id);

window.__ROOM__ = {
  ready: true,
  rebatchStaticMeshes,
  inspectAutoBatchRejections,
  editorObjectScreen: name => editorController.objectScreen(name),
  editorGizmoOriginScreen: () => editorController.originScreen(),
  editorAxisGuideScreen: axis => editorController.axisGuideScreen(axis),
  editorTransform: name => editorController.transformFor(name),
  applyEditorDelta: (mode, axis, amount) => editorController.applyDelta(mode, axis, amount),
  serializeEditorLayout: () => editorController.serialize(),
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
  referencePropScreens: () => ({
    guitar: objectScreenBounds(referenceGuitar),
    amp: objectScreenBounds(loungeMusic?.getObjectByName('GuitarAmpCabinet')),
    partsCart: objectScreenBounds(referencePartsCart),
    buildSign: objectScreenBounds(buildDebugSign)
  }),
  projectWorld: (x, y, z) => {
    const point = new THREE.Vector3(x, y, z).project(camera);
    return {
      x: (point.x * 0.5 + 0.5) * window.innerWidth,
      y: (-point.y * 0.5 + 0.5) * window.innerHeight
    };
  },
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
      descentProfiles: stairClimbState.descentProfiles.map(profile => ({ ...profile })),
      statesPlayed: [...stairClimbState.statesPlayed],
      maxContactError: stairClimbState.maxContactError,
      footClearance: STAIR_FOOT_CLEARANCE,
      descentFootClearance: STAIR_DESCENT_CLEARANCE,
      stepDuration: STAIR_STEP_DURATION,
      descentStepDuration: STAIR_DESCENT_DURATION
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
    referenceMatch: referenceMatchRuntime,
    performance: {
      vertices: performanceMetrics.vertices,
      fps: performanceMetrics.fps,
      drawCalls: performanceMetrics.drawCalls
    },
    batching: { ...staticBatchState },
    editor: editorController.snapshot(),
    lighting: {
      ...lightingRuntime,
      shadowProjection: {
        x: cubeRig.position.x,
        z: cubeRig.position.z
      }
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
      },
      ledMatrix: {
        type: ledMatrixState.type,
        canvasElement: ledMatrixState.canvasElement,
        mode: ledMatrixState.mode,
        width: ledMatrixState.width,
        height: ledMatrixState.height,
        columns: ledMatrixState.columns,
        rows: ledMatrixState.rows,
        physicalWidth: ledMatrixState.physicalWidth,
        physicalHeight: ledMatrixState.physicalHeight,
        wall: ledMatrixState.wall,
        sseCapable: ledMatrixState.sseCapable,
        endpoint: ledMatrixState.endpoint,
        source: ledMatrixState.source,
        title: ledMatrixState.title,
        lines: ledMatrixActivityState.active
          ? [...ledMatrixState.lines.slice(0, 3), `duration: ${Math.max(0, Math.floor((Date.now() - ledMatrixActivityState.timestampMs) / 1000))}s`]
          : [...ledMatrixState.lines],
        status: ledMatrixState.status,
        accent: ledMatrixState.accent,
        messages: ledMatrixState.messages,
        updates: ledMatrixState.updates,
        lastEventId: ledMatrixState.lastEventId,
        lastReceivedAt: ledMatrixState.lastReceivedAt,
        activityStream: {
          ...ledMatrixActivityState,
          durationSeconds: ledMatrixActivityState.active
            ? Math.max(0, Math.floor((Date.now() - ledMatrixActivityState.timestampMs) / 1000))
            : ledMatrixActivityState.durationSeconds,
          metadata: ledMatrixActivityState.metadata ? { ...ledMatrixActivityState.metadata } : null
        }
      },
      cityWindow: {
        type: cityWindowState.type,
        canvasElement: cityWindowState.canvasElement,
        animated: cityWindowState.animated,
        mode: cityWindowState.mode,
        width: cityWindowState.width,
        height: cityWindowState.height,
        skylineLayers: cityWindowState.skylineLayers,
        rainStreaks: cityWindowState.rainStreaks,
        updates: cityWindowState.updates,
        phase: cityWindowState.phase,
        textureName: cityWindowTexture.name
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
      electricalPanel: {
        ...electricalPanelRuntime,
        hasCabinet: Boolean(electricalPanel.getObjectByName('VoltagePanelCabinet')),
        hasVoltageSymbol: Boolean(electricalPanel.getObjectByName('VoltageSymbol')),
        hasCeilingTermination: Boolean(electricalPanel.getObjectByName('ConduitCeilingBox')),
        conduitCouplings: electricalPanel.children.filter(child => child.name.startsWith('ConduitCoupling')).length
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
      reviewStation: {
        ...softwareStationRuntime,
        colliderPreserved: testBenchCollider.parent === testBench,
        approachPoint: { x: TEST_BENCH_SPOT.x, z: TEST_BENCH_SPOT.z },
        semanticGroups: reviewStationVisual.children.map(group => group.name),
        meshCount: (() => {
          let count = 0;
          reviewStationVisual.traverse(child => { if (child.isMesh) count += 1; });
          return count;
        })()
      },
      softwareStation: {
        ...softwareStationV2Runtime,
        colliderPreserved: deskCollider.parent === desk,
        approachPoint: { x: DESK_SPOT.x, z: DESK_SPOT.z },
        semanticGroups: softwareStationV2Visual.children.map(group => group.name),
        meshCount: (() => {
          let count = 0;
          softwareStationV2Visual.traverse(child => { if (child.isMesh) count += 1; });
          return count;
        })()
      },
      ledMatrix: {
        ...ledMatrixRuntime,
        canvasElementId: ledMatrixCanvas.id,
        textureName: ledMatrixTexture.name,
        grid: { columns: LED_MATRIX_COLUMNS, rows: LED_MATRIX_ROWS },
        screenPresent: ledMatrixScreen.parent === ledMatrixAssembly,
        frameParts: ledMatrixAssembly.children.filter(child => child.isMesh).length
      },
      cityWindow: {
        ...cityWindowRuntime,
        canvasElementId: cityWindowCanvas.id,
        textureName: cityWindowTexture.name,
        frameParts: cityWindowAssembly.children.filter(child => child.isMesh).length,
        hasSill: Boolean(cityWindowAssembly.getObjectByName('CityWindowSill')),
        hasCoolInteriorGlow: cityWindowGlow.parent === cityWindowAssembly
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
        clearOfDesk: lounge.position.z - 3.825 > desk.position.z + 1.9,
        coffeeTable: { ...coffeeTableRuntime },
        couchApproachPoint: { x: COUCH_SPOT.x, z: COUCH_SPOT.z },
        walkPathToCouchClear: coffeeTableRuntime.onRug && coffeeTableApproachSideClearance > 0.55,
        floorLamp: { ...loungeFloorLampRuntime }
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
