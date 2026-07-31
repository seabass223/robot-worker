import * as THREE from 'three';

const DEG = Math.PI / 180;

function material(color, roughness = 0.7, metalness = 0.05, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true, ...extra });
}

function addBox(parent, name, size, position, mat, castShadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = castShadow;
  parent.add(mesh);
  return mesh;
}

function addRod(parent, name, start, end, radius, mat, segments = 8) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), segments), mat);
  mesh.name = name;
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function canvasTexture(width, height, draw, name) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  draw(context, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = name;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function addFrontPlane(parent, name, width, height, position, map, emissive = 0x000000, intensity = 0) {
  const mat = new THREE.MeshStandardMaterial({
    map,
    emissive,
    emissiveMap: intensity > 0 ? map : null,
    emissiveIntensity: intensity,
    roughness: 0.54,
    metalness: 0.04,
    side: THREE.FrontSide,
    toneMapped: true
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  plane.name = name;
  plane.position.set(...position);
  plane.rotation.y = Math.PI / 2;
  parent.add(plane);
  return plane;
}

function makeSignTexture() {
  return canvasTexture(420, 620, (ctx, width, height) => {
    ctx.fillStyle = '#071419';
    ctx.fillRect(0, 0, width, height);
    const glow = ctx.createLinearGradient(0, 0, width, height);
    glow.addColorStop(0, 'rgba(0,255,255,.16)');
    glow.addColorStop(0.55, 'rgba(0,112,138,.02)');
    glow.addColorStop(1, 'rgba(0,255,255,.12)');
    ctx.fillStyle = glow;
    ctx.fillRect(14, 14, width - 28, height - 28);
    ctx.strokeStyle = '#41e7f4';
    ctx.lineWidth = 9;
    ctx.strokeRect(18, 18, width - 36, height - 36);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 72px Arial Narrow, Arial, sans-serif';
    ctx.shadowColor = '#00eaff';
    ctx.shadowBlur = 20;
    ['BUILD', 'DEBUG', 'DEPLOY', 'REPEAT'].forEach((line, index) => {
      ctx.fillStyle = index === 3 ? '#ffffff' : '#70f6ff';
      ctx.fillText(line, width / 2, 115 + index * 130);
    });
  }, 'BuildDebugDeployRepeatTexture');
}

function makeWaveformTexture() {
  return canvasTexture(640, 360, (ctx, width, height) => {
    ctx.fillStyle = '#031311';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(27,121,105,.28)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y <= height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    ctx.strokeStyle = '#87ffe3';
    ctx.shadowColor = '#00ffc8';
    ctx.shadowBlur = 14;
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let x = 0; x <= width; x += 4) {
      const pulse = ((x + 16) % 160 > 112 && (x + 16) % 160 < 126) ? -72 : 0;
      const y = height * 0.54 + Math.sin(x * 0.036) * 28 + Math.sin(x * 0.012) * 18 + pulse;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#46bca8';
    ctx.font = '700 24px monospace';
    ctx.fillText('CH1  2.00V     1.00ms', 24, 34);
    ctx.fillText('TRIG AUTO', 450, 332);
  }, 'OscilloscopeWaveformTexture');
}

function makeDangerTexture() {
  return canvasTexture(512, 512, (ctx, width, height) => {
    ctx.fillStyle = '#151616';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#f3bf22';
    ctx.beginPath();
    ctx.moveTo(width / 2, 48); ctx.lineTo(452, 392); ctx.lineTo(60, 392); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#161616';
    ctx.beginPath();
    ctx.moveTo(286, 115); ctx.lineTo(203, 252); ctx.lineTo(258, 252);
    ctx.lineTo(220, 350); ctx.lineTo(329, 216); ctx.lineTo(270, 216); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4c52a';
    ctx.fillRect(52, 414, 408, 72);
    ctx.fillStyle = '#161616';
    ctx.font = '900 55px Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('DANGER', width / 2, 451);
  }, 'DangerElectricalTexture');
}

function makeBlueprintTexture() {
  return canvasTexture(700, 1024, (ctx, width, height) => {
    ctx.fillStyle = '#073153';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(85,190,238,.16)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = 0; y < height; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    ctx.strokeStyle = '#8ce6ff';
    ctx.fillStyle = '#8ce6ff';
    ctx.lineWidth = 5;
    ctx.font = '700 44px monospace';
    ctx.fillText('RX-42 // SERVICE ROBOT', 34, 64);
    ctx.font = '20px monospace';
    ctx.fillText('ASSEMBLY / ACTUATOR ROUTING', 36, 94);
    const line = (x1, y1, x2, y2, w = 5) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    ctx.strokeRect(72, 136, 390, 690);
    ctx.beginPath(); ctx.arc(268, 248, 72, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeRect(184, 324, 168, 230);
    line(184, 360, 104, 518, 12); line(352, 360, 432, 518, 12);
    line(222, 554, 186, 744, 15); line(314, 554, 350, 744, 15);
    ctx.strokeRect(210, 205, 116, 78);
    ctx.beginPath(); ctx.arc(244, 240, 10, 0, Math.PI * 2); ctx.arc(292, 240, 10, 0, Math.PI * 2); ctx.stroke();
    for (const [x, y, label] of [[506, 190, 'VISION'], [506, 348, 'CORE'], [506, 512, 'ARM-A'], [506, 684, 'DRIVE']]) {
      line(430, y + 12, x - 12, y + 12, 2);
      ctx.strokeRect(x, y, 142, 64);
      ctx.font = '18px monospace'; ctx.fillText(label, x + 10, y + 39);
    }
    ctx.font = '17px monospace';
    ctx.fillText('TORQUE  42.7 Nm', 72, 886);
    ctx.fillText('BUS     CAN-FD', 72, 916);
    ctx.fillText('REV     07-C', 72, 946);
    ctx.strokeRect(470, 858, 164, 100);
    line(486, 934, 616, 878, 2); line(486, 884, 616, 934, 2);
  }, 'RobotBlueprintTexture');
}

function createPegboard(parent, mats, counts) {
  const group = new THREE.Group();
  group.name = 'DensePegboardToolWall';
  parent.add(group);
  addBox(group, 'PegboardRecessedPanel', [0.07, 1.62, 3.26], [-0.62, 2.26, 0], mats.pegboard);
  addBox(group, 'PegboardTopFrame', [0.12, 0.12, 3.46], [-0.57, 3.11, 0], mats.blackMetal);
  addBox(group, 'PegboardBottomFrame', [0.12, 0.12, 3.46], [-0.57, 1.41, 0], mats.blackMetal);
  addBox(group, 'PegboardLeftFrame', [0.12, 1.82, 0.12], [-0.57, 2.26, 1.69], mats.blackMetal);
  addBox(group, 'PegboardRightFrame', [0.12, 1.82, 0.12], [-0.57, 2.26, -1.69], mats.blackMetal);

  const holeGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.018, 6);
  holeGeometry.rotateZ(Math.PI / 2);
  const holes = new THREE.InstancedMesh(holeGeometry, mats.recess, 112);
  holes.name = 'PegboardHolesInstanced';
  const dummy = new THREE.Object3D();
  let holeIndex = 0;
  for (let row = 0; row < 7; row += 1) {
    for (let column = 0; column < 16; column += 1) {
      dummy.position.set(-0.578, 1.57 + row * 0.23, 1.45 - column * 0.193);
      dummy.updateMatrix(); holes.setMatrixAt(holeIndex++, dummy.matrix);
    }
  }
  holes.instanceMatrix.needsUpdate = true;
  group.add(holes);
  counts.pegHoles = holeIndex;

  const tools = new THREE.Group();
  tools.name = 'ReadableToolSilhouettes';
  group.add(tools);
  const toolSpecs = [
    ['LongNosePliers', 2.56, 1.26, 0.46, 0xff5638, 'pliers'],
    ['DiagonalCutters', 2.22, 1.02, 0.38, 0xf6bd37, 'pliers'],
    ['BlueScrewdriver', 2.67, 0.69, 0.47, 0x329ac4, 'driver'],
    ['RedScrewdriver', 2.18, 0.49, 0.43, 0xd54432, 'driver'],
    ['AmberScrewdriver', 2.57, 0.20, 0.5, 0xef9f28, 'driver'],
    ['CombinationWrenchA', 2.13, -0.13, 0.55, 0xadb6b9, 'wrench'],
    ['CombinationWrenchB', 2.68, -0.40, 0.62, 0x7f8c92, 'wrench'],
    ['BallPeenHammer', 2.25, -0.78, 0.65, 0xe85f3c, 'hammer'],
    ['UtilityKnife', 2.68, -1.12, 0.44, 0xe4b43a, 'knife'],
    ['AdjustableWrench', 2.12, -1.36, 0.56, 0x9da9ae, 'wrench']
  ];
  for (const [name, y, z, length, color, type] of toolSpecs) {
    const pivot = new THREE.Group();
    pivot.name = name;
    pivot.position.set(-0.50, y, z);
    tools.add(pivot);
    const handleMat = material(color, 0.56, 0.12);
    if (type === 'pliers') {
      addRod(pivot, `${name}HandleA`, [0, -length * 0.42, -0.045], [0, 0.02, 0], 0.035, handleMat, 7);
      addRod(pivot, `${name}HandleB`, [0, -length * 0.42, 0.045], [0, 0.02, 0], 0.035, handleMat, 7);
      addRod(pivot, `${name}JawA`, [0, 0.01, 0], [0, length * 0.38, -0.035], 0.018, mats.toolSteel, 6);
      addRod(pivot, `${name}JawB`, [0, 0.01, 0], [0, length * 0.38, 0.035], 0.018, mats.toolSteel, 6);
    } else if (type === 'driver') {
      addRod(pivot, `${name}Shaft`, [0, 0.04, 0], [0, length * 0.48, 0], 0.018, mats.toolSteel, 7);
      addRod(pivot, `${name}Handle`, [0, -length * 0.48, 0], [0, 0.04, 0], 0.045, handleMat, 8);
    } else {
      addRod(pivot, `${name}Body`, [0, -length * 0.46, 0], [0, length * 0.46, 0], type === 'hammer' ? 0.035 : 0.026, type === 'knife' ? handleMat : mats.toolSteel, 7);
      if (type === 'hammer') addBox(pivot, `${name}Head`, [0.07, 0.13, 0.28], [0, length * 0.47, 0], mats.toolSteel);
      if (type === 'wrench') {
        const jaw = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.022, 6, 10, Math.PI * 1.55), mats.toolSteel);
        jaw.name = `${name}OpenJaw`; jaw.position.y = length * 0.49; jaw.rotation.x = Math.PI / 2; pivot.add(jaw);
      }
    }
  }
  counts.toolSilhouettes = toolSpecs.length;
  return group;
}

function createShelf(parent, mats, counts) {
  const group = new THREE.Group();
  group.name = 'StockedUpperShelfAndPlant';
  parent.add(group);
  addBox(group, 'UpperShelfPlank', [0.48, 0.16, 4.35], [-0.44, 3.43, -0.12], mats.wood);
  addBox(group, 'UpperShelfRearLip', [0.12, 0.35, 4.35], [-0.67, 3.60, -0.12], mats.blackMetal);
  for (const z of [-1.82, 0, 1.55]) addBox(group, 'UpperShelfBracket', [0.42, 0.44, 0.07], [-0.42, 3.25, z], mats.blackMetal);
  const stock = [
    ['GreenEquipmentCase', [0.38, 0.42, 0.68], [-0.38, 3.72, 1.55], mats.caseGreen],
    ['TanPartsBox', [0.34, 0.30, 0.54], [-0.39, 3.66, 0.85], mats.cardboard],
    ['OrangeCoilBox', [0.38, 0.28, 0.64], [-0.38, 3.65, 0.18], mats.orange],
    ['GraphiteToolCase', [0.40, 0.36, 0.72], [-0.38, 3.69, -0.57], mats.blackMetal],
    ['BlueInstrumentCase', [0.36, 0.32, 0.55], [-0.38, 3.67, -1.35], mats.blueCase]
  ];
  for (const spec of stock) addBox(group, ...spec);
  counts.shelfStock = stock.length;

  const plant = new THREE.Group();
  plant.name = 'SmallTrailingShelfPlant';
  plant.position.set(-0.29, 3.58, -1.92);
  group.add(plant);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.27, 8), mats.terracotta);
  pot.name = 'PlantPot'; pot.position.y = 0.10; plant.add(pot);
  const vineSpecs = [[-0.04, -0.58, 0.04], [0.03, -0.82, -0.05], [0, -1.02, 0.11]];
  let leafCount = 0;
  vineSpecs.forEach(([x, drop, z], vineIndex) => {
    addRod(plant, `TrailingVine${vineIndex + 1}`, [x, 0.17, z], [x + 0.05, drop, z + 0.05], 0.012, mats.vine, 6);
    for (let i = 0; i < 4; i += 1) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.085, 6, 4), mats.leaf);
      leaf.name = `PlantLeaf${++leafCount}`;
      leaf.scale.set(1.35, 0.65, 0.36);
      leaf.position.set(x + (i % 2 ? 0.08 : -0.08), 0.02 + (drop - 0.02) * (i + 1) / 4, z + 0.04 * i);
      leaf.rotation.z = (i % 2 ? -1 : 1) * 25 * DEG;
      leaf.castShadow = true;
      plant.add(leaf);
    }
  });
  counts.plantLeaves = leafCount;
  return group;
}

