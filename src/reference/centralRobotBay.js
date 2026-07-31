import * as THREE from 'three';

const TAU = Math.PI * 2;
const BASE_RADIUS = 1.65;

/**
 * Procedural central service bay for the existing RedBipedRobot.
 *
 * Local origin: center of the robot pad at floor level.
 * Default platform top: root.userData.referenceRuntime.robotSurfaceY.
 *
 * @param {object} options
 * @param {number} [options.platformRadius=1.65] Outer platform radius in world units.
 * @param {number} [options.platformHeight=0.16] Height of the platform deck.
 * @param {boolean} [options.includeLights=true] Add four inexpensive practical PointLights.
 * @param {number} [options.lightIntensity=2.1] Intensity multiplier for practical lights.
 * @param {1|-1} [options.cartSide=1] Mirror the cart/cable dressing across local X.
 * @param {boolean} [options.castShadow=true]
 * @param {boolean} [options.receiveShadow=true]
 * @returns {THREE.Group}
 */
export function createCentralRobotBay(options = {}) {
  const radius = Math.max(1.1, options.platformRadius ?? BASE_RADIUS);
  const height = Math.max(0.08, options.platformHeight ?? 0.16);
  const scale = radius / BASE_RADIUS;
  const includeLights = options.includeLights !== false;
  const lightIntensity = Math.max(0, options.lightIntensity ?? 2.1);
  const cartSide = options.cartSide === -1 ? -1 : 1;
  const castShadow = options.castShadow !== false;
  const receiveShadow = options.receiveShadow !== false;

  const root = new THREE.Group();
  root.name = 'CentralRobotBay';

  const platform = namedGroup('CentralRobotPlatform', root);
  const structure = namedGroup('PlatformStructure', platform);
  const deck = namedGroup('SegmentedSteelDeck', platform);
  const hazardRim = namedGroup('AlternatingHazardRim', platform);
  const energySystem = namedGroup('CyanInsetEnergySystem', platform);
  const fasteners = namedGroup('PlatformFasteners', platform);
  const socketGroup = namedGroup('CableSockets', platform);
  const practicals = namedGroup('WarmRimPracticals', platform);
  const pillar = namedGroup('CyanLightningBatteryPillar', root);
  const cart = namedGroup('RedRobotPartsCart', root);
  const cables = namedGroup('CurvedServiceCables', root);
  const runtimeAnchors = namedGroup('CentralBayRuntimeAnchors', root);

  const materials = {
    darkSteel: new THREE.MeshStandardMaterial({
      name: 'BayDarkSteel', color: 0x20262b, roughness: 0.58, metalness: 0.72, flatShading: true
    }),
    steel: new THREE.MeshStandardMaterial({
      name: 'BaySteel', color: 0x596269, roughness: 0.46, metalness: 0.78, flatShading: true
    }),
    steelHighlight: new THREE.MeshStandardMaterial({
      name: 'BaySteelHighlight', color: 0x7d8588, roughness: 0.38, metalness: 0.84, flatShading: true
    }),
    recess: new THREE.MeshStandardMaterial({
      name: 'BayRecess', color: 0x090d10, roughness: 0.82, metalness: 0.35
    }),
    blackHazard: new THREE.MeshStandardMaterial({
      name: 'BayHazardBlack', color: 0x17191a, roughness: 0.68, metalness: 0.46, flatShading: true
    }),
    yellowHazard: new THREE.MeshStandardMaterial({
      name: 'BayHazardYellow', color: 0xf0bd2f, roughness: 0.54, metalness: 0.22, flatShading: true
    }),
    cyan: new THREE.MeshStandardMaterial({
      name: 'BayCyanEnergy', color: 0x48cde0, emissive: 0x138da4, emissiveIntensity: 0.55,
      roughness: 0.22, metalness: 0.18, toneMapped: true
    }),
    cyanDim: new THREE.MeshStandardMaterial({
      name: 'BayCyanEnergyDim', color: 0x207c8e, emissive: 0x0a6f84, emissiveIntensity: 1.2,
      roughness: 0.3, metalness: 0.28
    }),
    warmBulb: new THREE.MeshStandardMaterial({
      name: 'BayWarmBulb', color: 0xffe1aa, emissive: 0xffa43a, emissiveIntensity: 3.2,
      roughness: 0.2, metalness: 0, toneMapped: false
    }),
    red: new THREE.MeshStandardMaterial({
      name: 'BayToolCartRed', color: 0xb83429, roughness: 0.48, metalness: 0.22, flatShading: true
    }),
    redDark: new THREE.MeshStandardMaterial({
      name: 'BayToolCartRedDark', color: 0x6e211d, roughness: 0.6, metalness: 0.3, flatShading: true
    }),
    rubber: new THREE.MeshStandardMaterial({
      name: 'BayCableRubber', color: 0x111417, roughness: 0.88, metalness: 0.08
    }),
    copper: new THREE.MeshStandardMaterial({
      name: 'BayCableCopper', color: 0xb96c35, roughness: 0.42, metalness: 0.76
    })
  };

  const shadow = (mesh) => {
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    return mesh;
  };

  // --- Layered circular platform -------------------------------------------------
  addCylinder('PlatformUndercarriage', radius * 1.025, height * 0.72, materials.recess,
    [0, height * 0.36, 0], structure, 48);
  addCylinder('PlatformSteelDrum', radius, height, materials.darkSteel,
    [0, height * 0.5, 0], structure, 48);
  addCylinder('CenterDockHub', radius * 0.23, height * 1.13, materials.steelHighlight,
    [0, height * 0.565, 0], structure, 32);
  addCylinder('CenterDockRecess', radius * 0.17, height * 1.17, materials.recess,
    [0, height * 0.59, 0], structure, 32);

  // Ten separate deck leaves, instanced from one annular wedge geometry.
  const plateCount = 10;
  const plateGeometry = makeAnnularSegmentGeometry(radius * 0.24, radius * 0.72, TAU / plateCount * 0.91, 3);
  const plateTransforms = Array.from({ length: plateCount }, (_, index) => ({
    position: [0, height + 0.006, 0], rotation: [0, index * TAU / plateCount, 0]
  }));
  const plateInstances = addInstances('CenterMetalPlateSegments', plateGeometry, materials.steel,
    plateTransforms, deck);
  plateInstances.userData.semantic = 'robot-support-plates';

  const annularDeck = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.75, radius * 0.87, 48), materials.darkSteel
  );
  annularDeck.name = 'OuterServiceDeck';
  annularDeck.rotation.x = -Math.PI / 2;
  annularDeck.position.y = height + 0.004;
  shadow(annularDeck);
  deck.add(annularDeck);

  // Alternating yellow/black segmented keep-clear rim, built as two instanced batches.
  const hazardCount = 24;
  const hazardRadius = radius * 0.935;
  const hazardRadial = radius * 0.285;
  const hazardTangent = TAU * hazardRadius / hazardCount * 0.96;
  const hazardGeometry = new THREE.BoxGeometry(
    hazardRadial,
    Math.max(height * 0.34, 0.26 * scale),
    hazardTangent
  );
  const yellowTransforms = [];
  const blackTransforms = [];
  for (let index = 0; index < hazardCount; index += 1) {
    const angle = index * TAU / hazardCount;
    const transform = {
      position: [Math.cos(angle) * hazardRadius, Math.max(height * 0.75, 0.13 * scale), Math.sin(angle) * hazardRadius],
      rotation: [0, -angle, 0]
    };
    (index % 2 === 0 ? yellowTransforms : blackTransforms).push(transform);
  }
  addInstances('YellowHazardSegments', hazardGeometry, materials.yellowHazard, yellowTransforms, hazardRim);
  addInstances('BlackHazardSegments', hazardGeometry, materials.blackHazard, blackTransforms, hazardRim);

  // Cyan ring lives inside the plate/rim seam and is readable without a real light.
  const energyRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.735, radius * 0.01, 8, 64), materials.cyan
  );
  energyRing.name = 'CyanInsetEnergyRing';
  energyRing.rotation.x = Math.PI / 2;
  energyRing.position.y = height + radius * 0.015;
  energyRing.castShadow = false;
  energyRing.receiveShadow = false;
  energySystem.add(energyRing);

  const innerEnergyRing = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.235, radius * 0.011, 7, 40), materials.cyanDim
  );
  innerEnergyRing.name = 'CyanCenterChargeRing';
  innerEnergyRing.rotation.x = Math.PI / 2;
  innerEnergyRing.position.y = height + radius * 0.018;
  innerEnergyRing.castShadow = false;
  energySystem.add(innerEnergyRing);

  // Instanced warm marker bulbs around the outer lip.
  const bulbCount = 16;
  const bulbGeometry = new THREE.SphereGeometry(radius * 0.026, 8, 6);
  const bulbTransforms = Array.from({ length: bulbCount }, (_, index) => {
    const angle = (index + 0.5) * TAU / bulbCount;
    return { position: [Math.cos(angle) * radius * 1.005, height * 0.74, Math.sin(angle) * radius * 1.005] };
  });
  const bulbInstances = addInstances('WarmRimBulbs', bulbGeometry, materials.warmBulb, bulbTransforms, practicals);
  bulbInstances.castShadow = false;

  const lightAnchorRecords = [];
  if (includeLights) {
    for (let index = 0; index < 4; index += 1) {
      const angle = Math.PI / 4 + index * Math.PI / 2;
      const light = new THREE.PointLight(0xffb35c, lightIntensity, radius * 2.15, 2);
      light.name = `WarmRimLight${index + 1}`;
      light.position.set(Math.cos(angle) * radius * 0.88, height + radius * 0.08, Math.sin(angle) * radius * 0.88);
      light.castShadow = false;
      practicals.add(light);
      lightAnchorRecords.push(anchorRecord(light, 'warm-practical', 0xffb35c));
    }
  }

  // Bolts and four recessed cable sockets are also instanced.
  const boltCount = 20;
  const boltGeometry = new THREE.CylinderGeometry(radius * 0.018, radius * 0.018, radius * 0.018, 8);
  const boltTransforms = Array.from({ length: boltCount }, (_, index) => {
    const angle = index * TAU / boltCount;
    return { position: [Math.cos(angle) * radius * 0.66, height + radius * 0.018, Math.sin(angle) * radius * 0.66] };
  });
  addInstances('DeckBolts', boltGeometry, materials.steelHighlight, boltTransforms, fasteners);

  const socketAngles = [-0.22, 1.12, 2.66, 4.18];
  const socketRadius = radius * 0.79;
  const socketBodyGeometry = new THREE.CylinderGeometry(radius * 0.07, radius * 0.082, height * 0.28, 12);
  const socketInsetGeometry = new THREE.CylinderGeometry(radius * 0.043, radius * 0.043, height * 0.3, 10);
  const socketTransforms = socketAngles.map((angle) => ({
    position: [Math.cos(angle) * socketRadius, height + height * 0.1, Math.sin(angle) * socketRadius]
  }));
  addInstances('CableSocketHousings', socketBodyGeometry, materials.recess, socketTransforms, socketGroup);
  const socketInsets = addInstances('CyanCableSocketInsets', socketInsetGeometry, materials.cyanDim,
    socketTransforms.map((item) => ({ position: [item.position[0], item.position[1] + height * 0.04, item.position[2]] })), socketGroup);
  socketInsets.castShadow = false;

  // --- Battery / inverter pillar ------------------------------------------------
  const pillarX = -cartSide * radius * 1.24;
  const pillarZ = -radius * 0.58;
  pillar.position.set(pillarX, 0, pillarZ);
  pillar.rotation.y = cartSide * 0.12;
  const pillarWidth = 0.5 * scale;
  const pillarDepth = 0.38 * scale;
  const pillarHeight = 0.88 * scale;

  addBox('BatteryPillarFoot', [pillarWidth * 1.18, 0.08 * scale, pillarDepth * 1.2], materials.recess,
    [0, 0.04 * scale, 0], pillar);
  addBox('BatteryPillarBody', [pillarWidth, pillarHeight, pillarDepth], materials.darkSteel,
    [0, 0.1 * scale + pillarHeight / 2, 0], pillar);
  addBox('BatteryPillarTopCap', [pillarWidth * 1.08, 0.09 * scale, pillarDepth * 1.08], materials.steel,
    [0, 0.1 * scale + pillarHeight + 0.02 * scale, 0], pillar);
  addBox('BatteryPillarCyanSpine', [0.055 * scale, pillarHeight * 0.72, 0.025 * scale], materials.cyanDim,
    [-pillarWidth * 0.34, 0.1 * scale + pillarHeight * 0.5, pillarDepth * 0.51], pillar).castShadow = false;

  const lightningShape = new THREE.Shape();
  lightningShape.moveTo(-0.055 * scale, 0.16 * scale);
  lightningShape.lineTo(0.035 * scale, 0.16 * scale);
  lightningShape.lineTo(-0.005 * scale, 0.025 * scale);
  lightningShape.lineTo(0.085 * scale, 0.025 * scale);
  lightningShape.lineTo(-0.07 * scale, -0.18 * scale);
  lightningShape.lineTo(-0.025 * scale, -0.045 * scale);
  lightningShape.lineTo(-0.105 * scale, -0.045 * scale);
  lightningShape.closePath();
  const lightning = new THREE.Mesh(new THREE.ShapeGeometry(lightningShape), materials.cyan);
  lightning.name = 'CyanLightningBatteryGlyph';
  lightning.position.set(0.04 * scale, 0.59 * scale, pillarDepth * 0.51 + 0.006 * scale);
  lightning.castShadow = false;
  pillar.add(lightning);

  for (let index = 0; index < 3; index += 1) {
    addBox(`BatteryStatusBar${index + 1}`, [0.075 * scale, 0.025 * scale, 0.018 * scale],
      index < 2 ? materials.cyan : materials.warmBulb,
      [0.12 * scale + index * 0.095 * scale, 0.27 * scale, pillarDepth * 0.52], pillar).castShadow = false;
  }
  addCylinder('BatteryCablePort', 0.075 * scale, 0.045 * scale, materials.recess,
    [pillarWidth * 0.28, 0.16 * scale, pillarDepth * 0.53], pillar, 12, [Math.PI / 2, 0, 0]);

  // --- Compact red wheeled tool / robot-parts cart ------------------------------
  const cartX = cartSide * radius * 1.25;
  const cartZ = radius * 0.72;
  cart.position.set(cartX, 0, cartZ);
  cart.rotation.y = -cartSide * 0.18;
  const cartWidth = 0.78 * scale;
  const cartDepth = 0.48 * scale;
  const cartTopY = 0.68 * scale;

  addBox('CartLowerShelf', [cartWidth, 0.075 * scale, cartDepth], materials.darkSteel,
    [0, 0.25 * scale, 0], cart);
  addBox('CartTopTray', [cartWidth, 0.085 * scale, cartDepth], materials.steel,
    [0, cartTopY, 0], cart);
  addBox('CartHazardIdentityStripe', [cartWidth * 0.74, 0.1 * scale, 0.025 * scale], materials.yellowHazard,
    [0, cartTopY - 0.06 * scale, cartDepth * 0.51], cart).castShadow = false;
  addBox('CartLowerHazardStripe', [cartWidth * 0.74, 0.075 * scale, 0.026 * scale], materials.yellowHazard,
    [0, 0.25 * scale, cartDepth * 0.51], cart).castShadow = false;
  addBox('CartRedDrawerCase', [cartWidth * 0.72, 0.27 * scale, cartDepth * 0.83], materials.red,
    [0, 0.46 * scale, 0], cart);
  for (let index = 0; index < 2; index += 1) {
    addBox(`CartDrawer${index + 1}`, [cartWidth * 0.61, 0.075 * scale, 0.022 * scale], materials.redDark,
      [0, (0.41 + index * 0.105) * scale, cartDepth * 0.43], cart);
    addBox(`CartDrawerHandle${index + 1}`, [cartWidth * 0.22, 0.018 * scale, 0.028 * scale], materials.steelHighlight,
      [0, (0.41 + index * 0.105) * scale, cartDepth * 0.48], cart);
  }

  const frameTransforms = [];
  for (const x of [-cartWidth * 0.43, cartWidth * 0.43]) {
    for (const z of [-cartDepth * 0.42, cartDepth * 0.42]) {
      frameTransforms.push({ position: [x, 0.44 * scale, z], scale: [0.045 * scale, 0.5 * scale, 0.045 * scale] });
    }
  }
  frameTransforms.push(
    { position: [-cartWidth * 0.5, 0.79 * scale, -cartDepth * 0.38], scale: [0.04 * scale, 0.28 * scale, 0.04 * scale] },
    { position: [-cartWidth * 0.5, 0.88 * scale, 0], scale: [0.04 * scale, 0.04 * scale, cartDepth * 0.78] }
  );
  addInstances('CartSteelFrame', new THREE.BoxGeometry(1, 1, 1), materials.darkSteel, frameTransforms, cart);

  const wheelGeometry = new THREE.CylinderGeometry(0.09 * scale, 0.09 * scale, 0.055 * scale, 12);
  const wheelTransforms = [];
  for (const x of [-cartWidth * 0.39, cartWidth * 0.39]) {
    for (const z of [-cartDepth * 0.35, cartDepth * 0.35]) {
      wheelTransforms.push({ position: [x, 0.1 * scale, z], rotation: [0, 0, Math.PI / 2] });
    }
  }
  addInstances('CartCasterWheels', wheelGeometry, materials.rubber, wheelTransforms, cart);

  // Recognizable loose robot head and tools on the upper tray.
  addBox('SpareRobotHead', [0.28 * scale, 0.22 * scale, 0.24 * scale], materials.red,
    [0.12 * scale, 0.83 * scale, 0.01 * scale], cart);
  addBox('SpareRobotFace', [0.19 * scale, 0.1 * scale, 0.018 * scale], materials.recess,
    [0.12 * scale, 0.83 * scale, 0.135 * scale], cart);
  addBox('SpareRobotEye', [0.085 * scale, 0.025 * scale, 0.012 * scale], materials.cyan,
    [0.12 * scale, 0.84 * scale, 0.147 * scale], cart).castShadow = false;
  addCylinder('CartWrenchHandle', 0.025 * scale, 0.33 * scale, materials.steelHighlight,
    [-0.22 * scale, 0.76 * scale, 0.02 * scale], cart, 8, [0, 0, Math.PI / 2]);
  addCylinder('RobotJointPart', 0.09 * scale, 0.12 * scale, materials.darkSteel,
    [-0.2 * scale, 0.79 * scale, -0.13 * scale], cart, 12, [Math.PI / 2, 0, 0]);

  // --- Thick service cables ------------------------------------------------------
  const socketY = height + 0.06 * scale;
  const cableSpecs = [
    {
      name: 'BatteryPowerUmbilical', material: materials.rubber, radius: 0.055 * scale,
      points: [
        [-radius * 0.72, socketY, -radius * 0.32],
        [-radius * 0.95, 0.11 * scale, -radius * 0.18],
        [pillarX * 0.82, 0.08 * scale, pillarZ * 0.45],
        [pillarX, 0.17 * scale, pillarZ + 0.08 * scale]
      ]
    },
    {
      name: 'CartDiagnosticCable', material: materials.rubber, radius: 0.046 * scale,
      points: [
        [radius * 0.38 * cartSide, socketY, radius * 0.65],
        [radius * 0.78 * cartSide, 0.1 * scale, radius * 0.88],
        [cartX * 0.9, 0.08 * scale, cartZ * 1.08],
        [cartX, 0.31 * scale, cartZ]
      ]
    },
    {
      name: 'CyanDataServiceCable', material: materials.cyanDim, radius: 0.032 * scale,
      points: [
        [radius * 0.69, socketY, -radius * 0.32],
        [radius * 0.92, 0.09 * scale, -radius * 0.64],
        [radius * 1.2, 0.08 * scale, -radius * 0.94],
        [radius * 1.42, 0.1 * scale, -radius * 1.05]
      ].map(([x, y, z]) => [x * cartSide, y, z])
    }
  ];
  for (const spec of cableSpecs) {
    const curve = new THREE.CatmullRomCurve3(spec.points.map((point) => new THREE.Vector3(...point)), false, 'centripetal');
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, spec.radius, 7, false), spec.material);
    tube.name = spec.name;
    tube.castShadow = castShadow;
    tube.receiveShadow = receiveShadow;
    tube.userData.semantic = 'service-cable';
    cables.add(tube);
  }

  // Dedicated semantic sockets at service cable endpoints.
  const cableEndCollars = [
    [pillarX, 0.17 * scale, pillarZ + 0.08 * scale],
    [cartX, 0.31 * scale, cartZ],
    [radius * 1.42 * cartSide, 0.1 * scale, -radius * 1.05]
  ];
  addInstances('ServiceCableEndCollars', new THREE.TorusGeometry(0.07 * scale, 0.018 * scale, 6, 12),
    materials.copper, cableEndCollars.map((position) => ({ position, rotation: [Math.PI / 2, 0, 0] })), cables);

  // Named empty anchors make animation/light augmentation integration stable.
  const anchorSpecs = [
    ['RobotDockSurfaceAnchor', [0, height + radius * 0.02, 0], 'robot-dock', 0x5cefff],
    ['EnergyRingAnchor', [0, height + radius * 0.02, 0], 'cyan-emissive', 0x5cefff],
    ['BatteryGlyphAnchor', [pillarX, 0.59 * scale, pillarZ + pillarDepth * 0.52], 'cyan-emissive', 0x5cefff],
    ['CartWorkLightAnchor', [cartX, 0.86 * scale, cartZ], 'warm-practical', 0xffb35c]
  ];
  const emissiveAnchorRecords = [];
  for (const [name, position, role, color] of anchorSpecs) {
    const anchor = new THREE.Object3D();
    anchor.name = name;
    anchor.position.set(...position);
    anchor.userData.role = role;
    runtimeAnchors.add(anchor);
    emissiveAnchorRecords.push(anchorRecord(anchor, role, color));
  }

  root.traverse((object) => {
    if (object.isMesh && !object.isInstancedMesh) shadow(object);
  });
  energyRing.castShadow = false;
  innerEnergyRing.castShadow = false;
  lightning.castShadow = false;
  bulbInstances.castShadow = false;
  socketInsets.castShadow = false;

  root.updateMatrixWorld(true);
  const componentCounts = {
    platformSegments: plateCount,
    hazardSegments: hazardCount,
    warmRimBulbs: bulbCount,
    centerMetalPlates: plateCount,
    bolts: boltCount,
    cableSockets: socketAngles.length,
    serviceCables: cableSpecs.length,
    cartWheels: wheelTransforms.length,
    batteryPillars: 1,
    carts: 1,
    practicalLights: includeLights ? 4 : 0,
    meshes: 0,
    instancedMeshes: 0,
    renderedInstances: 0
  };
  root.traverse((object) => {
    if (object.isMesh) componentCounts.meshes += 1;
    if (object.isInstancedMesh) {
      componentCounts.instancedMeshes += 1;
      componentCounts.renderedInstances += object.count;
    }
  });

  root.userData.referenceRuntime = {
    id: 'central-robot-bay-v1',
    deterministic: true,
    localOrigin: 'platform-center-at-floor',
    platformRadius: radius,
    platformHeight: height,
    robotSurfaceY: height + radius * 0.02,
    recommendedRobotRootOffsetY: height + radius * 0.02,
    robotClearanceDiameter: radius * 1.42,
    cartSide,
    componentCounts,
    lightAnchors: lightAnchorRecords,
    emissiveAnchors: emissiveAnchorRecords,
    semanticChildren: {
      platform: platform.name,
      batteryPillar: pillar.name,
      toolCart: cart.name,
      serviceCables: cables.name,
      runtimeAnchors: runtimeAnchors.name
    }
  };

  return root;

  function addBox(name, size, material, position, parent) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.name = name;
    mesh.position.set(...position);
    shadow(mesh);
    parent.add(mesh);
    return mesh;
  }

  function addCylinder(name, cylinderRadius, cylinderHeight, material, position, parent, sides = 16, rotation = null) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(cylinderRadius, cylinderRadius, cylinderHeight, sides), material
    );
    mesh.name = name;
    mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    shadow(mesh);
    parent.add(mesh);
    return mesh;
  }

  function addInstances(name, geometry, material, transforms, parent) {
    const instances = new THREE.InstancedMesh(geometry, material, transforms.length);
    instances.name = name;
    instances.castShadow = castShadow;
    instances.receiveShadow = receiveShadow;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scaleVector = new THREE.Vector3();
    const euler = new THREE.Euler();
    transforms.forEach((transform, index) => {
      position.fromArray(transform.position ?? [0, 0, 0]);
      euler.fromArray(transform.rotation ?? [0, 0, 0]);
      quaternion.setFromEuler(euler);
      scaleVector.fromArray(transform.scale ?? [1, 1, 1]);
      matrix.compose(position, quaternion, scaleVector);
      instances.setMatrixAt(index, matrix);
    });
    instances.instanceMatrix.needsUpdate = true;
    parent.add(instances);
    return instances;
  }
}

function namedGroup(name, parent) {
  const group = new THREE.Group();
  group.name = name;
  parent.add(group);
  return group;
}

function makeAnnularSegmentGeometry(innerRadius, outerRadius, span, subdivisions) {
  const shape = new THREE.Shape();
  for (let index = 0; index <= subdivisions; index += 1) {
    const angle = -span / 2 + span * index / subdivisions;
    const x = Math.cos(angle) * outerRadius;
    const y = Math.sin(angle) * outerRadius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  for (let index = subdivisions; index >= 0; index -= 1) {
    const angle = -span / 2 + span * index / subdivisions;
    shape.lineTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
  }
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function anchorRecord(object, role, color) {
  return {
    name: object.name,
    role,
    color,
    localPosition: object.position.toArray()
  };
}
