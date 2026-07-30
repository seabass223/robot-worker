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

test('editorial instruction overlay is removed while the room canvas and live HUD remain', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);

  await expect(page.locator('.instructions')).toHaveCount(0);
  await expect(page.getByText('INTERACTIVE STUDY / 01')).toHaveCount(0);
  await expect(page.getByText('Point.')).toHaveCount(0);
  await expect(page.getByText('Turn.')).toHaveCount(0);
  await expect(page.getByText('Move.')).toHaveCount(0);
  await expect(page.getByText('MOVE · WORK · SIT · CLIMB')).toHaveCount(0);
  await expect(page.locator('#scene')).toHaveCount(1);
  await expect(page.locator('.topbar')).toHaveCount(1);
  await expect(page.locator('.performance-stats')).toHaveCount(1);
  await expect(page.locator('.coordinates')).toHaveCount(1);
});

test('performance HUD reports live vertex, frame-rate, and draw-call counts', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().performance.fps), { timeout: 15000 }).toBeGreaterThan(0);
  const performance = await page.evaluate(() => window.__ROOM__.snapshot().performance);
  expect(performance.vertices).toBeGreaterThan(1000);
  expect(performance.fps).toBeGreaterThan(0);
  expect(performance.drawCalls).toBeGreaterThan(0);
  await expect(page.locator('#vertex-count')).toContainText(performance.vertices.toLocaleString('en-US'));
  const displayedFps = Number((await page.locator('#fps-count').textContent()).match(/\d+/)?.[0]);
  expect(displayedFps).toBeGreaterThan(0);
  await expect(page.locator('#draw-call-count')).toHaveText(`${performance.drawCalls.toLocaleString('en-US')} CALLS`);
});

test('static room uses baked AO materials while only the robot casts a dynamic shadow', async ({ page }) => {
  test.slow();
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);

  const initial = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(initial.lighting.mode).toBe('ao-baked-static');
  expect(initial.lighting.bakedAoTexture).toBeTruthy();
  expect(initial.lighting.staticMeshesBaked).toBeGreaterThan(100);
  expect(initial.lighting.staticAoMaterials).toBeGreaterThan(10);
  expect(initial.lighting.decorativeDynamicLights).toBe(0);
  expect(initial.lighting.dynamicShadowLights).toBe(1);
  expect(initial.lighting.staticShadowCasters).toBe(0);
  expect(initial.lighting.robotShadowCasters).toBeGreaterThan(20);
  expect(initial.lighting.shadowReceiverMaterial).toBe('ShadowMaterial');
  expect(initial.lighting.projectedShadowTexture).toContain('robot-directional-shadow');
  expect(initial.lighting.robotLightLayer).not.toBe(initial.lighting.staticLayer);
  expect(initial.lighting.shadowMapEnabled).toBeTruthy();

  const before = initial.lighting.shadowProjection;
  await page.evaluate(() => window.__ROOM__.moveTo(2.4, 0));
  await expect.poll(
    () => page.evaluate(() => window.__ROOM__.snapshot().phase),
    { timeout: 15000 }
  ).toBe('idle');
  const after = await page.evaluate(() => window.__ROOM__.snapshot().lighting.shadowProjection);
  expect(Math.abs(after.x - before.x)).toBeGreaterThan(1.5);
  expect(Math.abs(after.z - before.z)).toBeLessThan(0.2);
});

test('multi-material plant leaves use consolidated groups without losing semantic plant models', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);
  await page.waitForTimeout(300);

  const result = await page.evaluate(() => ({
    snapshot: window.__ROOM__.snapshot(),
    materialArrays: window.__ROOM__.inspectAutoBatchRejections()
      .filter(row => row.reason === 'material-array')
  }));
  expect(result.snapshot.renderer.calls).toBeLessThan(350);
  expect(result.snapshot.architecture.plants.model).toBe('faceted-terracotta-five-leaf');
  expect(result.snapshot.architecture.plants.total).toBe(3);
  expect(result.materialArrays.length).toBeGreaterThan(0);
  expect(Math.max(...result.materialArrays.map(row => row.geometryGroups))).toBeLessThanOrEqual(3);
});

