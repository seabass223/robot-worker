import { test, expect } from '@playwright/test';

test('articulated red robot runs walk, work, and couch-sit animation states', async ({ page, request }) => {
  test.slow();
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);

  const robot = await page.evaluate(() => window.__ROOM__.snapshot().robot);
  expect(robot.name).toBe('RedBipedRobot');
  expect(robot.articulated).toBeTruthy();
  expect(robot.parts).toBeGreaterThanOrEqual(25);
  expect(robot.joints).toEqual(expect.arrayContaining(['neck', 'leftShoulder', 'rightShoulder', 'leftHip', 'rightHip', 'leftKnee', 'rightKnee']));
  expect(robot.animation).toBe('idle');
  expect(robot.hasScreenFace).toBeTruthy();
  expect(robot.hasAntenna).toBeTruthy();
  expect(robot.hasClaws).toBeTruthy();
  expect(robot.locomotionEasing).toBe('linear-distance-synchronized');
  expect(robot.walkSpeed).toBe(3.1);
  expect(robot.strideDistance).toBeGreaterThan(0);
  expect(robot.headAspectRatio).toBeLessThan(1.65);
  expect(robot.armReach).toBeLessThan(0.5);
  expect(robot.legReach).toBeLessThan(0.58);

  await page.evaluate(() => window.__ROOM__.moveTo(2.4, 0));
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().robot.statesPlayed.includes('walk')), { timeout: 8000 }).toBeTruthy();
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().phase), { timeout: 8000 }).toBe('idle');
  const walked = await page.evaluate(() => window.__ROOM__.snapshot().robot);
  expect(walked.statesPlayed).toContain('walk');
  expect(walked.hipSwingAmplitude).toBeGreaterThan(0.5);

  await request.post('http://127.0.0.1:8001/event', { data: { phase: 'implement' } });
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().phase), { timeout: 12000 }).toBe('network-working');
  const work = await page.evaluate(() => window.__ROOM__.snapshot().robot);
  expect(work.animation).toBe('work');
  expect(Math.abs(work.leftShoulderAngle)).toBeGreaterThan(0.1);
  await expect(page.locator('#work-progress')).toBeHidden();

  await request.post('http://127.0.0.1:8001/event', { data: { phase: 'done' } });
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().robot.sitProgress), { timeout: 12000 }).toBeGreaterThan(0.99);
  const seatedState = await page.evaluate(() => window.__ROOM__.snapshot());
  const seated = seatedState.robot;
  expect(seated.animation).toBe('sit');
  expect(seated.leftHipAngle).toBeLessThan(-0.9);
  expect(seated.leftKneeAngle).toBeGreaterThan(1.1);
  expect(Math.abs(Math.abs(seatedState.yaw) - Math.PI)).toBeLessThan(0.08);
  expect(seated.bodyOffsetZ).toBeLessThan(-0.55);

  const seatedPosition = seatedState.position;
  const transitionStart = await page.evaluate(() => {
    window.__ROOM__.moveTo(0, 0);
    return window.__ROOM__.snapshot();
  });
  expect(transitionStart.phase).toBe('standing');
  expect(transitionStart.robot.statesPlayed).toContain('stand');
  expect(transitionStart.position.x).toBeCloseTo(seatedPosition.x, 3);
  expect(transitionStart.position.z).toBeCloseTo(seatedPosition.z, 3);
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().phase), { timeout: 8000 }).toBe('moving');
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().phase), { timeout: 12000 }).toBe('idle');
  const afterLeavingCouch = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(afterLeavingCouch.robot.animation).toBe('idle');
  expect(afterLeavingCouch.position.x).toBeCloseTo(0, 1);
  expect(afterLeavingCouch.position.z).toBeCloseTo(0, 1);
});

test('clicking the couch runs the done routine at the static calibrated speed', async ({ page }) => {
  test.slow();
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);

  await expect(page.locator('#robot-speed')).toHaveCount(0);
  expect(await page.evaluate(() => window.__ROOM__.snapshot().robot.walkSpeed)).toBe(3.1);

  const couchPoint = await page.evaluate(() => window.__ROOM__.couchScreen());
  await page.mouse.click(couchPoint.x, couchPoint.y);
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().couchHits)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().network.lastPhase)).toBe('done');
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().robot.sitProgress), { timeout: 12000 }).toBeGreaterThan(0.99);
  const seated = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(seated.status).toBe('DONE');
  expect(seated.robot.animation).toBe('sit');
  expect(Math.abs(Math.abs(seated.yaw) - Math.PI)).toBeLessThan(0.08);
});