function createUnderShelfLights(parent, mats, lightsEnabled, counts) {
  const group = new THREE.Group();
  group.name = 'UnderShelfWarmBulbs';
  parent.add(group);
  const bulbGeometry = new THREE.SphereGeometry(0.065, 10, 6);
  const bulbMaterial = new THREE.MeshStandardMaterial({ color: 0xffca83, emissive: 0xff7b26, emissiveIntensity: 3.6, roughness: 0.28 });
  const bulbCount = 7;
  const bulbs = new THREE.InstancedMesh(bulbGeometry, bulbMaterial, bulbCount);
  bulbs.name = 'WarmBulbsInstanced';
  const dummy = new THREE.Object3D();
  for (let i = 0; i < bulbCount; i += 1) {
    dummy.position.set(-0.16, 3.29, 1.65 - i * 0.56);
    dummy.updateMatrix(); bulbs.setMatrixAt(i, dummy.matrix);
  }
  bulbs.instanceMatrix.needsUpdate = true;
  group.add(bulbs);
  addBox(group, 'UnderShelfLightRail', [0.10, 0.08, 3.75], [-0.25, 3.30, -0.02], mats.blackMetal);
  if (lightsEnabled) {
    for (const z of [1.12, 0, -1.12]) {
      const light = new THREE.PointLight(0xffa44d, 0.72, 2.0, 2);
      light.name = 'UnderShelfWarmPractical';
      light.position.set(0.03, 3.20, z);
      group.add(light);
    }
  }
  counts.warmBulbs = bulbCount;
  counts.pointLights += lightsEnabled ? 3 : 0;
}