test('nearby compatible static meshes are automatically batched and can be rebuilt', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);
  await page.waitForTimeout(250);

  const initial = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(initial.batching.enabled).toBeTruthy();
  expect(initial.batching.cellSize).toBeGreaterThan(0);
  expect(initial.batching.sourceMeshes).toBeGreaterThan(100);
  expect(initial.batching.mergedSourceMeshes).toBeGreaterThan(initial.batching.batches);
  expect(initial.batching.batches).toBeGreaterThan(0);
  expect(initial.batching.estimatedDrawCallsSaved).toBeGreaterThan(100);
  expect(initial.batching.semanticObjectsPreserved).toBeTruthy();
  expect(initial.renderer.calls).toBeGreaterThan(0);

  const rebuilt = await page.evaluate(() => {
    window.__ROOM__.rebatchStaticMeshes();
    return window.__ROOM__.snapshot().batching;
  });
  expect(rebuilt.sourceMeshes).toBe(initial.batching.sourceMeshes);
  expect(rebuilt.batches).toBe(initial.batching.batches);
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

test('utility installations retain shelves, instruments, books, and powered electrical panel', async ({ page }) => {
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

test('electrical panel and its conduit sit on the left wall right of the stairs and door', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);

  const architecture = await page.evaluate(() => window.__ROOM__.snapshot().architecture);
  const panel = architecture.electricalPanel;
  expect(panel).toMatchObject({
    wall: 'left',
    side: 'room-view-right-of-stairs-and-door',
    conduitAttached: true,
    rotatedToWall: true,
    entirelyRightOfDoor: true,
    entirelyRightOfStairs: true
  });
  expect(panel.position.x).toBeLessThan(-6.7);
  expect(panel.position.z).toBeLessThan(architecture.door.position.z - 1);
  expect(panel.doorClearance).toBeGreaterThan(0.5);
  expect(panel.stairClearance).toBeGreaterThan(0.4);
  expect(panel.conduitTop).toBeGreaterThan(6.7);
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

test('back-wall LED matrix uses a sizable CanvasTexture and renders SSE display messages', async ({ page, request }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().network.connection), { timeout: 8000 }).toBe('open');

  const initial = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(initial.screens.ledMatrix).toMatchObject({
    type: 'CanvasTexture',
    canvasElement: true,
    mode: 'led-dot-matrix',
    width: 1024,
    height: 360,
    columns: 160,
    rows: 36,
    physicalWidth: 4.4,
    physicalHeight: 1.55,
    wall: 'back',
    sseCapable: true,
    source: 'fallback',
    messages: 0,
    title: 'RAYCAST ROOM'
  });
  expect(initial.screens.ledMatrix.updates).toBeGreaterThan(0);
  expect(initial.architecture.ledMatrix).toMatchObject({
    model: 'wall-led-matrix-v1',
    wall: 'back',
    sizable: true,
    colliderFree: true
  });
  expect(initial.architecture.ledMatrix.position.y).toBeGreaterThan(3);
  expect(initial.architecture.ledMatrix.position.y).toBeLessThan(3.9);

  const response = await request.post('http://127.0.0.1:8001/event', {
    data: {
      display: {
        title: 'BUILD PIPELINE',
        lines: ['COMPILE 100%', 'TESTS 23/23', 'DEPLOY READY'],
        status: 'NOMINAL',
        accent: '#59f3ff'
      }
    }
  });
  expect(response.status()).toBe(202);
  const receipt = await response.json();
  expect(receipt.accepted).toBeTruthy();
  expect(receipt.event.display.title).toBe('BUILD PIPELINE');

  await expect.poll(
    () => page.evaluate(() => window.__ROOM__.snapshot().screens.ledMatrix.messages)
  ).toBe(1);
  const updated = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(updated.screens.ledMatrix).toMatchObject({
    source: 'sse',
    title: 'BUILD PIPELINE',
    lines: ['COMPILE 100%', 'TESTS 23/23', 'DEPLOY READY'],
    status: 'NOMINAL',
    accent: '#59f3ff',
    messages: 1
  });
  expect(updated.screens.ledMatrix.updates).toBeGreaterThan(initial.screens.ledMatrix.updates);
  expect(updated.screens.ledMatrix.lastEventId).toBeTruthy();
  expect(updated.network.lastPhase).toBeNull();
  expect(updated.network.destination).toBeNull();
});