test('performance HUD reports live vertex and frame-rate counts', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().performance.fps), { timeout: 15000 }).toBeGreaterThan(0);
  const performance = await page.evaluate(() => window.__ROOM__.snapshot().performance);
  expect(performance.vertices).toBeGreaterThan(1000);
  expect(performance.fps).toBeGreaterThan(0);
  await expect(page.locator('#vertex-count')).toContainText(performance.vertices.toLocaleString('en-US'));
  const displayedFps = Number((await page.locator('#fps-count').textContent()).match(/\d+/)?.[0]);
  expect(displayedFps).toBeGreaterThan(0);
});

test('procedural surface textures are applied to the room', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);
  const textures = await page.evaluate(() => window.__ROOM__.snapshot().textures);
  expect(textures.floor.style).toBe('panel-wood');
  expect(textures.floor.map).toBeTruthy();
  expect(textures.floor.bumpMap).toBeTruthy();
  expect(textures.floor.repeat).toEqual([2, 4]);
  expect(textures.walls.style).toBe('cinderblock');
  expect(textures.walls.map).toBeTruthy();
  expect(textures.walls.bumpMap).toBeTruthy();
  expect(textures.walls.repeat).toEqual([4, 2]);
});

test('left-wall stairwell reaches an elevated door', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);
  const architecture = await page.evaluate(() => window.__ROOM__.snapshot().architecture);
  expect(architecture.staircase.steps).toBeGreaterThanOrEqual(10);
  expect(architecture.staircase.topElevation).toBeGreaterThan(2.5);
  expect(architecture.staircase.hasLanding).toBeTruthy();
  expect(architecture.staircase.landingDepth).toBeLessThanOrEqual(0.7);
  expect(architecture.staircase.hasExtraPlatform).toBeFalsy();
  expect(architecture.staircase.hasRail).toBeTruthy();
  expect(architecture.staircase.corner).toBe('front-left');
  expect(architecture.staircase.orientation).toBe('straight-front-wall');
  expect(architecture.staircase.wallSide).toBe('front');
  expect(architecture.staircase.wallClearance).toBeLessThan(0.15);
  expect(architecture.staircase.bottom.x).toBeGreaterThan(-3);
  expect(architecture.staircase.bottom.z).toBeCloseTo(architecture.staircase.top.z, 1);
  expect(architecture.staircase.top.x).toBeLessThan(-5.5);
  expect(architecture.staircase.top.z).toBeGreaterThan(5.5);
  expect(architecture.staircase.railingSide).toBe('open-room-facing');
  expect(architecture.door.elevated).toBeTruthy();
  expect(architecture.door.wall).toBe('left');
  expect(architecture.door.color).toBe('red');
  expect(architecture.door.position.z).toBeGreaterThan(5.2);
  expect(architecture.door.bottom).toBeCloseTo(architecture.staircase.topElevation, 1);
  const workbench = await page.evaluate(() => window.__ROOM__.snapshot().workbench);
  expect(Math.abs(workbench.z)).toBeLessThan(2);
});