function createOscilloscope(parent, mats) {
  const group = new THREE.Group();
  group.name = 'CompactOscilloscope';
  group.position.set(0.13, 1.64, -1.18);
  parent.add(group);
  addBox(group, 'OscilloscopeBody', [0.52, 0.55, 0.86], [0, 0, 0], mats.instrument);
  addBox(group, 'OscilloscopeBezel', [0.055, 0.40, 0.67], [0.287, 0.04, -0.04], mats.blackMetal);
  addFrontPlane(group, 'LiveWaveformScreen', 0.57, 0.27, [0.318, 0.08, -0.04], makeWaveformTexture(), 0x44ffd2, 1.45);
  const knobGeometry = new THREE.CylinderGeometry(0.045, 0.045, 0.035, 10);
  knobGeometry.rotateZ(Math.PI / 2);
  for (let i = 0; i < 4; i += 1) {
    const knob = new THREE.Mesh(knobGeometry, i === 0 ? mats.orange : mats.knob);
    knob.name = `OscilloscopeControl${i + 1}`;
    knob.position.set(0.319, -0.19, -0.24 + i * 0.16);
    knob.castShadow = true;
    group.add(knob);
  }
  return group;
}

function createCabinetAndSign(parent, mats, lightsEnabled, counts) {
  const infrastructure = new THREE.Group();
  infrastructure.name = 'ElectricalCabinetAndCyanSign';
  parent.add(infrastructure);
  const cabinet = new THREE.Group();
  cabinet.name = 'TallDangerElectricalCabinet';
  infrastructure.add(cabinet);
  addBox(cabinet, 'CabinetBody', [0.42, 2.30, 1.10], [-0.66, 3.30, 2.43], mats.cabinet);
  addBox(cabinet, 'CabinetDoor', [0.08, 2.06, 0.94], [-0.42, 3.30, 2.43], mats.blackMetal);
  addBox(cabinet, 'CabinetHingeTop', [0.10, 0.18, 0.08], [-0.35, 3.86, 2.86], mats.toolSteel);
  addBox(cabinet, 'CabinetHingeBottom', [0.10, 0.18, 0.08], [-0.35, 2.72, 2.86], mats.toolSteel);
  addFrontPlane(cabinet, 'DangerElectricalWarning', 0.66, 0.66, [-0.355, 3.45, 2.43], makeDangerTexture(), 0x5e3300, 0.18);
  const statusGeometry = new THREE.BoxGeometry(0.06, 0.09, 0.15);
  const status = new THREE.InstancedMesh(statusGeometry, mats.amberGlow, 3);
  status.name = 'CabinetAmberIndicatorsInstanced';
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 3; i += 1) {
    dummy.position.set(-0.34, 4.24, 2.20 + i * 0.23); dummy.updateMatrix(); status.setMatrixAt(i, dummy.matrix);
  }
  status.instanceMatrix.needsUpdate = true;
  cabinet.add(status);
  for (let i = 0; i < 4; i += 1) addBox(cabinet, `CabinetVent${i + 1}`, [0.07, 0.025, 0.52], [-0.34, 2.48 + i * 0.075, 2.43], mats.recess);

  const sign = new THREE.Group();
  sign.name = 'BuildDebugDeployRepeatCyanSign';
  infrastructure.add(sign);
  addBox(sign, 'CyanSignHousing', [0.16, 1.60, 1.04], [-0.65, 3.45, 1.28], mats.blackMetal);
  addFrontPlane(sign, 'CyanSignFace', 0.90, 1.42, [-0.552, 3.45, 1.28], makeSignTexture(), 0x00dceb, 2.25);
  if (lightsEnabled) {
    const cyanLight = new THREE.PointLight(0x18d9ff, 2.2, 3.2, 2);
    cyanLight.name = 'CyanSignPracticalLight';
    cyanLight.position.set(0.08, 3.45, 1.28);
    sign.add(cyanLight);
    counts.pointLights += 1;
  }
  counts.electricalIndicators = 3;
  return infrastructure;
}