test('a recessed animated rainy night skyline window sits above the lowered LED matrix', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);

  const first = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(first.screens.cityWindow).toMatchObject({
    type: 'CanvasTexture',
    canvasElement: true,
    animated: true,
    mode: 'rainy-night-city',
    width: 1024,
    height: 288,
    skylineLayers: 3,
    rainStreaks: 120
  });
  expect(first.screens.cityWindow.updates).toBeGreaterThan(0);
  expect(first.architecture.cityWindow).toMatchObject({
    model: 'recessed-rainy-city-window-v1',
    wall: 'back',
    panes: 3,
    mullions: 2,
    recessed: true,
    wetGlass: true,
    colliderFree: true,
    aboveLedMatrix: true
  });
  expect(first.architecture.cityWindow.position.y).toBeGreaterThan(first.architecture.ledMatrix.position.y);
  expect(first.architecture.cityWindow.verticalGapAboveMatrix).toBeGreaterThan(0.08);
  expect(first.architecture.cityWindow.ceilingClearance).toBeGreaterThan(0.3);

  await expect.poll(
    () => page.evaluate(() => window.__ROOM__.snapshot().screens.cityWindow.updates),
    { timeout: 8000 }
  ).toBeGreaterThan(first.screens.cityWindow.updates);
});

test('activityStream REST events broadcast over SSE and drive a live-duration matrix view', async ({ page, request }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);
  await expect.poll(() => page.evaluate(() => window.__ROOM__.snapshot().network.connection), { timeout: 8000 }).toBe('open');

  const invalidVersion = await request.post('http://127.0.0.1:8001/activityStream', {
    data: {
      schemaVersion: 2,
      eventId: 'activity-invalid-version',
      timestampUtc: new Date().toISOString(),
      info: {
        ticketId: '1234',
        phase: 'validate',
        phaseState: 'done',
        eventType: 'validation.completed',
        summary: '18 passed; 0 failed',
        metadata: { exitCode: 0, passed: 18, failed: 0 }
      }
    }
  });
  expect(invalidVersion.status()).toBe(422);

  const invalidTimestamp = await request.post('http://127.0.0.1:8001/activityStream', {
    data: {
      schemaVersion: 1,
      eventId: 'activity-invalid-time',
      timestampUtc: 'not-a-utc-timestamp',
      info: {
        ticketId: '1234',
        phase: 'validate',
        phaseState: 'done',
        eventType: 'validation.completed',
        summary: '18 passed; 0 failed',
        metadata: {}
      }
    }
  });
  expect(invalidTimestamp.status()).toBe(422);

  const injectedEventId = await request.post('http://127.0.0.1:8001/activityStream', {
    data: {
      schemaVersion: 1,
      eventId: 'activity-valid\ndata: injected',
      timestampUtc: new Date().toISOString(),
      info: {
        ticketId: '1234',
        phase: 'validate',
        phaseState: 'done',
        eventType: 'validation.completed',
        summary: '18 passed; 0 failed',
        metadata: {}
      }
    }
  });
  expect(injectedEventId.status()).toBe(422);

  const timestampUtc = new Date(Date.now() - 4000).toISOString();
  const payload = {
    schemaVersion: 1,
    eventId: 'activity-validation-1234',
    timestampUtc,
    info: {
      ticketId: '1234',
      phase: 'validate',
      phaseState: 'done',
      eventType: 'validation.completed',
      summary: '18 passed; 0 failed',
      metadata: { exitCode: 0, passed: 18, failed: 0 }
    }
  };
  const response = await request.post('http://127.0.0.1:8001/activityStream', { data: payload });
  expect(response.status()).toBe(202);
  const receipt = await response.json();
  expect(receipt).toMatchObject({
    accepted: true,
    event: {
      id: payload.eventId,
      activityStream: payload
    }
  });

  await expect.poll(
    () => page.evaluate(() => window.__ROOM__.snapshot().screens.ledMatrix.activityStream?.eventId)
  ).toBe(payload.eventId);
  const first = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(first.screens.ledMatrix).toMatchObject({
    source: 'activityStream',
    title: 'ticketId: 1234',
    lines: [
      'phase: validate',
      'summary: 18 passed; 0 failed',
      `timestampUtc: ${timestampUtc}`,
      expect.stringMatching(/^duration: \d+s$/)
    ],
    activityStream: {
      active: true,
      eventId: payload.eventId,
      ticketId: '1234',
      phase: 'validate',
      phaseState: 'done',
      eventType: 'validation.completed',
      summary: '18 passed; 0 failed',
      timestampUtc
    }
  });
  expect(first.screens.ledMatrix.activityStream.durationSeconds).toBeGreaterThanOrEqual(3);
  const firstDuration = first.screens.ledMatrix.activityStream.durationSeconds;
  await expect.poll(
    () => page.evaluate(() => window.__ROOM__.snapshot().screens.ledMatrix.activityStream.durationSeconds),
    { timeout: 5000 }
  ).toBeGreaterThan(firstDuration);
  const final = await page.evaluate(() => window.__ROOM__.snapshot());
  expect(final.network.lastPhase).toBeNull();
  expect(final.network.destination).toBeNull();
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

test('front-right couch corner has a styled warm arched floor lamp', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);

  const lounge = await page.evaluate(() => window.__ROOM__.snapshot().architecture.lounge);
  expect(lounge.floorLamp).toMatchObject({
    model: 'mid-century-arched-floor-lamp-v1',
    corner: 'front-right-by-couch',
    style: 'aged-brass-and-warm-linen',
    hasWeightedBase: true,
    hasArchedStem: true,
    hasLinenShade: true,
    hasDiffuser: true,
    warmPointLight: true,
    colliderFree: true,
    clearOfCouchPath: true,
    insideRoomBounds: true
  });
  expect(lounge.floorLamp.position.x).toBeGreaterThan(6.2);
  expect(lounge.floorLamp.position.z).toBeGreaterThan(6.1);
  expect(lounge.floorLamp.parts).toBeGreaterThanOrEqual(10);
});