test('clicking the elevated door alternates feet on every tread going up and down', async ({ page }) => {
  test.slow();
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);

  const doorPoint = await page.evaluate(() => window.__ROOM__.doorScreen());
  await page.mouse.click(doorPoint.x, doorPoint.y);

  await expect.poll(
    () => page.evaluate(() => window.__ROOM__.snapshot().stairClimb.doorHits),
    { timeout: 4000 }
  ).toBe(1);
  await expect.poll(
    () => page.evaluate(() => window.__ROOM__.snapshot().stairClimb.completed),
    { timeout: 25000 }
  ).toBeTruthy();

  const state = await page.evaluate(() => window.__ROOM__.snapshot());
  const climb = state.stairClimb;
  expect(climb.statesPlayed).toEqual(expect.arrayContaining(['approach', 'stair-climb', 'upper-landing']));
  expect(climb.plants).toHaveLength(state.architecture.staircase.steps);
  expect(climb.plants.map(plant => plant.step)).toEqual(
    Array.from({ length: state.architecture.staircase.steps }, (_, index) => index + 1)
  );
  expect(climb.plants.map(plant => plant.foot)).toEqual(
    Array.from({ length: state.architecture.staircase.steps }, (_, index) => index % 2 === 0 ? 'left' : 'right')
  );
  for (const plant of climb.plants) {
    expect(plant.targetY).toBeCloseTo(plant.treadTop, 3);
    expect(plant.contactError).toBeLessThan(0.08);
  }
  expect(state.position.y).toBeGreaterThan(state.architecture.staircase.topElevation);
  expect(state.phase).toBe('door-idle');
  expect(climb.stepDuration).toBeLessThan(0.56);

  const returnDoorPoint = await page.evaluate(() => window.__ROOM__.doorScreen());
  await page.mouse.click(returnDoorPoint.x, returnDoorPoint.y);
  await expect.poll(
    () => page.evaluate(() => window.__ROOM__.snapshot().stairClimb.doorHits),
    { timeout: 4000 }
  ).toBe(2);
  await expect.poll(
    () => page.evaluate(() => window.__ROOM__.snapshot().stairClimb.descentCompleted),
    { timeout: 25000 }
  ).toBeTruthy();

  const returned = await page.evaluate(() => window.__ROOM__.snapshot());
  const descent = returned.stairClimb;
  expect(descent.statesPlayed).toEqual(expect.arrayContaining(['stair-descend', 'floor-return']));
  expect(descent.descentPlants).toHaveLength(returned.architecture.staircase.steps);
  expect(descent.descentPlants.map(plant => plant.step)).toEqual(
    Array.from({ length: returned.architecture.staircase.steps }, (_, index) => returned.architecture.staircase.steps - index)
  );
  expect(descent.descentPlants.map(plant => plant.foot)).toEqual(
    Array.from({ length: returned.architecture.staircase.steps }, (_, index) => index % 2 === 0 ? 'right' : 'left')
  );
  for (const plant of descent.descentPlants) {
    expect(plant.targetY).toBeCloseTo(plant.treadTop, 3);
    expect(plant.contactError).toBeLessThan(0.08);
  }
  expect(descent.descentProfiles).toHaveLength(returned.architecture.staircase.steps);
  expect(descent.descentProfiles.map(profile => profile.step)).toEqual(
    Array.from({ length: returned.architecture.staircase.steps }, (_, index) => returned.architecture.staircase.steps - index)
  );
  for (const profile of descent.descentProfiles.slice(1)) {
    expect(profile.verticalDrop).toBeCloseTo(0.27, 2);
    expect(profile.startHoldDrift).toBeLessThan(0.01);
    expect(profile.endHoldDrift).toBeLessThan(0.01);
    expect(profile.dropStartsAt).toBeGreaterThanOrEqual(0.5);
    expect(profile.dropEndsAt).toBeLessThanOrEqual(0.82);
  }
  expect(returned.position.y).toBeCloseTo(0, 3);
  expect(returned.phase).toBe('idle');
  expect(errors).toEqual([]);
});

test('back-wall utility display includes shelves, instruments, books, and powered panel', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);
  const utilities = await page.evaluate(() => window.__ROOM__.snapshot().architecture.backWallUtilities);
  expect(utilities.shelves).toBe(3);
  expect(utilities.tools).toBeGreaterThanOrEqual(3);
  expect(utilities.books).toBeGreaterThanOrEqual(5);
  expect(utilities.hasOscilloscope).toBeTruthy();
  expect(utilities.hasElectricalPanel).toBeTruthy();
  expect(utilities.hasVoltageSymbol).toBeTruthy();
  expect(utilities.conduitTop).toBeGreaterThan(6.7);
});

test('oscilloscope uses an animated CanvasTexture sine-wave display', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);

  const first = await page.evaluate(() => window.__ROOM__.snapshot().screens?.oscilloscope);
  expect(first).toMatchObject({
    type: 'CanvasTexture',
    animated: true,
    mode: 'sine',
    width: 384,
    height: 240
  });
  expect(first.updates).toBeGreaterThan(0);

  await expect.poll(
    () => page.evaluate(() => window.__ROOM__.snapshot().screens.oscilloscope.updates),
    { timeout: 8000 }
  ).toBeGreaterThan(first.updates);
  const second = await page.evaluate(() => window.__ROOM__.snapshot().screens.oscilloscope);
  expect(second.phase).not.toBe(first.phase);
});

test('review station monitor shows a restrained glowing graph display', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);

  const first = await page.evaluate(() => window.__ROOM__.snapshot().screens?.reviewMonitor);
  expect(first).toMatchObject({
    type: 'CanvasTexture',
    animated: true,
    mode: 'generic-graph',
    glowing: true,
    width: 448,
    height: 252
  });
  expect(first.updates).toBeGreaterThan(0);

  await expect.poll(
    () => page.evaluate(() => window.__ROOM__.snapshot().screens.reviewMonitor.updates),
    { timeout: 8000 }
  ).toBeGreaterThan(first.updates);
  const second = await page.evaluate(() => window.__ROOM__.snapshot().screens.reviewMonitor);
  expect(second.cursor).not.toBe(first.cursor);
});