function createBlueprint(parent, mats) {
  const group = new THREE.Group();
  group.name = 'BlueprintRobotSchematicPanel';
  parent.add(group);
  addBox(group, 'BlueprintPanelFrame', [0.11, 2.32, 1.52], [-0.62, 3.18, -2.36], mats.blueprintFrame);
  addFrontPlane(group, 'RobotSchematicCanvas', 1.34, 2.12, [-0.552, 3.18, -2.36], makeBlueprintTexture(), 0x1687bb, 0.34);
  return group;
}

function createConduitAndTray(parent, mats, counts) {
  const group = new THREE.Group();
  group.name = 'ConduitPipesAndOverheadCableTray';
  parent.add(group);
  const pipeSpecs = [
    { z: 2.78, x: -0.71, radius: 0.045, mat: mats.copper, top: 5.83 },
    { z: 2.98, x: -0.72, radius: 0.04, mat: mats.pipeSteel, top: 6.00 },
    { z: 3.16, x: -0.73, radius: 0.038, mat: mats.agedBrass, top: 6.16 }
  ];
  pipeSpecs.forEach((spec, index) => {
    addRod(group, `CabinetConduitVertical${index + 1}`, [spec.x, 4.36, spec.z], [spec.x, spec.top, spec.z], spec.radius, spec.mat);
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(spec.x, spec.top, spec.z),
      new THREE.Vector3(spec.x, spec.top + 0.18, spec.z - 0.18),
      new THREE.Vector3(spec.x, spec.top, spec.z - 0.36)
    );
    const elbow = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, spec.radius, 7, false), spec.mat);
    elbow.name = `CabinetConduitElbow${index + 1}`; elbow.castShadow = true; group.add(elbow);
    addRod(group, `CabinetConduitHorizontal${index + 1}`, [spec.x, spec.top, spec.z - 0.36], [spec.x, spec.top, -2.78], spec.radius, spec.mat);
  });
  counts.conduitRuns = pipeSpecs.length;

  const tray = new THREE.Group();
  tray.name = 'OverheadLadderCableTray';
  group.add(tray);
  addRod(tray, 'CableTrayFrontRail', [-0.52, 5.78, -3.10], [-0.52, 5.78, 3.26], 0.045, mats.blackMetal);
  addRod(tray, 'CableTrayRearRail', [-0.88, 5.78, -3.10], [-0.88, 5.78, 3.26], 0.045, mats.blackMetal);
  for (let i = 0; i < 15; i += 1) {
    addRod(tray, `CableTrayRung${i + 1}`, [-0.88, 5.78, -3.02 + i * 0.43], [-0.52, 5.78, -3.02 + i * 0.43], 0.027, mats.blackMetal, 6);
  }
  counts.cableTrayRungs = 15;
  const cableSpecs = [
    { x: -0.60, y: 5.84, color: mats.cableOrange, wave: 0.035 },
    { x: -0.67, y: 5.87, color: mats.cablePurple, wave: -0.045 },
    { x: -0.74, y: 5.85, color: mats.cableBlue, wave: 0.025 },
    { x: -0.80, y: 5.88, color: mats.cableDark, wave: -0.02 }
  ];
  cableSpecs.forEach((spec, index) => {
    const points = [];
    for (let i = 0; i <= 12; i += 1) {
      const t = i / 12;
      points.push(new THREE.Vector3(spec.x + Math.sin(t * Math.PI * 3) * spec.wave, spec.y, -3.02 + t * 6.12));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.025, 6, false), spec.color);
    cable.name = `BundledCable${index + 1}`; cable.castShadow = true; tray.add(cable);
  });
  counts.bundledCables = cableSpecs.length;
  return group;
}

