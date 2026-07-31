import * as THREE from 'three';

/**
 * Adds only the two large silhouette/density clusters that sit outside the
 * central robot bay and existing workstation/lounging compositions.
 *
 * Coordinates are room/world-local by default: +Y up, -Z back wall.
 * Apply `position`, `rotationY`, and `scale` to place the complete overlay.
 *
 * @param {object} options
 * @param {[number, number, number]} [options.position=[0,0,0]]
 * @param {number} [options.rotationY=0]
 * @param {number} [options.scale=1]
 * @param {boolean} [options.shadows=false] Enable cast/receive shadows.
 * @param {boolean} [options.lights=true] Add low-cost warm practical lights.
 * @param {number} [options.lightIntensity=1] Practical-light multiplier.
 * @param {number} [options.warm=0xffa449] Warm accent color.
 * @returns {THREE.Group}
 */
export function createCompositionDensityFill(options = {}) {
  const {
    position = [0, 0, 0],
    rotationY = 0,
    scale = 1,
    shadows = false,
    lights = true,
    lightIntensity = 1,
    warm = 0xffa449
  } = options;

  const root = new THREE.Group();
  root.name = 'CompositionDensityFill';
  root.position.fromArray(position);
  root.rotation.y = rotationY;
  root.scale.setScalar(scale);

  const backWallBand = namedGroup('UpperCenterBackWallShelfAndDuctBand', root);
  const shelfStructure = namedGroup('IndustrialShelfStructure', backWallBand);
  const shelfStock = namedGroup('ShelfStockSilhouettes', backWallBand);
  const ventilation = namedGroup('CurvedSilverVentilationDuct', backWallBand);
  const cableTray = namedGroup('DarkOverheadCableTray', backWallBand);

  const stairBase = namedGroup('StairBaseFloorCluster', root);
  const equipmentCase = namedGroup('LowEquipmentCabinetToolCase', stairBase);
  const floorPlant = namedGroup('MediumLeafyFloorPlant', stairBase);
  const cableCoil = namedGroup('CoiledFloorCable', stairBase);
  const practical = namedGroup('SmallWarmFloorPractical', stairBase);

  // Shared primitive geometry keeps draw data compact and makes repeated parts
  // (shelf uprights, stock, tray rungs, and leaves) deterministic.
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const unitCylinder12 = new THREE.CylinderGeometry(1, 1, 1, 12);
  const unitSphere = new THREE.SphereGeometry(1, 12, 8);
  const unitTorus = new THREE.TorusGeometry(1, 0.12, 8, 28);

  const materials = {
    shelf: standard('DensityShelfGraphite', 0x252a2e, 0.58, 0.64),
    shelfEdge: standard('DensityShelfEdge', 0x555c61, 0.42, 0.76),
    recess: standard('DensityDeepRecess', 0x0c1013, 0.86, 0.24),
    silver: standard('DensityVentSilver', 0x9ba2a3, 0.28, 0.86, true),
    silverDark: standard('DensityVentCollar', 0x4a5155, 0.38, 0.82, true),
    warmGlow: new THREE.MeshStandardMaterial({
      name: 'DensityWarmGlow', color: 0xffd296, emissive: warm,
      emissiveIntensity: 3.1, roughness: 0.24, metalness: 0, toneMapped: false
    }),
    bookRed: standard('DensityBookRed', 0x9c3d31, 0.78, 0.02),
    bookOchre: standard('DensityBookOchre', 0xc08b3f, 0.76, 0.02),
    bookBlue: standard('DensityBookBlue', 0x345d6e, 0.72, 0.08),
    bin: standard('DensityStorageBin', 0x4c5a5f, 0.72, 0.38),
    camera: standard('DensityCameraBlack', 0x111518, 0.62, 0.46),
    brass: standard('DensityTrophyBrass', 0xc6933d, 0.32, 0.76, true),
    pot: standard('DensityPlantPot', 0x9a4e34, 0.88, 0.04),
    soil: standard('DensityPlantSoil', 0x211713, 1, 0),
    leaf: standard('DensityLeafGreen', 0x3f6e43, 0.86, 0, true),
    leafLight: standard('DensityLeafHighlight', 0x6e9853, 0.8, 0, true),
    cabinet: standard('DensityEquipmentCabinet', 0x20262a, 0.62, 0.58),
    cabinetInset: standard('DensityCabinetInset', 0x101417, 0.82, 0.3),
    cable: standard('DensityCableRubber', 0x15191c, 0.9, 0.08),
    amber: standard('DensityAmberIndicator', 0xe18631, 0.45, 0.12)
  };

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
  const box = (parent, name, size, at, material, rotation) =>
    addMesh(parent, name, unitBox, material, at, size, rotation);
  const cylinder = (parent, name, radius, height, at, material, rotation = [0, 0, 0]) =>
    addMesh(parent, name, unitCylinder12, material, at, [radius, height, radius], rotation);

  // ---------------------------------------------------------------------------
  // Cluster 1: broad back-wall shelf / duct / tray band.
  // ---------------------------------------------------------------------------
  const shelfLevels = [3.22, 4.18, 5.14];
  shelfLevels.forEach((y, index) => {
    box(shelfStructure, `BroadShelfDeck-${index + 1}`, [4.15, 0.16, 0.62], [-2.75, y, -6.48], materials.shelf);
    box(shelfStructure, `BroadShelfFrontEdge-${index + 1}`, [4.18, 0.12, 0.10], [-2.75, y + 0.02, -6.12], materials.shelfEdge);
    box(shelfStructure, `WarmShelfStrip-${index + 1}`, [3.74, 0.055, 0.10], [-2.75, y - 0.12, -6.11], materials.warmGlow);
    if (lights) {
      const light = new THREE.PointLight(warm, 0.78 * lightIntensity, 2.4, 2);
      light.name = `WarmShelfPracticalLight-${index + 1}`;
      light.position.set(-2.75, y - 0.18, -5.98);
      light.castShadow = false;
      shelfStructure.add(light);
    }
  });
  [-4.72, -0.78].forEach((x, index) => {
    box(shelfStructure, `ShelfUpright-${index + 1}`, [0.16, 2.72, 0.20], [x, 4.24, -6.57], materials.shelf);
    box(shelfStructure, `ShelfFoot-${index + 1}`, [0.34, 0.12, 0.55], [x, 2.86, -6.47], materials.shelfEdge);
  });
  box(shelfStructure, 'ShelfDarkBackSilhouette', [4.02, 2.18, 0.08], [-2.75, 4.22, -6.78], materials.recess);

  const bookSpecs = [
    [-4.25, 3.55, 0.22, 0.54, 0.30, -0.05], [-3.98, 3.52, 0.25, 0.48, 0.30, 0.03],
    [-3.68, 3.56, 0.28, 0.56, 0.30, -0.04], [-2.58, 4.50, 0.22, 0.50, 0.28, 0.04],
    [-2.31, 4.53, 0.25, 0.56, 0.28, -0.03], [-2.01, 4.48, 0.27, 0.46, 0.28, 0.06],
    [-4.20, 5.48, 0.20, 0.52, 0.28, 0.02], [-3.95, 5.51, 0.26, 0.58, 0.28, -0.04]
  ];
  const bookMaterials = [materials.bookRed, materials.bookOchre, materials.bookBlue];
  const booksByMaterial = bookMaterials.map((material, materialIndex) => {
    const specs = bookSpecs.filter((_, index) => index % bookMaterials.length === materialIndex);
    const instanced = new THREE.InstancedMesh(unitBox, material, specs.length);
    instanced.name = `BroadBooksInstanced-${materialIndex + 1}`;
    instanced.castShadow = shadows;
    instanced.receiveShadow = shadows;
    const dummy = new THREE.Object3D();
    specs.forEach((spec, index) => {
      dummy.position.set(spec[0], spec[1], -6.12);
      dummy.scale.set(spec[2], spec[3], spec[4]);
      dummy.rotation.set(0, 0, spec[5]);
      dummy.updateMatrix();
      instanced.setMatrixAt(index, dummy.matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
    shelfStock.add(instanced);
    return instanced;
  });

  [[-3.05, 3.50], [-1.42, 3.50], [-3.25, 4.48]].forEach(([x, y], index) => {
    box(shelfStock, `BroadStorageBin-${index + 1}`, [0.76, 0.46, 0.48], [x, y, -6.12], materials.bin);
    box(shelfStock, `StorageBinLabel-${index + 1}`, [0.28, 0.12, 0.025], [x, y, -5.865], materials.shelfEdge);
  });

  // Camera silhouette: chunky body, lens, and top finder large enough to read.
  box(shelfStock, 'ShelfCameraBody', [0.66, 0.42, 0.32], [-1.28, 4.47, -6.10], materials.camera);
  cylinder(shelfStock, 'ShelfCameraLens', 0.18, 0.20, [-1.28, 4.47, -5.84], materials.silverDark, [Math.PI / 2, 0, 0]);
  box(shelfStock, 'ShelfCameraFinder', [0.23, 0.15, 0.20], [-1.45, 4.75, -6.10], materials.camera);

  // Trophy silhouette: broad cup and handles, not micro-detail.
  cylinder(shelfStock, 'ShelfTrophyStem', 0.07, 0.35, [-2.38, 5.47, -6.12], materials.brass);
  cylinder(shelfStock, 'ShelfTrophyCup', 0.25, 0.38, [-2.38, 5.78, -6.12], materials.brass);
  box(shelfStock, 'ShelfTrophyBase', [0.42, 0.12, 0.34], [-2.38, 5.27, -6.12], materials.brass);
  addMesh(shelfStock, 'ShelfTrophyLeftHandle', unitTorus, materials.brass, [-2.65, 5.80, -6.12], [0.22, 0.22, 0.22]);
  addMesh(shelfStock, 'ShelfTrophyRightHandle', unitTorus, materials.brass, [-2.11, 5.80, -6.12], [0.22, 0.22, 0.22]);

  createPlant({
    parent: shelfStock, prefix: 'ShelfPlant', center: [-3.25, 5.30, -6.10],
    potRadius: 0.28, potHeight: 0.34, leafScale: 0.72,
    cylinder, addMesh, unitSphere, materials, shadows
  });

  // A single large curved duct sweeps from the overhead band down its right side.
  const ductCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.15, 6.38, -6.38),
    new THREE.Vector3(-0.56, 6.36, -6.34),
    new THREE.Vector3(-0.90, 6.08, -6.28),
    new THREE.Vector3(-0.96, 5.48, -6.22),
    new THREE.Vector3(-0.96, 4.76, -6.18)
  ]);
  const duct = addMesh(
    ventilation, 'LargeSweepingSilverVentDuct',
    new THREE.TubeGeometry(ductCurve, 40, 0.29, 12, false),
    materials.silver, [0, 0, 0]
  );
  duct.userData.silhouetteRole = 'upper-center-right-sweep';
  [6.30, 5.72, 5.08].forEach((y, index) => {
    addMesh(ventilation, `VentDuctCollar-${index + 1}`, unitTorus, materials.silverDark,
      [-0.94, y, -6.22], [0.34, 0.34, 0.34], [Math.PI / 2, 0, 0]);
  });
  box(ventilation, 'VentDuctLowerRegister', [0.82, 0.52, 0.22], [-0.96, 4.46, -6.10], materials.silverDark);
  for (let index = 0; index < 4; index++) {
    box(ventilation, `VentRegisterSlat-${index + 1}`, [0.10, 0.36, 0.04], [-1.23 + index * 0.18, 4.46, -5.97], materials.recess);
  }

  // Dark cable tray forms a strong ceiling silhouette above shelf and duct.
  box(cableTray, 'OverheadTrayBackRail', [5.15, 0.20, 0.18], [-2.30, 6.42, -6.62], materials.recess);
  box(cableTray, 'OverheadTrayFrontRail', [5.15, 0.20, 0.18], [-2.30, 6.42, -6.13], materials.recess);
  const rungCount = 12;
  const rungs = new THREE.InstancedMesh(unitBox, materials.recess, rungCount);
  rungs.name = 'OverheadCableTrayRungsInstanced';
  rungs.castShadow = shadows;
  rungs.receiveShadow = shadows;
  const rungDummy = new THREE.Object3D();
  for (let index = 0; index < rungCount; index++) {
    rungDummy.position.set(-4.63 + index * 0.425, 6.42, -6.375);
    rungDummy.scale.set(0.08, 0.12, 0.58);
    rungDummy.updateMatrix();
    rungs.setMatrixAt(index, rungDummy.matrix);
  }
  rungs.instanceMatrix.needsUpdate = true;
  cableTray.add(rungs);

  // ---------------------------------------------------------------------------
  // Cluster 2: stair-base floor composition.
  // ---------------------------------------------------------------------------
  box(equipmentCase, 'LowDarkEquipmentCaseBody', [1.42, 0.78, 0.72], [-3.14, 0.43, 2.28], materials.cabinet);
  box(equipmentCase, 'EquipmentCaseFrontInset', [1.10, 0.44, 0.045], [-3.14, 0.44, 2.655], materials.cabinetInset);
  box(equipmentCase, 'EquipmentCaseTopLip', [1.50, 0.10, 0.80], [-3.14, 0.86, 2.28], materials.shelfEdge);
  box(equipmentCase, 'EquipmentCaseCarryHandle', [0.52, 0.11, 0.12], [-3.14, 1.02, 2.28], materials.recess);
  [-3.67, -2.61].forEach((x, index) => {
    box(equipmentCase, `EquipmentCaseLatch-${index + 1}`, [0.13, 0.18, 0.07], [x, 0.52, 2.70], materials.amber);
  });

  createPlant({
    parent: floorPlant, prefix: 'FloorPlant', center: [-1.72, 0.24, 2.42],
    potRadius: 0.38, potHeight: 0.48, leafScale: 1.12,
    cylinder, addMesh, unitSphere, materials, shadows
  });

  // Two offset loops read as one substantial cable coil at screenshot scale.
  addMesh(cableCoil, 'FloorCableCoilOuter', unitTorus, materials.cable,
    [-2.52, 0.105, 3.10], [0.58, 0.58, 0.58], [Math.PI / 2, 0, 0.10]);
  addMesh(cableCoil, 'FloorCableCoilInner', unitTorus, materials.cable,
    [-2.42, 0.115, 3.12], [0.43, 0.43, 0.43], [Math.PI / 2, 0, -0.08]);
  const cableTailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.05, 0.11, 3.25),
    new THREE.Vector3(-1.78, 0.10, 3.36),
    new THREE.Vector3(-1.55, 0.10, 3.20),
    new THREE.Vector3(-1.48, 0.10, 2.96)
  ]);
  addMesh(cableCoil, 'FloorCableTail', new THREE.TubeGeometry(cableTailCurve, 18, 0.045, 7, false), materials.cable, [0, 0, 0]);

  cylinder(practical, 'WarmPracticalBase', 0.24, 0.13, [-2.02, 0.12, 1.58], materials.cabinet);
  cylinder(practical, 'WarmPracticalCage', 0.19, 0.48, [-2.02, 0.41, 1.58], materials.silverDark);
  addMesh(practical, 'WarmPracticalBulb', unitSphere, materials.warmGlow,
    [-2.02, 0.42, 1.58], [0.13, 0.18, 0.13]);
  addMesh(practical, 'WarmPracticalTopHandle', unitTorus, materials.cabinet,
    [-2.02, 0.74, 1.58], [0.24, 0.28, 0.24], [0, 0, 0]);
  if (lights) {
    const floorLight = new THREE.PointLight(warm, 1.25 * lightIntensity, 3.0, 2);
    floorLight.name = 'StairBaseWarmPracticalLight';
    floorLight.position.set(-2.02, 0.52, 1.58);
    floorLight.castShadow = false;
    practical.add(floorLight);
  }

  let meshCount = 0;
  let instancedMeshCount = 0;
  let renderedInstanceCount = 0;
  let lightCount = 0;
  root.traverse((child) => {
    if (child.isMesh) meshCount += 1;
    if (child.isInstancedMesh) {
      instancedMeshCount += 1;
      renderedInstanceCount += child.count;
    }
    if (child.isLight) lightCount += 1;
  });

  root.userData.referenceRuntime = {
    model: 'composition-density-fill-v1',
    purpose: 'two-cluster-screenshot-scale-silhouette-fill-only',
    coordinateSystem: 'room-world-local:+y-up,-z-back-wall,+z-foreground',
    counts: {
      semanticClusters: 2,
      semanticGroups: 10,
      meshCount,
      instancedMeshCount,
      renderedInstanceCount,
      lightCount,
      shelfLevels: shelfLevels.length,
      shelfBooks: bookSpecs.length,
      storageBins: 3,
      ductSegments: 1,
      ductCollars: 3,
      cableTrayRungs: rungCount,
      equipmentCases: 1,
      leafyPlants: 2,
      cableCoils: 1,
      warmPracticals: 1
    },
    anchors: {
      upperCenterBackWallBand: [-2.6, 4.2, -6.55],
      broadShelving: [-2.75, 4.18, -6.48],
      curvedVentDuct: [-0.90, 5.55, -6.25],
      overheadCableTray: [-2.30, 6.42, -6.38],
      stairBaseFloorCluster: [-2.4, 0, 2.3],
      equipmentCase: [-3.14, 0, 2.28],
      mediumFloorPlant: [-1.72, 0, 2.42],
      coiledCable: [-2.52, 0.10, 3.10],
      warmFloorPractical: [-2.02, 0, 1.58]
    },
    semanticGroups: {
      clusters: [backWallBand.name, stairBase.name],
      backWallBand: [shelfStructure.name, shelfStock.name, ventilation.name, cableTray.name],
      stairBase: [equipmentCase.name, floorPlant.name, cableCoil.name, practical.name]
    },
    options: { shadows, lights, lightIntensity, warm },
    constraints: {
      deterministic: true,
      transmissionMaterials: 0,
      shadowsDefaultOff: true,
      clusterCount: 2
    }
  };

  // Keep a small, useful reference to the three instanced book meshes without
  // introducing additional scene content.
  root.userData.referenceRuntime.counts.bookInstancedMeshes = booksByMaterial.length;

  return root;
}