test('door pipework rises from floor to ceiling and crosses above the door', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);
  const pipes = await page.evaluate(() => window.__ROOM__.snapshot().architecture.doorPipes);
  expect(pipes.count).toBe(3);
  expect(pipes.side).toBe('right-of-door');
  expect(pipes.behindStairwell).toBeTruthy();
  expect(pipes.bottom).toBeLessThanOrEqual(0.15);
  expect(pipes.top).toBeGreaterThanOrEqual(6.5);
  expect(pipes.turnsAtCeiling).toBeTruthy();
  expect(pipes.runsOverDoor).toBeTruthy();
});

test('front-right lounge matches the sectional furniture reference', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);
  const lounge = await page.evaluate(() => window.__ROOM__.snapshot().architecture.lounge);
  expect(lounge.corner).toBe('front-right');
  expect(lounge.position.x).toBeGreaterThan(2);
  expect(lounge.position.z).toBeGreaterThan(3);
  expect(lounge.chaiseSide).toBe('left');
  expect(lounge.seatCushions).toBe(3);
  expect(lounge.hasCoffeeTable).toBeTruthy();
  expect(lounge.hasRug).toBeTruthy();
  expect(lounge.plants).toBe(2);
  expect(lounge.magazines).toBeGreaterThanOrEqual(2);
  expect(lounge.clearOfDesk).toBeTruthy();
});

test('planning bench uses the framed pegboard workshop model', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);

  const bench = await page.evaluate(() => window.__ROOM__.snapshot().architecture.planningBench);
  expect(bench).toMatchObject({
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
  });
  expect(bench.colliderPreserved).toBeTruthy();
});

test('desk and coffee table use the faceted terracotta five-leaf plant model', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);

  const plants = await page.evaluate(() => window.__ROOM__.snapshot().architecture.plants);
  expect(plants.model).toBe('faceted-terracotta-five-leaf');
  expect(plants.desk).toMatchObject({ count: 1, leafCount: 5, potSides: 8 });
  expect(plants.coffeeTable).toMatchObject({ count: 2, leafCount: 5, potSides: 8 });
  expect(plants.total).toBe(3);
  expect(plants.volumetricLeaves).toBeTruthy();
  expect(plants.flatShaded).toBeTruthy();
});

test('network event API validates the phase contract and routes all ten room phases', async ({ page, request }) => {
  test.slow();
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().network.connection), { timeout: 8000 }).toBe('open');

  const invalid = await request.post('http://127.0.0.1:8001/event', { data: { phase: 'unknown' } });
  expect(invalid.status()).toBe(422);

  const routes = [
    ['read', 'workbench', -4.88, -1.5],
    ['prepare', 'workbench', -4.88, -1.5],
    ['spec', 'workbench', -4.88, -1.5],
    ['implement', 'desk', 4.88, -1.3],
    ['validate', 'testbench', 1.6, -4.82],
    ['review', 'testbench', 1.6, -4.82],
    ['submit', 'testbench', 1.6, -4.82],
    ['sync', 'testbench', 1.6, -4.82],
    ['waiting', 'couch', 4.0, 4.95],
    ['done', 'couch', 4.0, 4.95]
  ];

  for (const [phase, destination, x, z] of routes) {
    const response = await request.post('http://127.0.0.1:8001/event', { data: { phase } });
    expect(response.status()).toBe(202);
    const receipt = await response.json();
    expect(receipt.accepted).toBeTruthy();
    expect(receipt.event.phase).toBe(phase);
    await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().network.lastPhase)).toBe(phase);
    const state = await page.evaluate(() => window.__ROOM__.snapshot());
    expect(state.network.destination).toBe(destination);
    expect(state.target.x).toBeCloseTo(x, 2);
    expect(state.target.z).toBeCloseTo(z, 2);
  }

  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().phase), { timeout: 12000 }).toBe('idle');
  const final = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(final.position.x).toBeCloseTo(4.0, 1);
  expect(final.position.z).toBeCloseTo(4.95, 1);
  expect(final.status).toBe('DONE');
});

test('network bench arrival keeps the cube working without a progress meter', async ({ page, request }) => {
  test.slow();
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().network.connection), { timeout: 8000 }).toBe('open');

  const response = await request.post('http://127.0.0.1:8001/event', { data: { phase: 'read' } });
  expect(response.status()).toBe(202);
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().phase), { timeout: 12000 }).toBe('network-working');
  await expect(page.locator('#work-progress')).toBeHidden();

  await expect.poll(
    () => page.evaluate(() => window.__ROOM__.snapshot().robot.animation),
    { timeout: 4000 }
  ).toBe('work');
  const working = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(working.cubePoseY).toBeGreaterThan(0.02);
  expect(working.network.destination).toBe('workbench');
  expect(working.network.workAnimation).toBeTruthy();
  expect(working.status).toBe('READ');

  await request.post('http://127.0.0.1:8001/event', { data: { phase: 'done' } });
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().status), { timeout: 12000 }).toBe('DONE');
});