function createLampAndHoist(parent, mats, lightsEnabled, counts) {
  const group = new THREE.Group();
  group.name = 'HangingTaskLampAndOrangeHoist';
  parent.add(group);
  const lamp = new THREE.Group();
  lamp.name = 'HangingWarmTaskLamp';
  group.add(lamp);
  addRod(lamp, 'TaskLampCord', [-0.26, 5.82, -1.42], [-0.26, 4.44, -1.42], 0.018, mats.cableDark, 6);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.34, 0.24, 12, 1, true), mats.blackMetal);
  shade.name = 'TaskLampShade'; shade.position.set(-0.26, 4.34, -1.42); shade.castShadow = true; lamp.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 7), mats.warmGlow);
  bulb.name = 'TaskLampWarmBulb'; bulb.position.set(-0.26, 4.20, -1.42); lamp.add(bulb);
  if (lightsEnabled) {
    const light = new THREE.SpotLight(0xffa34f, 4.4, 5.2, 34 * DEG, 0.55, 1.6);
    light.name = 'WarmTaskSpotlight'; light.position.set(-0.20, 4.16, -1.42); light.target.position.set(0.25, 1.32, -0.72);
    lamp.add(light, light.target); counts.pointLights += 1;
  }

  const hoist = new THREE.Group();
  hoist.name = 'OrangeHoistHookAssembly';
  group.add(hoist);
  addBox(hoist, 'HoistMotorHousing', [0.52, 0.42, 0.72], [-0.42, 5.52, -2.95], mats.orange);
  addRod(hoist, 'HoistDropChain', [-0.41, 5.31, -2.95], [-0.41, 4.56, -2.95], 0.025, mats.chain, 7);
  for (let i = 0; i < 7; i += 1) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.014, 5, 10), mats.chain);
    link.name = `HoistChainLink${i + 1}`;
    link.position.set(-0.41, 5.22 - i * 0.105, -2.95);
    link.rotation.y = i % 2 ? Math.PI / 2 : 0;
    hoist.add(link);
  }
  const hookShape = new THREE.Shape();
  hookShape.moveTo(0.00, 0.34);
  hookShape.bezierCurveTo(-0.02, 0.05, -0.04, -0.30, 0.22, -0.42);
  hookShape.bezierCurveTo(0.48, -0.52, 0.62, -0.25, 0.50, -0.04);
  hookShape.lineTo(0.37, -0.14);
  hookShape.bezierCurveTo(0.42, -0.25, 0.34, -0.33, 0.24, -0.29);
  hookShape.bezierCurveTo(0.10, -0.22, 0.13, 0.08, 0.16, 0.34);
  hookShape.closePath();
  const hook = new THREE.Mesh(new THREE.ExtrudeGeometry(hookShape, { depth: 0.10, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2 }), mats.orange);
  hook.name = 'HeavyOrangeJHook';
  hook.scale.setScalar(0.64);
  hook.position.set(-0.47, 4.42, -3.03);
  hook.rotation.y = Math.PI / 2;
  hook.castShadow = true;
  hoist.add(hook);
  counts.hoistChainLinks = 7;
}

