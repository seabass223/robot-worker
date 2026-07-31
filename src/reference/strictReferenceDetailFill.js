import * as THREE from 'three';

/**
 * Three-cluster, screenshot-scale detail overlay for the strict workshop reference.
 * Coordinates are room/world-local: +Y up, -Z back wall, +Z foreground.
 * The factory is deterministic and does not require a DOM.
 *
 * @param {object} options
 * @param {[number, number, number]} [options.position=[0,0,0]]
 * @param {number} [options.rotationY=0]
 * @param {number} [options.scale=1]
 * @param {boolean} [options.shadows=false]
 * @param {boolean} [options.lights=true] Add one practical point light per cluster.
 * @param {number} [options.lightIntensity=1]
 * @param {number} [options.warm=0xffa257]
 * @param {number} [options.cyan=0x56d9ff]
 * @returns {THREE.Group}
 */
export function createStrictReferenceDetailFill(options = {}) {
  const {
    position = [0, 0, 0],
    rotationY = 0,
    scale = 1,
    shadows = false,
    lights = true,
    lightIntensity = 1,
    warm = 0xffa257,
    cyan = 0x56d9ff
  } = options;

  const root = new THREE.Group();
  root.name = 'StrictReferenceDetailFill';
  root.position.fromArray(position);
  root.rotation.y = rotationY;
  root.scale.setScalar(scale);

  // Exactly three direct children are the broad semantic clusters.
  const left = namedGroup('LeftWorkbenchPegboardBooster', root, [-5.8, 0, -1.8]);
  const lounge = namedGroup('ForegroundLoungeBooster', root, [0.2, 0, 5.0]);
  const right = namedGroup('RightWorkstationBooster', root, [5.4, 0, -1.2]);

  // Reused primitive geometry keeps the standalone overlay compact.
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const cyl8 = new THREE.CylinderGeometry(1, 1, 1, 8);
  const cyl12 = new THREE.CylinderGeometry(1, 1, 1, 12);
  const sphere = new THREE.SphereGeometry(1, 16, 10);
  const torus = new THREE.TorusGeometry(1, 0.13, 8, 28);

  const mat = {
    graphite: standard('StrictGraphite', 0x20262a, 0.58, 0.48, true),
    black: standard('StrictRubberBlack', 0x101417, 0.86, 0.12),
    steel: standard('StrictToolSteel', 0x9ba4a7, 0.34, 0.80, true),
    darkSteel: standard('StrictDarkSteel', 0x4a5358, 0.42, 0.70, true),
    pegboard: standard('StrictPegboardWood', 0x704a2d, 0.84, 0.02),
    benchWood: standard('StrictBenchWood', 0x5c3826, 0.70, 0.04),
    orange: standard('StrictToolOrange', 0xd9692d, 0.52, 0.24, true),
    solderBlue: standard('StrictSolderBlue', 0x355a68, 0.58, 0.28),
    binBlue: standard('StrictPartsBinBlue', 0x35647a, 0.68, 0.22),
    binOchre: standard('StrictPartsBinOchre', 0xa87b37, 0.70, 0.16),
    rust: standard('StrictBeanbagRust', 0xa94f37, 0.96, 0, true),
    rustLight: standard('StrictBeanbagHighlight', 0xc06a48, 0.94, 0, true),
    crate: standard('StrictCrateWood', 0x765035, 0.82, 0.03),
    paper: standard('StrictPaperCream', 0xd8cdb5, 0.88, 0),
    bookRed: standard('StrictBookRed', 0x8f3d34, 0.80, 0.02),
    bookBlue: standard('StrictBookBlue', 0x345569, 0.76, 0.04),
    ceramic: standard('StrictMugCeramic', 0xd7d1c5, 0.68, 0),
    monitor: standard('StrictMonitorShell', 0x171c20, 0.50, 0.42),
    screen: emissive('StrictMonitorScreen', 0x153d48, cyan, 1.25),
    cyanGlow: emissive('StrictCyanPractical', 0x4cc9e6, cyan, 2.8),
    warmGlow: emissive('StrictWarmPractical', 0xffc17d, warm, 2.8),
    speaker: standard('StrictSpeakerCabinet', 0x252b2f, 0.68, 0.34),
    cone: standard('StrictSpeakerCone', 0x0a0d0f, 0.92, 0.08),
    tower: standard('StrictComputerTower', 0x242a2d, 0.48, 0.56),
    shelfBox: standard('StrictShelfBox', 0x6e5943, 0.86, 0.03)
  };
  // Reuse visually equivalent material families so the three clusters batch into
  // broad screenshot-scale color groups instead of one draw call per prop type.
  mat.solderBlue = mat.darkSteel;
  mat.binOchre = mat.orange;
  mat.rustLight = mat.rust;
  mat.crate = mat.benchWood;
  mat.bookRed = mat.rust;
  mat.bookBlue = mat.binBlue;
  mat.ceramic = mat.paper;
  mat.monitor = mat.graphite;
  mat.cyanGlow = mat.screen;
  mat.speaker = mat.graphite;
  mat.cone = mat.black;
  mat.tower = mat.darkSteel;
  mat.shelfBox = mat.benchWood;

  const addMesh = (parent, name, geometry, material, at, size = [1, 1, 1], rotation = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.fromArray(at);
    mesh.scale.fromArray(size);
    mesh.rotation.set(...rotation);
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    parent.add(mesh);
    return mesh;
  };
  const box = (parent, name, size, at, material = mat.graphite, rotation) =>
    addMesh(parent, name, unitBox, material, at, size, rotation);
  const cylinder = (parent, name, radius, height, at, material = mat.steel, rotation = [0, 0, 0], geometry = cyl12) =>
    addMesh(parent, name, geometry, material, at, [radius, height, radius], rotation);
  const loop = (parent, name, radius, at, material = mat.black, rotation = [Math.PI / 2, 0, 0], scale3 = [1, 1, 1]) =>
    addMesh(parent, name, torus, material, at, [radius * scale3[0], radius * scale3[1], radius * scale3[2]], rotation);

  // -------------------------------------------------------------------------
  // Cluster 1: left workbench / pegboard silhouettes.
  // -------------------------------------------------------------------------
  const pegboard = namedGroup('LeftBroadPegboardAndBench', left);
  box(pegboard, 'LeftBoosterPegboardPanel', [0.16, 2.45, 3.45], [-0.36, 2.55, 0], mat.pegboard);
  box(pegboard, 'LeftBoosterWorkbenchTop', [1.18, 0.18, 3.55], [0.18, 1.18, 0], mat.benchWood);
  box(pegboard, 'LeftBoosterBackRail', [0.22, 0.18, 3.60], [-0.18, 1.38, 0], mat.darkSteel);

  const drill = namedGroup('LargeCordlessDrillSilhouette', left);
  box(drill, 'DrillMotorBody', [0.50, 0.48, 0.78], [0.02, 2.82, -1.03], mat.orange, [0, 0.08, 0]);
  cylinder(drill, 'DrillChuck', 0.16, 0.38, [0.03, 2.82, -0.44], mat.darkSteel, [Math.PI / 2, 0, 0], cyl8);
  cylinder(drill, 'DrillBit', 0.055, 0.52, [0.03, 2.82, -0.01], mat.steel, [Math.PI / 2, 0, 0], cyl8);
  box(drill, 'DrillGrip', [0.30, 0.78, 0.30], [0.03, 2.30, -1.05], mat.graphite, [0, 0, -0.18]);
  box(drill, 'DrillBattery', [0.50, 0.24, 0.52], [0.03, 1.90, -1.08], mat.orange);

  const wrenchRow = namedGroup('LargeWrenchRow', left);
  [-1.05, -0.37, 0.34, 1.08].forEach((z, index) => {
    const y = 3.18 - (index % 2) * 0.12;
    box(wrenchRow, `WrenchHandle-${index + 1}`, [0.14, 1.02, 0.16], [-0.17, y, z], mat.steel, [0, 0, index % 2 ? -0.10 : 0.08]);
    loop(wrenchRow, `WrenchRing-${index + 1}`, 0.20, [-0.17, y + 0.56, z], mat.steel, [0, Math.PI / 2, 0]);
    box(wrenchRow, `WrenchJaw-${index + 1}`, [0.30, 0.20, 0.18], [-0.17, y - 0.58, z], mat.steel, [0, 0, index % 2 ? 0.28 : -0.25]);
  });

  const solder = namedGroup('BroadSolderStation', left);
  box(solder, 'SolderStationBase', [0.82, 0.56, 0.72], [0.20, 1.55, 0.15], mat.solderBlue);
  box(solder, 'SolderStationFace', [0.84, 0.40, 0.04], [0.20, 1.55, 0.53], mat.graphite);
  cylinder(solder, 'SolderStationDial', 0.13, 0.07, [0.20, 1.55, 0.58], mat.orange, [Math.PI / 2, 0, 0]);
  cylinder(solder, 'SolderIronGrip', 0.10, 0.75, [0.30, 1.76, 0.88], mat.black, [0.18, 0, -0.90], cyl8);
  cylinder(solder, 'SolderIronTip', 0.035, 0.48, [0.30, 1.99, 1.18], mat.steel, [0.18, 0, -0.90], cyl8);

  const reel = namedGroup('LargePegboardCableReel', left);
  loop(reel, 'CableReelOuter', 0.55, [-0.12, 2.18, 1.13], mat.orange, [0, Math.PI / 2, 0]);
  loop(reel, 'CableReelInner', 0.37, [-0.10, 2.18, 1.13], mat.black, [0, Math.PI / 2, 0]);
  cylinder(reel, 'CableReelHub', 0.17, 0.28, [0.02, 2.18, 1.13], mat.darkSteel, [0, 0, Math.PI / 2]);

  const hangingLeads = namedGroup('HangingTestLeads', left);
  addTube(hangingLeads, 'OrangeHangingLead', [
    [-0.05, 3.65, 1.46], [0.18, 3.08, 1.55], [0.18, 2.38, 1.63], [0.34, 1.70, 1.42]
  ], 0.055, mat.orange, shadows);
  addTube(hangingLeads, 'BlackHangingLead', [
    [-0.08, 3.65, 1.15], [0.30, 3.10, 1.06], [0.26, 2.50, 0.88], [0.44, 1.82, 1.04]
  ], 0.05, mat.black, shadows);

  const bins = namedGroup('TwoLargePartsBins', left);
  [[-0.02, 1.64, -0.58, mat.binBlue], [-0.02, 1.64, -1.38, mat.binOchre]].forEach((spec, index) => {
    box(bins, `PartsBin-${index + 1}`, [0.82, 0.52, 0.68], spec.slice(0, 3), spec[3]);
    box(bins, `PartsBinLabel-${index + 1}`, [0.38, 0.14, 0.035], [spec[0] + 0.42, spec[1], spec[2]], mat.paper, [0, Math.PI / 2, 0]);
  });
  const toolbox = namedGroup('LargeFloorToolbox', left);
  box(toolbox, 'FloorToolboxBody', [1.10, 0.58, 1.42], [0.20, 0.34, -0.72], mat.orange);
  box(toolbox, 'FloorToolboxLid', [1.16, 0.16, 1.48], [0.20, 0.70, -0.72], mat.graphite);
  loop(toolbox, 'FloorToolboxHandle', 0.30, [0.20, 0.95, -0.72], mat.darkSteel, [0, Math.PI / 2, 0], [1, 1.25, 1]);
  const drillPress = namedGroup('LargeFloorDrillPress', left);
  box(drillPress, 'DrillPressBase', [1.00, 0.16, 0.82], [0.28, 0.10, 1.92], mat.darkSteel);
  cylinder(drillPress, 'DrillPressColumn', 0.11, 1.72, [0.20, 0.92, 1.92], mat.steel);
  box(drillPress, 'DrillPressTable', [0.62, 0.10, 0.70], [0.34, 0.88, 1.92], mat.graphite);
  box(drillPress, 'DrillPressMotorHead', [0.78, 0.48, 0.72], [0.30, 1.75, 1.92], mat.orange);
  cylinder(drillPress, 'DrillPressSpindle', 0.07, 0.62, [0.42, 1.30, 1.92], mat.darkSteel);
  cylinder(drillPress, 'DrillPressFeedLever', 0.045, 0.58, [0.68, 1.66, 2.10], mat.steel, [0, 0, -0.82], cyl8);
  cylinder(drillPress, 'DrillPressFeedKnob', 0.11, 0.12, [0.90, 1.45, 2.10], mat.black, [0, 0, Math.PI / 2]);

  addPractical(left, 'LeftWorkbenchWarmPractical', [-0.05, 4.05, 0.05], warm, 1.35, 3.4, mat.warmGlow);

  // -------------------------------------------------------------------------
  // Cluster 2: foreground lounge, entirely left of the sofa centered at x=1.6.
  // Its rightmost silhouette remains at about world x=1.08, leaving clear separation.
  // -------------------------------------------------------------------------
  const beanbag = namedGroup('RustBeanbagAssembly', lounge);
  addMesh(beanbag, 'RustBeanbagMainSilhouette', sphere, mat.rust, [-0.45, 0.62, 0.05], [0.95, 0.68, 0.84], [0, 0.18, 0]);
  addMesh(beanbag, 'RustBeanbagBackLobe', sphere, mat.rustLight, [-0.68, 0.86, -0.12], [0.66, 0.72, 0.58], [0.06, -0.25, -0.18]);
  cylinder(beanbag, 'BeanbagTopButton', 0.09, 0.08, [-0.65, 1.43, -0.10], mat.darkSteel, [0, 0, 0]);

  const crate = namedGroup('LoungeSideCrate', lounge);
  box(crate, 'SideCrateBody', [0.72, 0.62, 0.82], [0.48, 0.34, -0.62], mat.crate);
  box(crate, 'SideCrateTop', [0.78, 0.10, 0.88], [0.48, 0.70, -0.62], mat.benchWood);
  [-0.25, 0, 0.25].forEach((z, index) => box(crate, `SideCrateSlat-${index + 1}`, [0.04, 0.45, 0.12], [0.855, 0.35, -0.62 + z], mat.graphite));

  const reading = namedGroup('TwoLargeMagazineBookStacks', lounge);
  const stackSpecs = [
    { x: -1.30, z: 0.48, colors: [mat.bookRed, mat.paper, mat.bookBlue, mat.paper] },
    { x: 0.40, z: 0.43, colors: [mat.bookBlue, mat.paper, mat.bookRed] }
  ];
  stackSpecs.forEach((stack, stackIndex) => {
    stack.colors.forEach((material, index) => {
      box(reading, `ReadingStack-${stackIndex + 1}-Volume-${index + 1}`,
        [0.72 - index * 0.035, 0.10, 0.90 - index * 0.04],
        [stack.x, 0.08 + index * 0.105, stack.z], material,
        [0, (index % 2 ? -0.07 : 0.06), 0]);
    });
  });

  const mug = namedGroup('LargeLoungeMug', lounge);
  cylinder(mug, 'MugBody', 0.18, 0.36, [0.47, 0.96, -0.62], mat.ceramic);
  loop(mug, 'MugHandle', 0.16, [0.68, 0.98, -0.62], mat.ceramic, [0, Math.PI / 2, 0], [0.86, 1, 0.86]);
  cylinder(mug, 'MugCoffeeSurface', 0.145, 0.015, [0.47, 1.145, -0.62], mat.black);

  const headphones = namedGroup('LargeFloorHeadphones', lounge);
  loop(headphones, 'HeadphoneBand', 0.38, [-1.17, 0.16, -0.65], mat.black, [Math.PI / 2, 0, 0], [1, 1.22, 1]);
  box(headphones, 'HeadphoneLeftCup', [0.24, 0.16, 0.34], [-1.52, 0.17, -0.65], mat.graphite, [0, 0.14, 0]);
  box(headphones, 'HeadphoneRightCup', [0.24, 0.16, 0.34], [-0.82, 0.17, -0.65], mat.graphite, [0, -0.14, 0]);

  const floorCable = namedGroup('ThickCoiledLoungeFloorCable', lounge);
  loop(floorCable, 'LoungeCableOuterLoop', 0.72, [-0.45, 0.10, 1.05], mat.black, [Math.PI / 2, 0, 0.06], [1.25, 1, 1]);
  loop(floorCable, 'LoungeCableInnerLoop', 0.49, [-0.35, 0.115, 1.06], mat.black, [Math.PI / 2, 0, -0.08], [1.23, 1, 1]);
  addTube(floorCable, 'LoungeCableTail', [
    [0.12, 0.10, 1.10], [0.43, 0.11, 1.28], [0.55, 0.10, 1.58], [0.42, 0.10, 1.85]
  ], 0.065, mat.black, shadows);
  addPractical(lounge, 'LoungeCrateWarmPractical', [0.48, 1.18, -0.62], warm, 1.0, 2.8, mat.warmGlow);

  // -------------------------------------------------------------------------
  // Cluster 3: right workstation booster; props only, no duplicate desk.
  // -------------------------------------------------------------------------
  const monitor = namedGroup('SecondLargeWorkstationMonitor', right);
  box(monitor, 'SecondMonitorShell', [0.18, 1.22, 1.72], [0, 2.23, -0.18], mat.monitor);
  box(monitor, 'SecondMonitorScreen', [0.035, 1.02, 1.50], [0.105, 2.23, -0.18], mat.screen);
  box(monitor, 'SecondMonitorStandNeck', [0.18, 0.66, 0.20], [-0.02, 1.40, -0.18], mat.darkSteel);
  box(monitor, 'SecondMonitorStandFoot', [0.55, 0.10, 0.82], [0.05, 1.08, -0.18], mat.graphite);
  // Broad cyan lines ensure the screen reads from the default +X,+Z camera.
  [-0.31, -0.05, 0.22].forEach((z, index) => box(monitor, `MonitorCodeBar-${index + 1}`,
    [0.025, 0.08, 0.74 - index * 0.11], [0.127, 2.48 - index * 0.24, z], mat.cyanGlow));

  const tower = namedGroup('LargeWorkstationTower', right);
  box(tower, 'ComputerTowerCase', [0.74, 1.50, 0.92], [0.05, 0.78, -1.42], mat.tower);
  box(tower, 'ComputerTowerFrontInset', [0.76, 1.20, 0.05], [0.05, 0.80, -0.935], mat.black);
  cylinder(tower, 'ComputerTowerFan', 0.25, 0.055, [0.05, 0.94, -0.90], mat.cyanGlow, [Math.PI / 2, 0, 0]);
  box(tower, 'ComputerTowerAmberStatus', [0.12, 0.12, 0.05], [0.05, 0.36, -0.90], mat.warmGlow);

  const speakers = namedGroup('LargeWorkstationSpeakerPair', right);
  [-1.25, 1.18].forEach((z, index) => {
    box(speakers, `WorkstationSpeaker-${index + 1}`, [0.44, 0.84, 0.56], [0.02, 1.62, z], mat.speaker);
    cylinder(speakers, `WorkstationSpeakerCone-${index + 1}`, 0.20, 0.05, [0.255, 1.63, z], mat.cone, [0, 0, Math.PI / 2]);
    cylinder(speakers, `WorkstationSpeakerTweeter-${index + 1}`, 0.085, 0.055, [0.26, 1.91, z], mat.darkSteel, [0, 0, Math.PI / 2]);
  });

  const keyboard = namedGroup('RaisedKeyboardDeck', right);
  box(keyboard, 'KeyboardDeckTray', [1.15, 0.10, 1.75], [0.56, 0.96, 0.14], mat.graphite, [0, 0, -0.06]);
  box(keyboard, 'LargeKeyboardBody', [0.76, 0.10, 1.48], [0.68, 1.05, 0.14], mat.black, [0, 0, -0.06]);
  const keys = new THREE.InstancedMesh(unitBox, mat.darkSteel, 24);
  keys.name = 'LargeKeyboardKeysInstanced';
  keys.castShadow = shadows;
  keys.receiveShadow = shadows;
  const dummy = new THREE.Object3D();
  for (let index = 0; index < 24; index++) {
    const row = Math.floor(index / 8);
    const column = index % 8;
    dummy.position.set(0.755, 1.125 - row * 0.045, -0.43 + column * 0.16);
    dummy.scale.set(0.04, 0.025, 0.115);
    dummy.updateMatrix();
    keys.setMatrixAt(index, dummy.matrix);
  }
  keys.instanceMatrix.needsUpdate = true;
  keyboard.add(keys);

  const cableBundle = namedGroup('ThickWorkstationCableBundle', right);
  [-0.14, 0, 0.14].forEach((offset, index) => addTube(cableBundle, `WorkstationCable-${index + 1}`, [
    [-0.08, 1.42, 0.45 + offset], [0.22, 1.10, 0.60 + offset], [0.12, 0.58, 0.72 + offset], [0.40, 0.10, 0.92 + offset]
  ], 0.045, index === 1 ? mat.orange : mat.black, shadows));
  loop(cableBundle, 'WorkstationCableFloorLoop', 0.48, [0.34, 0.09, 0.98], mat.black, [Math.PI / 2, 0, 0.15]);

  const shelfBoxes = namedGroup('TwoLargeWorkstationShelfBoxes', right);
  box(shelfBoxes, 'WorkstationShelfDeck', [0.54, 0.14, 2.70], [-0.16, 3.37, -0.12], mat.darkSteel);
  [[-0.13, 3.73, -0.76, mat.shelfBox], [-0.13, 3.75, 0.62, mat.binBlue]].forEach((spec, index) => {
    box(shelfBoxes, `WorkstationShelfBox-${index + 1}`, [0.68, 0.64, 1.02], spec.slice(0, 3), spec[3]);
    box(shelfBoxes, `WorkstationShelfBoxLabel-${index + 1}`, [0.035, 0.16, 0.42], [0.225, spec[1], spec[2]], mat.paper);
  });
  const chair = namedGroup('ReferenceWorkstationSwivelChair', right);
  chair.position.set(-0.7, 0, 0.9);
  box(chair, 'WorkstationChairSeat', [0.95, 0.20, 1.02], [0.82, 0.76, 1.72], mat.rust);
  box(chair, 'WorkstationChairBack', [0.22, 1.12, 1.05], [0.62, 1.40, 1.82], mat.graphite, [0, 0, -0.12]);
  cylinder(chair, 'WorkstationChairStem', 0.10, 0.62, [0.82, 0.38, 1.72], mat.darkSteel, [0, 0, 0], cyl12);
  for (let index = 0; index < 5; index += 1) {
    const angle = index * Math.PI * 2 / 5;
    box(chair, `WorkstationChairSpoke-${index + 1}`, [0.58, 0.07, 0.10],
      [0.82 + Math.cos(angle) * 0.24, 0.11, 1.72 + Math.sin(angle) * 0.24], mat.darkSteel, [0, -angle, 0]);
    addMesh(chair, `WorkstationChairCaster-${index + 1}`, sphere, mat.black,
      [0.82 + Math.cos(angle) * 0.52, 0.10, 1.72 + Math.sin(angle) * 0.52], [0.10, 0.10, 0.10]);
  }

  addPractical(right, 'RightWorkstationCyanPractical', [0.15, 3.18, -0.15], cyan, 1.25, 3.2, mat.cyanGlow);

  if (!lights) {
    root.traverse((child) => {
      if (child.isPointLight) child.removeFromParent();
    });
  } else {
    root.traverse((child) => {
      if (child.isPointLight) child.intensity *= lightIntensity;
    });
  }

  const counts = {
    semanticClusters: root.children.length,
    meshCount: 0,
    instancedMeshCount: 0,
    renderedInstanceCount: 0,
    pointLights: 0,
    shadowCasters: 0,
    shadowReceivers: 0,
    transmissionMaterials: 0
  };
  const seenMaterials = new Set();
  root.traverse((child) => {
    if (child.isMesh) counts.meshCount += 1;
    if (child.isInstancedMesh) {
      counts.instancedMeshCount += 1;
      counts.renderedInstanceCount += child.count;
    }
    if (child.isPointLight) counts.pointLights += 1;
    if (child.castShadow) counts.shadowCasters += 1;
    if (child.receiveShadow) counts.shadowReceivers += 1;
    if (!child.isMesh) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!material || seenMaterials.has(material.uuid)) return;
      seenMaterials.add(material.uuid);
      if ((material.transmission ?? 0) > 0) counts.transmissionMaterials += 1;
    });
  });

  root.userData.referenceRuntime = {
    model: 'strict-reference-detail-fill-v1',
    api: 'createStrictReferenceDetailFill(options={}) => THREE.Group',
    purpose: 'exactly-three-broad-visible-detail-clusters-without-hero-furniture-duplication',
    coordinateSystem: 'room-world-local:+y-up,-z-back-wall,+z-foreground',
    counts: {
      ...counts,
      drills: 1,
      wrenches: 4,
      solderStations: 1,
      cableReels: 1,
      hangingLeads: 2,
      partsBins: 2,
      floorToolboxes: 1,
      beanbags: 1,
      sideCrates: 1,
      readingStacks: 2,
      mugs: 1,
      headphones: 1,
      floorCableCoils: 1,
      secondMonitors: 1,
      towers: 1,
      speakerPairs: 1,
      keyboardDecks: 1,
      cableBundles: 1,
      shelfBoxes: 2,
      workstationChairs: 1
    },
    anchors: {
      leftWorkbenchPegboard: [-5.8, 0, -1.8],
      foregroundLounge: [0.2, 0, 5.0],
      rightWorkstation: [5.4, 0, -1.2],
      shiftedSofaCenterX: 1.6,
      loungeMaximumWorldX: 1.08
    },
    semanticGroups: {
      clusters: [left.name, lounge.name, right.name],
      left: ['LargeCordlessDrillSilhouette', 'LargeWrenchRow', 'BroadSolderStation', 'LargePegboardCableReel', 'HangingTestLeads', 'TwoLargePartsBins', 'LargeFloorToolbox'],
      lounge: ['RustBeanbagAssembly', 'LoungeSideCrate', 'TwoLargeMagazineBookStacks', 'LargeLoungeMug', 'LargeFloorHeadphones', 'ThickCoiledLoungeFloorCable'],
      right: ['SecondLargeWorkstationMonitor', 'LargeWorkstationTower', 'LargeWorkstationSpeakerPair', 'RaisedKeyboardDeck', 'ThickWorkstationCableBundle', 'TwoLargeWorkstationShelfBoxes']
    },
    options: { shadows, lights, lightIntensity, warm, cyan },
    constraints: {
      deterministic: true,
      clusterCount: 3,
      maximumPointLights: 3,
      transmissionMaterials: 0,
      shadowsDefaultOff: true,
      noHeroRobotPlatformSofaDeskStairsOrUpperShelfDuplication: true
    }
  };

  return root;

  function addPractical(parent, name, at, color, intensity, distance, bulbMaterial) {
    const practical = namedGroup(name, parent);
    cylinder(practical, `${name}Housing`, 0.17, 0.16, at, mat.darkSteel);
    addMesh(practical, `${name}Bulb`, sphere, bulbMaterial, [at[0], at[1] - 0.16, at[2]], [0.13, 0.16, 0.13]);
    const light = new THREE.PointLight(color, intensity, distance, 2);
    light.name = `${name}PointLight`;
    light.position.set(at[0], at[1] - 0.20, at[2]);
    light.castShadow = false;
    practical.add(light);
  }
}

function namedGroup(name, parent, position = [0, 0, 0]) {
  const group = new THREE.Group();
  group.name = name;
  group.position.fromArray(position);
  parent.add(group);
  return group;
}

function standard(name, color, roughness, metalness, flatShading = false) {
  return new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading });
}

function emissive(name, color, emissiveColor, emissiveIntensity) {
  return new THREE.MeshStandardMaterial({
    name,
    color,
    emissive: emissiveColor,
    emissiveIntensity,
    roughness: 0.30,
    metalness: 0.04,
    toneMapped: false
  });
}

function addTube(parent, name, points, radius, material, shadows) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 8, false), material);
  mesh.name = name;
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  parent.add(mesh);
  return mesh;
}

export default createStrictReferenceDetailFill;