test('coffee table is shifted right to leave a clear direct path to the couch', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);

  const lounge = await page.evaluate(() => window.__ROOM__.snapshot().architecture.lounge);
  expect(lounge.coffeeTable).toMatchObject({
    movedAsAssembly: true,
    direction: 'room-right-positive-x',
    onRug: true
  });
  expect(lounge.coffeeTable.shiftRight).toBeGreaterThanOrEqual(0.9);
  expect(lounge.coffeeTable.approachSideClearance).toBeGreaterThan(0.55);
  expect(lounge.walkPathToCouchClear).toBeTruthy();
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

test('back-wall review station uses the generated detailed developer workstation model', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);

  const station = await page.evaluate(() => window.__ROOM__.snapshot().architecture.reviewStation);
  expect(station).toMatchObject({
    model: 'generated-software-station-v1',
    monitor: { animated: true, preserved: true },
    overheadFrame: true,
    speakerCount: 2,
    deskFanBlades: 12,
    keyboardKeys: 36,
    drawers: 2,
    pcCoolingFans: 2,
    hasDeskMat: true,
    hasTaskLamp: true,
    hasCableManagement: true,
    colliderPreserved: true,
    approachPoint: { x: 1.6, z: -4.82 }
  });
  expect(station.semanticGroups).toEqual(expect.arrayContaining([
    'SoftwareStationStructure',
    'SoftwareStationDisplay',
    'SoftwareStationAccessories',
    'SoftwareStationUnderDesk'
  ]));
});

test('right-wall software station uses the second reference interpretation', async ({ page }) => {
  await page.goto('/?eventPort=8001');
  await page.waitForFunction(() => window.__ROOM__?.ready);

  const station = await page.evaluate(() => window.__ROOM__.snapshot().architecture.softwareStation);
  expect(station).toMatchObject({
    model: 'software-command-station-v2',
    screens: { count: 2, primary: 'cyan-code', secondary: 'vertical-status' },
    splayedLegs: 4,
    equipmentRail: true,
    keyboardKeys: 36,
    fanBlades: 10,
    drawers: 2,
    towerFans: 1,
    hasCableManagement: true,
    plantPreserved: true,
    colliderPreserved: true,
    approachPoint: { x: 4.88, z: -1.3 }
  });
  expect(station.semanticGroups).toEqual(expect.arrayContaining([
    'SoftwareV2Structure',
    'SoftwareV2Displays',
    'SoftwareV2InputDeck',
    'SoftwareV2Accessories',
    'SoftwareV2UnderDesk'
  ]));
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