/**
 * Creates the reference-derived left workshop / infrastructure dressing.
 *
 * Local convention: +Y is up, +X points away from the wall into the room,
 * and Z runs along the wall. The origin matches the existing Workbench root
 * in main.js, so the intended integration is:
 *   const details = createLeftWorkshopDetails();
 *   workbench.add(details);
 * or add to the scene with position: [-6.18, 0, -1.5].
 */
export function createLeftWorkshopDetails(options = {}) {
  const {
    position = [0, 0, 0],
    rotationY = 0,
    scale = 1,
    lights = true,
    shadows = true,
    name = 'LeftWorkshopInfrastructureDetails'
  } = options;

  const root = new THREE.Group();
  root.name = name;
  root.position.set(...position);
  root.rotation.y = rotationY;
  root.scale.setScalar(scale);

  const mats = {
    blackMetal: material(0x171b1d, 0.48, 0.62),
    cabinet: material(0x0e1113, 0.40, 0.72),
    pegboard: material(0x6f4b2c, 0.84, 0.01),
    recess: material(0x171411, 0.94, 0.02),
    toolSteel: material(0x9aa4a8, 0.32, 0.82),
    wood: material(0x70452d, 0.66, 0.02),
    caseGreen: material(0x596452, 0.74, 0.18),
    cardboard: material(0x8c6843, 0.90, 0.01),
    orange: material(0xe76c25, 0.48, 0.34),
    blueCase: material(0x3c5c70, 0.68, 0.22),
    terracotta: material(0xa85435, 0.82, 0.01),
    vine: material(0x355d32, 0.92, 0.01),
    leaf: material(0x5f8a45, 0.80, 0.01),
    instrument: material(0x283033, 0.55, 0.46),
    knob: material(0x858d8e, 0.52, 0.56),
    blueprintFrame: material(0x5d452d, 0.48, 0.62),
    copper: material(0x9a5b39, 0.34, 0.78),
    pipeSteel: material(0x65747a, 0.40, 0.76),
    agedBrass: material(0x827348, 0.44, 0.70),
    cableOrange: material(0xd5632b, 0.52, 0.18),
    cablePurple: material(0x6c3d88, 0.48, 0.24),
    cableBlue: material(0x245783, 0.52, 0.22),
    cableDark: material(0x17191d, 0.64, 0.18),
    chain: material(0x44494b, 0.30, 0.86),
    amberGlow: material(0xffb13f, 0.35, 0.16, { emissive: 0xff6c19, emissiveIntensity: 2.3 }),
    warmGlow: material(0xffd2a1, 0.22, 0.02, { emissive: 0xff8b35, emissiveIntensity: 3.5 })
  };

  const counts = {
    pegHoles: 0,
    toolSilhouettes: 0,
    warmBulbs: 0,
    electricalIndicators: 0,
    conduitRuns: 0,
    cableTrayRungs: 0,
    bundledCables: 0,
    shelfStock: 0,
    plantLeaves: 0,
    hoistChainLinks: 0,
    pointLights: 0
  };

  createPegboard(root, mats, counts);
  createShelf(root, mats, counts);
  createUnderShelfLights(root, mats, lights, counts);
  createOscilloscope(root, mats);
  createCabinetAndSign(root, mats, lights, counts);
  createBlueprint(root, mats);
  createConduitAndTray(root, mats, counts);
  createLampAndHoist(root, mats, lights, counts);

  root.traverse((child) => {
    if (child.isMesh || child.isInstancedMesh) {
      child.castShadow = shadows;
      child.receiveShadow = shadows;
    }
  });

  root.userData.referenceRuntime = {
    model: 'left-workshop-infrastructure-reference-v1',
    localConvention: '+Y up, +X roomward, Z along wall',
    intendedScenePosition: [-6.18, 0, -1.5],
    counts: { ...counts },
    anchors: {
      workbenchOrigin: [0, 0, 0],
      pegboardCenter: [-0.62, 2.26, 0],
      upperShelfCenter: [-0.44, 3.43, -0.12],
      oscilloscope: [0.13, 1.64, -1.18],
      electricalCabinet: [-0.66, 3.30, 2.43],
      cyanSign: [-0.65, 3.45, 1.28],
      blueprintPanel: [-0.62, 3.18, -2.36],
      cableTrayCenter: [-0.70, 5.78, 0.08],
      taskLampBulb: [-0.26, 4.20, -1.42],
      hoistHook: [-0.47, 4.42, -3.03]
    },
    features: [
      'dense-pegboard-tools',
      'under-shelf-warm-bulbs',
      'oscilloscope-waveform',
      'build-debug-deploy-repeat-sign',
      'danger-electrical-cabinet',
      'conduit-and-pipes',
      'overhead-colored-cable-tray',
      'robot-blueprint-panel',
      'stocked-upper-shelf',
      'trailing-plant',
      'warm-task-lamp',
      'orange-hoist-hook'
    ]
  };

  return root;
}

export default createLeftWorkshopDetails;
