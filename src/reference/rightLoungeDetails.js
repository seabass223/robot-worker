import * as THREE from 'three';

/**
 * Reference-density overlay for the existing right coding station and lounge.
 * Coordinates are room/world-local: +X right wall, -Z back wall, +Z foreground.
 * The factory deliberately adds identity props rather than duplicating core furniture.
 */
export function createRightLoungeDetails(options = {}) {
  const {
    position = [0, 0, 0],
    rotationY = 0,
    scale = 1,
    shadows = true,
    lights = true,
    cyan = 0x59e6ff,
    warm = 0xffa85c,
    red = 0xd54b3e
  } = options;

  const root = new THREE.Group();
  root.name = 'RightCodingLoungeReferenceDetails';
  root.position.fromArray(position);
  root.rotation.y = rotationY;
  root.scale.setScalar(scale);

  const groups = {};
  for (const name of [
    'CodingWallNarrative', 'CodingDeskEmbellishments', 'CyanStockedShelving',
    'LoungeForegroundAccents', 'BeverageCoffeeStation', 'PlantAndVentInfrastructure'
  ]) {
    groups[name] = new THREE.Group();
    groups[name].name = name;
    root.add(groups[name]);
  }

  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const plane = new THREE.PlaneGeometry(1, 1);
  const cyl8 = new THREE.CylinderGeometry(1, 1, 1, 8);
  const cyl12 = new THREE.CylinderGeometry(1, 1, 1, 12);
  const sphere12 = new THREE.SphereGeometry(1, 12, 8);
  const torus = new THREE.TorusGeometry(1, 0.13, 8, 24);

  const mat = {
    graphite: new THREE.MeshStandardMaterial({ color: 0x20252a, roughness: 0.44, metalness: 0.5, flatShading: true }),
    black: new THREE.MeshStandardMaterial({ color: 0x0d1115, roughness: 0.72, metalness: 0.22 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x59646b, roughness: 0.35, metalness: 0.78, flatShading: true }),
    wood: new THREE.MeshStandardMaterial({ color: 0x65412d, roughness: 0.68, metalness: 0.02 }),
    darkWood: new THREE.MeshStandardMaterial({ color: 0x372219, roughness: 0.74 }),
    cyan: new THREE.MeshStandardMaterial({ color: cyan, emissive: cyan, emissiveIntensity: 1.55, roughness: 0.24, toneMapped: false }),
    cyanDim: new THREE.MeshStandardMaterial({ color: 0x246276, emissive: 0x0b91b8, emissiveIntensity: 1.1, roughness: 0.4 }),
    red: new THREE.MeshStandardMaterial({ color: red, roughness: 0.56, metalness: 0.06, flatShading: true }),
    rust: new THREE.MeshStandardMaterial({ color: 0x994c34, roughness: 0.96, metalness: 0, flatShading: true }),
    fabric: new THREE.MeshStandardMaterial({ color: 0x333840, roughness: 0.98, flatShading: true }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc0903f, roughness: 0.34, metalness: 0.72, flatShading: true }),
    cream: new THREE.MeshStandardMaterial({ color: 0xe9dfca, roughness: 0.82 }),
    ceramic: new THREE.MeshStandardMaterial({ color: 0xe7e1d5, roughness: 0.65 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x79d9f1, transparent: true, opacity: 0.28, roughness: 0.12, metalness: 0.08, transmission: 0, depthWrite: false }),
    green: new THREE.MeshStandardMaterial({ color: 0x537d45, roughness: 0.84, flatShading: true }),
    greenLight: new THREE.MeshStandardMaterial({ color: 0x7fa35b, roughness: 0.78, flatShading: true }),
    soil: new THREE.MeshStandardMaterial({ color: 0x211713, roughness: 1 }),
    terracotta: new THREE.MeshStandardMaterial({ color: 0xb75e3d, roughness: 0.82, flatShading: true })
  };

  const addMesh = (geometry, material, parent, name, position3, scale3 = [1, 1, 1], rotation3 = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.fromArray(position3);
    mesh.scale.fromArray(scale3);
    mesh.rotation.set(...rotation3);
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    parent.add(mesh);
    return mesh;
  };
  const box = (parent, name, size, pos, material = mat.graphite, rot = [0, 0, 0]) =>
    addMesh(unitBox, material, parent, name, pos, size, rot);
  const cylinder = (parent, name, radius, height, pos, material = mat.metal, rot = [0, 0, 0], geometry = cyl12) =>
    addMesh(geometry, material, parent, name, pos, [radius, height, radius], rot);

  function canvasTexture(name, width, height, painter) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    painter(ctx, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.name = name;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }

  function framedCanvas(parent, name, width, height, position3, texture, rotation = [0, 0, 0], frame = 0.1) {
    const assembly = new THREE.Group();
    assembly.name = name;
    assembly.position.fromArray(position3);
    assembly.rotation.set(...rotation);
    parent.add(assembly);
    box(assembly, `${name}Backplate`, [width + frame * 2, height + frame * 2, 0.12], [0, 0, -0.045], mat.graphite);
    const face = addMesh(
      plane,
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
      assembly,
      `${name}CanvasSurface`,
      [0, 0, 0.025],
      [width, height, 1]
    );
    face.castShadow = false;
    return assembly;
  }

  // ---------------------------------------------------------------------------
  // Coding wall: right-wall planes face room-left after -90 degree yaw.
  // ---------------------------------------------------------------------------
  const wall = groups.CodingWallNarrative;
  const boardTexture = canvasTexture('todo-whiteboard-canvas', 720, 840, (ctx, w, h) => {
    ctx.fillStyle = '#ece9df'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(80,92,96,.16)'; ctx.lineWidth = 2;
    for (let y = 70; y < h; y += 92) { ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(w - 24, y); ctx.stroke(); }
    ctx.fillStyle = '#20282d'; ctx.font = '700 72px sans-serif'; ctx.fillText('TODO', 45, 92);
    ctx.font = '600 44px sans-serif';
    const tasks = ['Vision', 'Voice', 'Navigation'];
    tasks.forEach((task, i) => {
      const y = 182 + i * 92;
      ctx.strokeStyle = '#278c69'; ctx.lineWidth = 14; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(48, y - 13); ctx.lineTo(69, y + 12); ctx.lineTo(111, y - 35); ctx.stroke();
      ctx.fillStyle = '#263037'; ctx.fillText(task, 142, y + 9);
    });
    ctx.fillStyle = '#bd3e34'; ctx.font = '700 38px sans-serif'; ctx.fillText('CURRENT BUG', 45, 505);
    ctx.font = '600 31px sans-serif';
    ctx.fillText('robot keeps watering', 45, 560);
    ctx.fillText('the keyboard!', 45, 604);
    ctx.strokeStyle = '#bd3e34'; ctx.lineWidth = 9;
    ctx.strokeRect(488, 625, 142, 112);
    ctx.beginPath(); ctx.arc(530, 670, 10, 0, Math.PI * 2); ctx.arc(590, 670, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(525, 713); ctx.lineTo(595, 713); ctx.moveTo(557, 625); ctx.lineTo(557, 598); ctx.stroke();
    ctx.fillStyle = '#bd3e34'; ctx.font = '700 29px monospace'; ctx.fillText('NO H2O → KEYS', 43, 785);
  });
  const whiteboard = framedCanvas(wall, 'TodoWhiteboard', 1.36, 1.62, [6.91, 3.38, 1.0], boardTexture, [0, -Math.PI / 2, 0], 0.08);
  whiteboard.userData.content = { checked: ['Vision', 'Voice', 'Navigation'], bug: 'robot keeps watering the keyboard' };

  const statusTexture = canvasTexture('system-status-display-canvas', 1120, 360, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#06131b'); g.addColorStop(1, '#0b202b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#6be9ff'; ctx.font = '700 46px monospace'; ctx.fillText('SYSTEM STATUS', 38, 60);
    ctx.fillStyle = '#54bed1'; ctx.font = '700 22px monospace';
    const rows = [['VISION', 'ONLINE', 0.96], ['VOICE', 'ONLINE', 0.84], ['NAV', 'LOCKED', 0.91], ['WATERING', 'PATCHING', 0.42]];
    rows.forEach((r, i) => {
      const y = 115 + i * 53; ctx.fillText(r[0], 40, y); ctx.fillText(r[1], 230, y);
      ctx.fillStyle = '#133947'; ctx.fillRect(420, y - 19, 590, 19);
      ctx.fillStyle = i === 3 ? '#e04f43' : '#54dff3'; ctx.fillRect(420, y - 19, 590 * r[2], 19);
      ctx.fillStyle = '#54bed1'; ctx.fillText(`${Math.round(r[2] * 100)}%`, 1025, y);
    });
    ctx.strokeStyle = 'rgba(89,230,255,.18)';
    for (let x = 30; x < w; x += 42) { ctx.beginPath(); ctx.moveTo(x, 330); ctx.lineTo(x + 20, 330); ctx.stroke(); }
  });
  framedCanvas(wall, 'WideSystemStatusDisplay', 3.65, 1.18, [6.90, 4.55, -1.45], statusTexture, [0, -Math.PI / 2, 0], 0.1);

  const codeTexture = canvasTexture('cyan-code-panel-canvas', 680, 480, (ctx, w, h) => {
    ctx.fillStyle = '#061017'; ctx.fillRect(0, 0, w, h);
    ctx.font = '700 24px monospace'; ctx.fillStyle = '#40d7ef'; ctx.fillText('robot/navigation.ts', 22, 38);
    const colors = ['#598aa0', '#6ce6f7', '#d69b53', '#8ebc82'];
    for (let i = 0; i < 18; i++) {
      const y = 70 + i * 21; ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(25 + (i % 4) * 18, y, 105 + ((i * 47) % 390), 7);
    }
  });
  framedCanvas(wall, 'CyanCodePanel', 1.45, 1.02, [6.89, 2.18, -2.12], codeTexture, [0, -Math.PI / 2, 0], 0.07);

  const cityTexture = canvasTexture('rainy-city-panel-canvas', 680, 480, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#07111f'); sky.addColorStop(1, '#123142');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 13; i++) {
      const bw = 35 + (i % 4) * 12, bh = 95 + ((i * 71) % 245), x = i * 55;
      ctx.fillStyle = i % 2 ? '#0b1821' : '#101d27'; ctx.fillRect(x, h - bh, bw, bh);
      ctx.fillStyle = i % 5 ? '#31a6c0' : '#d37b48';
      for (let yy = h - bh + 20; yy < h - 10; yy += 30) for (let xx = x + 8; xx < x + bw - 5; xx += 16) if ((xx + yy + i) % 3) ctx.fillRect(xx, yy, 5, 9);
    }
    ctx.strokeStyle = 'rgba(105,215,255,.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 28; i++) { const x = (i * 83) % w; const y = (i * 151) % h; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 11, y + 28); ctx.stroke(); }
  });
  framedCanvas(wall, 'RainyCityTelemetryPanel', 1.45, 1.02, [6.885, 2.18, -0.48], cityTexture, [0, -Math.PI / 2, 0], 0.07);

  // ---------------------------------------------------------------------------
  // Existing desk embellishments: keyboard glow, headphones, mug, and PC face.
  // ---------------------------------------------------------------------------
  const desk = groups.CodingDeskEmbellishments;
  const keyboard = new THREE.Group(); keyboard.name = 'CyanKeyboardOverlay'; desk.add(keyboard);
  box(keyboard, 'KeyboardShadowBase', [0.53, 0.045, 1.08], [5.58, 1.43, -1.63], mat.black, [0, 0, 0.015]);
  let keyCount = 0;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) {
    const km = (r + c) % 6 === 0 ? mat.red : mat.cyan;
    box(keyboard, `CyanKey-${r + 1}-${c + 1}`, [0.08, 0.025, 0.073], [5.31 + r * 0.115, 1.465, -1.96 + c * 0.073], km);
    keyCount++;
  }

  const headphones = new THREE.Group(); headphones.name = 'DeskHeadphonesWithStand'; desk.add(headphones);
  cylinder(headphones, 'HeadphoneStandBase', 0.16, 0.035, [5.58, 1.45, -0.2], mat.graphite);
  cylinder(headphones, 'HeadphoneStandStem', 0.018, 0.46, [5.58, 1.69, -0.2], mat.metal);
  const band = addMesh(torus, mat.graphite, headphones, 'HeadphoneArch', [5.58, 1.88, -0.2], [0.16, 0.16, 0.16], [0, Math.PI / 2, 0]);
  band.geometry = new THREE.TorusGeometry(1, 0.13, 8, 24, Math.PI);
  for (const y of [1.79, 1.98]) box(headphones, `HeadphoneEarcup-${y}`, [0.055, 0.14, 0.11], [5.54, y, -0.2], mat.cyanDim);

  const mug = new THREE.Group(); mug.name = 'RustCodingMug'; desk.add(mug);
  cylinder(mug, 'MugBody', 0.075, 0.16, [5.55, 1.49, -0.72], mat.rust, [0, 0, 0], cyl12);
  const handle = addMesh(torus, mat.rust, mug, 'MugHandle', [5.55, 1.5, -0.62], [0.055, 0.055, 0.055], [0, Math.PI / 2, 0]);
  handle.geometry = new THREE.TorusGeometry(1, 0.22, 8, 18, Math.PI * 1.55);

  const tower = new THREE.Group(); tower.name = 'BlueFanPcTowerEmbellishment'; desk.add(tower);
  box(tower, 'PcTowerFrontGlass', [0.025, 0.7, 0.48], [5.89, 0.61, -0.12], mat.glass);
  for (let i = 0; i < 2; i++) {
    const fan = addMesh(torus, mat.cyan, tower, `PcBlueFanRing-${i + 1}`, [5.87, 0.45 + i * 0.31, -0.12], [0.13, 0.13, 0.13], [0, Math.PI / 2, 0]);
    const hub = cylinder(tower, `PcBlueFanHub-${i + 1}`, 0.035, 0.035, [5.855, 0.45 + i * 0.31, -0.12], mat.cyan, [0, 0, Math.PI / 2]);
    fan.castShadow = hub.castShadow = false;
  }
  box(tower, 'PcRedStatusBar', [0.02, 0.22, 0.025], [5.84, 0.62, 0.11], mat.red);

  // ---------------------------------------------------------------------------
  // Cyan-lit back-wall shelf stocked with readable trophy/camera/books/toys/CRT.
  // ---------------------------------------------------------------------------
  const shelves = groups.CyanStockedShelving;
  const shelfRoot = new THREE.Group(); shelfRoot.name = 'StockedCyanShelfUnit'; shelfRoot.position.set(4.65, 0, -6.83); shelves.add(shelfRoot);
  const levels = [2.2, 3.05, 3.9];
  for (let i = 0; i < levels.length; i++) {
    box(shelfRoot, `ShelfPlank-${i + 1}`, [3.1, 0.12, 0.45], [0, levels[i], 0.16], mat.darkWood);
    box(shelfRoot, `ShelfCyanStrip-${i + 1}`, [2.85, 0.025, 0.025], [0, levels[i] - 0.08, 0.405], mat.cyanDim);
  }
  for (const x of [-1.48, 1.48]) box(shelfRoot, `ShelfUpright-${x}`, [0.09, 2.05, 0.38], [x, 3.02, 0.08], mat.metal);

  const trophy = new THREE.Group(); trophy.name = 'ShelfBrassTrophy'; shelfRoot.add(trophy);
  cylinder(trophy, 'TrophyBase', 0.17, 0.08, [-1.05, 3.14, 0.2], mat.graphite);
  cylinder(trophy, 'TrophyStem', 0.035, 0.3, [-1.05, 3.34, 0.2], mat.brass);
  addMesh(sphere12, mat.brass, trophy, 'TrophyCup', [-1.05, 3.53, 0.2], [0.17, 0.13, 0.17]);
  for (const x of [-1.24, -0.86]) addMesh(torus, mat.brass, trophy, 'TrophyHandle', [x, 3.5, 0.2], [0.08, 0.08, 0.08], [0, Math.PI / 2, 0]);

  const camera = new THREE.Group(); camera.name = 'ShelfVintageCamera'; shelfRoot.add(camera);
  box(camera, 'CameraBody', [0.42, 0.27, 0.22], [-0.35, 3.24, 0.23], mat.black);
  cylinder(camera, 'CameraLens', 0.105, 0.12, [-0.35, 3.24, 0.39], mat.metal, [Math.PI / 2, 0, 0]);
  box(camera, 'CameraViewfinder', [0.14, 0.08, 0.1], [-0.46, 3.42, 0.22], mat.metal);

  const bookColors = [mat.red, mat.cyanDim, mat.cream, mat.green, mat.brass];
  for (let i = 0; i < 7; i++) box(shelfRoot, `ShelfBook-${i + 1}`, [0.17 + (i % 2) * 0.04, 0.42 + (i % 3) * 0.04, 0.28], [0.25 + i * 0.22, 3.31, 0.18], bookColors[i % bookColors.length], [0, 0, (i - 3) * 0.012]);

  const rubik = new THREE.Group(); rubik.name = 'ShelfRubikCube'; shelfRoot.add(rubik);
  const cubeColors = [0xe34538, 0x1ea4cc, 0xe1b637, 0xe8e2d6, 0x4e9b50, 0xd76b32].map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.65 }));
  for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) for (let z = 0; z < 3; z++) {
    box(rubik, `RubikCubie-${x}-${y}-${z}`, [0.085, 0.085, 0.085], [-1.18 + x * 0.09, 4.04 + y * 0.09, 0.13 + z * 0.09], cubeColors[(x + y + z) % cubeColors.length]);
  }

  const crt = new THREE.Group(); crt.name = 'ShelfVintageMonitor'; shelfRoot.add(crt);
  box(crt, 'VintageMonitorCase', [0.82, 0.58, 0.52], [-0.25, 4.18, 0.08], mat.cream);
  box(crt, 'VintageMonitorScreen', [0.6, 0.39, 0.02], [-0.25, 4.2, 0.35], mat.cyanDim);
  box(crt, 'VintageMonitorChin', [0.68, 0.1, 0.04], [-0.25, 3.91, 0.35], mat.graphite);
  cylinder(crt, 'VintageMonitorKnob', 0.035, 0.03, [0.04, 3.92, 0.38], mat.red, [Math.PI / 2, 0, 0]);
  if (lights) {
    const shelfGlow = new THREE.PointLight(cyan, 3.2, 2.4, 2); shelfGlow.name = 'ShelfCyanGlow'; shelfGlow.position.set(0, 3.25, 0.8); shelfRoot.add(shelfGlow);
  }

  // ---------------------------------------------------------------------------
  // Lounge overlays: no duplicate furniture; textiles, rug identity and props.
  // ---------------------------------------------------------------------------
  const lounge = groups.LoungeForegroundAccents;
  const rugTexture = canvasTexture('rust-patterned-rug-canvas', 1024, 640, (ctx, w, h) => {
    ctx.fillStyle = '#51281f'; ctx.fillRect(0, 0, w, h);
    const bands = [['#c0834e', 16], ['#252c32', 28], ['#9a4934', 42], ['#d09b60', 55]];
    bands.forEach(([color, inset]) => { ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2); });
    ctx.strokeStyle = '#b96a43'; ctx.lineWidth = 10;
    for (let x = 120; x < w - 80; x += 150) for (let y = 110; y < h - 70; y += 145) {
      ctx.beginPath(); ctx.moveTo(x, y - 35); ctx.lineTo(x + 40, y); ctx.lineTo(x, y + 35); ctx.lineTo(x - 40, y); ctx.closePath(); ctx.stroke();
      ctx.fillStyle = 'rgba(31,42,48,.55)'; ctx.fill();
    }
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 180; i++) { ctx.fillStyle = i % 2 ? '#f1c18a' : '#171c21'; ctx.fillRect((i * 73) % w, (i * 137) % h, 3, 3); }
  });
  const rugOverlay = addMesh(plane, new THREE.MeshStandardMaterial({ map: rugTexture, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }), lounge, 'PatternedRugOverlay', [4.0, 0.052, 3.85], [5.12, 3.5, 1], [-Math.PI / 2, 0, 0]);
  rugOverlay.receiveShadow = true;

  // Blanket is a chain of overlapping faceted panels, reading as a soft drape at room scale.
  const blanket = new THREE.Group(); blanket.name = 'RustThrowBlanket'; lounge.add(blanket);
  const blanketParts = [
    [[1.15, 0.07, 0.76], [5.42, 0.61, 5.72], [0.02, 0, -0.08]],
    [[1.12, 0.07, 0.55], [5.47, 0.45, 6.05], [0.28, 0, -0.08]],
    [[1.05, 0.06, 0.42], [5.51, 0.24, 6.23], [0.55, 0, -0.06]]
  ];
  blanketParts.forEach((entry, i) => box(blanket, `BlanketDrapePanel-${i + 1}`, entry[0], entry[1], mat.rust, entry[2]));
  for (let i = 0; i < 9; i++) box(blanket, `BlanketFringe-${i + 1}`, [0.025, 0.18, 0.025], [5.05 + i * 0.12, 0.14, 6.25], mat.rust, [0, 0, (i % 2 ? 1 : -1) * 0.1]);
  for (const [name, pos, color, angle] of [
    ['RustLoungePillow', [3.3, 0.84, 5.73], mat.rust, -0.2],
    ['SlateLoungePillow', [4.65, 0.83, 5.72], mat.fabric, 0.16]
  ]) box(lounge, name, [0.62, 0.48, 0.2], pos, color, [0, 0, angle]);

  // Coffee-table props sit on the existing top around world (5.2, .7, 3.4).
  const tableProps = new THREE.Group(); tableProps.name = 'CoffeeTableStoryProps'; lounge.add(tableProps);
  cylinder(tableProps, 'CoffeeTableMugA', 0.07, 0.14, [4.7, 0.72, 3.22], mat.ceramic);
  cylinder(tableProps, 'CoffeeTableMugB', 0.065, 0.13, [4.92, 0.71, 3.32], mat.rust);
  box(tableProps, 'CoffeeTableRemote', [0.12, 0.035, 0.34], [5.35, 0.69, 3.24], mat.black, [0, 0.18, 0]);
  box(tableProps, 'CoffeeTableRobotMagazine', [0.62, 0.035, 0.42], [5.72, 0.7, 3.55], mat.red, [0, -0.13, 0]);
  for (let i = 0; i < 4; i++) box(tableProps, `MagazineCyanTitleBar-${i + 1}`, [0.28 - i * 0.035, 0.008, 0.035], [5.72, 0.723, 3.43 + i * 0.07], mat.cyan);

  // Guitar and amp form one wall-side lounge identity cluster.
  const music = new THREE.Group(); music.name = 'LoungeGuitarAndAmp'; lounge.add(music);
  box(music, 'GuitarAmpCabinet', [0.62, 0.72, 0.44], [6.55, 0.38, 2.05], mat.black);
  box(music, 'GuitarAmpGrille', [0.5, 0.47, 0.02], [6.27, 0.35, 2.05], mat.graphite);
  for (let i = 0; i < 4; i++) cylinder(music, `AmpKnob-${i + 1}`, 0.022, 0.025, [6.25, 0.64, 1.9 + i * 0.1], i === 0 ? mat.red : mat.brass, [0, 0, Math.PI / 2]);
  const guitar = new THREE.Group(); guitar.name = 'RustElectricGuitar'; guitar.position.set(6.42, 0.1, 1.05); guitar.rotation.z = -0.1; music.add(guitar);
  addMesh(sphere12, mat.rust, guitar, 'GuitarLowerBout', [0, 0.48, 0], [0.26, 0.34, 0.11]);
  addMesh(sphere12, mat.rust, guitar, 'GuitarUpperBout', [0, 0.76, 0], [0.2, 0.25, 0.1]);
  box(guitar, 'GuitarNeck', [0.08, 1.0, 0.08], [0, 1.28, 0], mat.darkWood);
  box(guitar, 'GuitarHeadstock', [0.14, 0.28, 0.09], [0.02, 1.87, 0], mat.rust, [0, 0, 0.1]);
  for (let i = 0; i < 3; i++) box(guitar, `GuitarString-${i + 1}`, [0.006, 1.15, 0.006], [-0.02 + i * 0.02, 1.25, 0.061], mat.metal);
  box(guitar, 'GuitarStand', [0.45, 0.06, 0.35], [0, 0.02, 0], mat.graphite);

  const beanbag = new THREE.Group(); beanbag.name = 'CharcoalBeanbag'; lounge.add(beanbag);
  addMesh(sphere12, mat.fabric, beanbag, 'BeanbagVolume', [5.78, 0.38, 4.95], [0.62, 0.42, 0.62]);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    box(beanbag, `BeanbagFold-${i + 1}`, [0.018, 0.34, 0.018], [5.78 + Math.cos(a) * 0.25, 0.52, 4.95 + Math.sin(a) * 0.25], mat.black, [0, -a, Math.sin(a) * 0.28]);
  }

  // ---------------------------------------------------------------------------
  // Lower-right drinks / coffee: compact, blue-lit and tucked inside room bounds.
  // ---------------------------------------------------------------------------
  const beverage = groups.BeverageCoffeeStation;
  const fridge = new THREE.Group(); fridge.name = 'BlueLitBeverageFridge'; fridge.position.set(6.33, 0, 4.05); beverage.add(fridge);
  box(fridge, 'FridgeCabinet', [0.95, 1.15, 0.72], [0, 0.59, 0], mat.black);
  box(fridge, 'FridgeDoorFrame', [0.05, 0.96, 0.62], [-0.5, 0.58, 0], mat.graphite);
  box(fridge, 'FridgeGlassDoor', [0.025, 0.82, 0.54], [-0.53, 0.58, 0], mat.glass);
  for (const y of [0.35, 0.62, 0.88]) box(fridge, `FridgeShelf-${y}`, [0.02, 0.025, 0.52], [-0.5, y, 0], mat.cyanDim);
  let beverageCount = 0;
  for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
    cylinder(fridge, `BeverageCan-${row + 1}-${col + 1}`, 0.045, 0.16, [-0.57, 0.25 + row * 0.27, -0.2 + col * 0.13], (row + col) % 4 === 0 ? mat.red : (col % 2 ? mat.cyanDim : mat.ceramic));
    beverageCount++;
  }
  box(fridge, 'FridgeBlueEdgeLight', [0.025, 0.88, 0.025], [-0.57, 0.59, 0.28], mat.cyan);
  if (lights) { const glow = new THREE.PointLight(cyan, 3.8, 2.2, 2); glow.name = 'FridgeBlueInteriorLight'; glow.position.set(-0.72, 0.62, 0); fridge.add(glow); }

  const coffee = new THREE.Group(); coffee.name = 'CoffeeStationProps'; fridge.add(coffee);
  box(coffee, 'CoffeeMachineBody', [0.44, 0.5, 0.42], [0.05, 1.46, -0.1], mat.graphite);
  box(coffee, 'CoffeeMachineFace', [0.035, 0.3, 0.28], [-0.185, 1.46, -0.1], mat.black);
  cylinder(coffee, 'CoffeeMachineDial', 0.045, 0.025, [-0.215, 1.58, -0.1], mat.cyan, [0, 0, Math.PI / 2]);
  cylinder(coffee, 'CoffeeSpout', 0.022, 0.16, [-0.25, 1.38, -0.1], mat.metal, [0, 0, Math.PI / 2]);
  for (let i = 0; i < 2; i++) cylinder(coffee, `CoffeeCup-${i + 1}`, 0.065, 0.13, [-0.02, 1.25, 0.19 + i * 0.16], i ? mat.rust : mat.ceramic);
  cylinder(coffee, 'CoffeeBeanCanister', 0.09, 0.25, [0.18, 1.28, 0.18], mat.brass);

  // ---------------------------------------------------------------------------
  // Tall plant and right-wall vent pipe finish the foreground silhouette.
  // ---------------------------------------------------------------------------
  const infra = groups.PlantAndVentInfrastructure;
  const plant = new THREE.Group(); plant.name = 'TallRightWallPlant'; plant.position.set(6.35, 0, 5.55); infra.add(plant);
  cylinder(plant, 'TallPlantPot', 0.34, 0.5, [0, 0.25, 0], mat.terracotta, [0, 0, 0], cyl8);
  cylinder(plant, 'TallPlantSoil', 0.29, 0.025, [0, 0.51, 0], mat.soil, [0, 0, 0], cyl12);
  const leafSpecs = [
    [0, 1.45, 0, 0.16, 1.25, 0.16, 0], [-0.25, 1.28, 0.04, 0.18, 1.05, 0.15, 0.22],
    [0.24, 1.18, -0.04, 0.17, 0.98, 0.14, -0.2], [-0.13, 1.02, 0.22, 0.16, 0.86, 0.14, 0.38],
    [0.17, 0.97, 0.2, 0.17, 0.8, 0.13, -0.34], [-0.32, 0.9, -0.12, 0.14, 0.75, 0.12, 0.48],
    [0.34, 0.84, -0.08, 0.14, 0.72, 0.12, -0.48], [0, 1.0, -0.26, 0.16, 0.92, 0.13, 0.1]
  ];
  leafSpecs.forEach((s, i) => addMesh(sphere12, i % 2 ? mat.greenLight : mat.green, plant, `TallPlantLeaf-${i + 1}`, [s[0], s[1], s[2]], [s[3], s[4], s[5]], [0, s[6], s[6] * 0.5]));

  const pipe = new THREE.Group(); pipe.name = 'RightWallVentPipe'; infra.add(pipe);
  cylinder(pipe, 'VentPipeVertical', 0.14, 3.2, [6.78, 2.05, 3.0], mat.metal, [0, 0, 0], cyl12);
  cylinder(pipe, 'VentPipeLowerCollar', 0.19, 0.12, [6.78, 0.58, 3.0], mat.graphite);
  cylinder(pipe, 'VentPipeUpperCollar', 0.19, 0.12, [6.78, 3.54, 3.0], mat.graphite);
  const elbow = addMesh(torus, mat.metal, pipe, 'VentPipeCeilingElbow', [6.61, 3.62, 3.0], [0.14, 0.14, 0.14], [Math.PI / 2, 0, Math.PI / 2]);
  elbow.geometry = new THREE.TorusGeometry(1, 0.55, 8, 20, Math.PI / 2);
  cylinder(pipe, 'VentPipeHorizontal', 0.14, 0.72, [6.35, 3.76, 3.0], mat.metal, [0, 0, Math.PI / 2], cyl12);
  for (let i = 0; i < 5; i++) box(pipe, `VentGrilleSlat-${i + 1}`, [0.04, 0.3, 0.055], [5.96, 3.76, 2.82 + i * 0.09], mat.black);

  if (lights) {
    const warmAccent = new THREE.PointLight(warm, 2.2, 2.8, 2); warmAccent.name = 'CoffeeStationWarmAccent'; warmAccent.position.set(5.95, 2.0, 4.2); beverage.add(warmAccent);
  }

  // Uniform semantic/runtime contract for integration and QA.
  let meshCount = 0;
  let lightCount = 0;
  root.traverse(child => {
    if (child.isMesh) meshCount++;
    if (child.isLight) lightCount++;
  });
  const textureNames = [boardTexture, statusTexture, codeTexture, cityTexture, rugTexture].map(texture => texture.name);
  root.userData.referenceRuntime = {
    model: 'cozy-workshop-right-coding-lounge-details-v1',
    purpose: 'identity-and-density-overlay-no-main-furniture',
    coordinateSystem: 'room-world-local:+x-right-wall,-z-back-wall,+z-foreground',
    meshCount,
    lightCount,
    canvasTextures: { count: textureNames.length, names: textureNames },
    semanticGroups: root.children.map(child => child.name),
    counts: {
      checkedTodoItems: 3,
      wallDisplays: 3,
      keyboardKeys: keyCount,
      pcCoolingFans: 2,
      shelfLevels: levels.length,
      shelfBooks: 7,
      rubikCubies: 27,
      loungePillows: 2,
      blanketPanels: blanketParts.length,
      coffeeTableProps: 8,
      beanbags: 1,
      guitars: 1,
      amplifiers: 1,
      beverageCans: beverageCount,
      tallPlantLeaves: leafSpecs.length,
      ventSegments: 3
    },
    features: {
      todoWhiteboard: true,
      robotWateringKeyboardBug: true,
      systemStatusDisplay: true,
      codePanel: true,
      cityPanel: true,
      headphones: true,
      mug: true,
      blueFanPcTower: true,
      trophy: true,
      camera: true,
      rubikCube: true,
      vintageMonitor: true,
      patternedRugOverlay: true,
      rustThrowBlanket: true,
      coffeeStation: true,
      blueLitFridge: true
    },
    anchors: {
      whiteboard: { x: 6.91, y: 3.38, z: 1.0, facing: 'room-left' },
      systemStatus: { x: 6.9, y: 4.55, z: -1.45, facing: 'room-left' },
      deskSurface: { x: 5.58, y: 1.43, z: -1.2 },
      stockedShelving: { x: 4.65, y: 3.05, z: -6.83, facing: 'room-front' },
      loungeRug: { x: 4.0, y: 0.052, z: 3.85 },
      coffeeTableProps: { x: 5.2, y: 0.7, z: 3.4 },
      guitarAmp: { x: 6.45, y: 0, z: 1.55 },
      beanbag: { x: 5.78, y: 0, z: 4.95 },
      beverageStation: { x: 6.33, y: 0, z: 4.05 },
      tallPlant: { x: 6.35, y: 0, z: 5.55 },
      ventPipe: { x: 6.78, y: 2.05, z: 3.0 }
    },
    options: { shadows, lights, cyan, warm, red }
  };

  return root;
}

export default createRightLoungeDetails;