test('raycasts floor, rotates first, and reaches clicked target', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);

  const initial = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(initial.phase).toBe('idle');

  const phaseAfterStart = await page.evaluate(() => {
    window.__ROOM__.moveTo(3, -1.5);
    return window.__ROOM__.snapshot().phase;
  });
  expect(phaseAfterStart).toBe('turning');

  const duringTurn = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(Math.hypot(duringTurn.position.x - initial.position.x, duringTurn.position.z - initial.position.z)).toBeLessThan(0.08);

  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().phase), { timeout: 8000 }).toBe('idle');
  const final = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(final.position.x).toBeCloseTo(3, 1);
  expect(final.position.z).toBeCloseTo(-1.5, 1);
  expect(final.status).toBe('READY');
  expect(errors).toEqual([]);
});

test('canvas pointer click produces a valid floor target', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);
  const canvas = page.locator('#scene');
  const box = await canvas.boundingBox();
  await page.mouse.click(box.x + box.width * 0.52, box.y + box.height * 0.72);
  await expect.poll(() => page.evaluate(() => {
    const target = window.__ROOM__.snapshot().target;
    return Math.hypot(target.x, target.z);
  })).toBeGreaterThan(0.1);
  const state = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(Number.isFinite(state.target.x)).toBeTruthy();
  expect(Number.isFinite(state.target.z)).toBeTruthy();
});

test('clicking the workbench completes work and automatically returns home', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);
  await page.evaluate(() => window.__ROOM__.setWorkDuration(6));

  const point = await page.evaluate(() => window.__ROOM__.workbenchScreen());
  await page.mouse.click(point.x, point.y);

  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().workbenchHits)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().phase), { timeout: 8000 }).toBe('working');
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().workProgress), { timeout: 5000 }).toBeGreaterThan(0);
  await expect(page.locator('#work-progress')).toBeVisible();

  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().phase), { timeout: 10000 }).toBe('idle');
  const final = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(final.workProgress).toBe(100);
  expect(final.position.x).toBeCloseTo(0, 1);
  expect(final.position.z).toBeCloseTo(0, 1);
  expect(final.status).toBe('READY');
  await expect(page.locator('#work-progress')).toBeHidden();
  expect(errors).toEqual([]);
});

test('clicking the computer desk runs a desk task and returns the cube home', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);
  await page.evaluate(() => window.__ROOM__.setWorkDuration(6));

  const point = await page.evaluate(() => window.__ROOM__.deskScreen());
  await page.mouse.click(point.x, point.y);

  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().deskHits)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().phase), { timeout: 8000 }).toBe('working');
  const active = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(active.activeStation).toBe('desk');
  await expect(page.locator('#work-label')).toHaveText('DESK TASK');
  await expect(page.locator('#work-progress')).toBeVisible();

  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().phase), { timeout: 10000 }).toBe('idle');
  const final = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(final.workProgress).toBe(100);
  expect(final.position.x).toBeCloseTo(0, 1);
  expect(final.position.z).toBeCloseTo(0, 1);
  expect(final.status).toBe('READY');
  await expect(page.locator('#work-progress')).toBeHidden();
  expect(errors).toEqual([]);
});

test('clicking the test bench runs analysis and returns the cube home', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);
  await page.evaluate(() => window.__ROOM__.setWorkDuration(6));

  const point = await page.evaluate(() => window.__ROOM__.testBenchScreen());
  await page.mouse.click(point.x, point.y);

  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().testBenchHits)).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().phase), { timeout: 8000 }).toBe('working');
  const active = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(active.activeStation).toBe('testbench');
  await expect(page.locator('#work-label')).toHaveText('TEST BENCH TASK');
  await expect(page.locator('#work-progress')).toBeVisible();

  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().phase), { timeout: 10000 }).toBe('idle');
  const final = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(final.workProgress).toBe(100);
  expect(final.position.x).toBeCloseTo(0, 1);
  expect(final.position.z).toBeCloseTo(0, 1);
  expect(final.status).toBe('READY');
  await expect(page.locator('#work-progress')).toBeHidden();
  expect(errors).toEqual([]);
});