function namedGroup(name, parent) {
  const group = new THREE.Group();
  group.name = name;
  parent.add(group);
  return group;
}

function standard(name, color, roughness, metalness, flatShading = false) {
  return new THREE.MeshStandardMaterial({ name, color, roughness, metalness, flatShading });
}

function createPlant({
  parent, prefix, center, potRadius, potHeight, leafScale,
  cylinder, addMesh, unitSphere, materials, shadows
}) {
  const plant = namedGroup(`${prefix}Assembly`, parent);
  const potY = center[1] + potHeight * 0.5;
  cylinder(plant, `${prefix}Pot`, potRadius, potHeight, [center[0], potY, center[2]], materials.pot);
  cylinder(plant, `${prefix}Soil`, potRadius * 0.82, 0.055,
    [center[0], center[1] + potHeight + 0.01, center[2]], materials.soil);

  const leafSpecs = [
    [-0.28, 0.43, 0.02, 0.23, 0.48, 0.14, 0.55],
    [0.26, 0.51, -0.02, 0.22, 0.52, 0.14, -0.62],
    [-0.08, 0.71, 0.02, 0.24, 0.62, 0.16, 0.16],
    [0.35, 0.79, 0.02, 0.20, 0.50, 0.13, -0.48],
    [-0.36, 0.87, -0.03, 0.22, 0.54, 0.14, 0.46],
    [0.05, 1.04, 0.01, 0.23, 0.58, 0.15, -0.08],
    [0.23, 1.18, -0.01, 0.18, 0.46, 0.12, -0.28]
  ];
  const leaves = new THREE.InstancedMesh(unitSphere, materials.leaf, leafSpecs.length);
  leaves.name = `${prefix}LeavesInstanced`;
  leaves.castShadow = shadows;
  leaves.receiveShadow = shadows;
  const dummy = new THREE.Object3D();
  leafSpecs.forEach((leaf, index) => {
    dummy.position.set(
      center[0] + leaf[0] * leafScale,
      center[1] + potHeight + leaf[1] * leafScale,
      center[2] + leaf[2]
    );
    dummy.scale.set(leaf[3] * leafScale, leaf[4] * leafScale, leaf[5] * leafScale);
    dummy.rotation.set(0, index * 0.58, leaf[6]);
    dummy.updateMatrix();
    leaves.setMatrixAt(index, dummy.matrix);
  });
  leaves.instanceMatrix.needsUpdate = true;
  plant.add(leaves);

  // A few brighter leaves improve the silhouette without random placement.
  [1, 4, 6].forEach((sourceIndex, index) => {
    const leaf = leafSpecs[sourceIndex];
    addMesh(plant, `${prefix}HighlightLeaf-${index + 1}`, unitSphere, materials.leafLight,
      [center[0] + leaf[0] * leafScale, center[1] + potHeight + leaf[1] * leafScale, center[2] + 0.025],
      [leaf[3] * leafScale * 0.82, leaf[4] * leafScale * 0.82, leaf[5] * leafScale * 0.82],
      [0, index * 0.7, leaf[6]]);
  });

  return plant;
}

export default createCompositionDensityFill;
