# Robot Worker

An interactive Three.js operations room centered on a compact articulated robot worker. Click destinations in the room or send agent-status phases through the event API to route the robot between planning, implementation, review, validation, and rest stations.

## Highlights

- Constant-speed, distance-synchronized robot locomotion
- Articulated walk, work, sit, and stand-up animation states
- Clickable floor, workstations, and couch
- Ten-phase Server-Sent Events status-routing API
- Animated CanvasTexture oscilloscope with a glowing sine wave
- Animated review monitor with a restrained graph display
- Sizable back-wall LED matrix rendered by an HTML canvas and updated through SSE
- Procedural room materials, workstation props, lounge, stairs, and utility details
- Runtime spatial auto-batching for nearby compatible static meshes
- Runtime diagnostics exposed through `window.__ROOM__.snapshot()`
- Playwright interaction and state-machine regression coverage

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open <http://localhost:5173>.

To enable external agent-status events, run the API in a second terminal:

```bash
npm run api
```

The event API listens on port `8000` by default.

## Send a robot phase

```bash
curl -X POST http://localhost:8000/event \
  -H 'Content-Type: application/json' \
  -d '{"phase":"implement"}'
```

Supported phases:

| Station | Phases |
| --- | --- |
| Planning bench | `read`, `prepare`, `spec` |
| Computer desk | `implement` |
| Review/test bench | `validate`, `review`, `submit`, `sync` |
| Couch | `waiting`, `done` |

See [`server/EVENT_API.md`](server/EVENT_API.md) for the complete request and SSE contract.

## Send content to the LED matrix

```bash
curl -X POST http://localhost:8000/event \
  -H 'Content-Type: application/json' \
  -d '{"display":{"title":"ROOM OPERATIONS","lines":["BUILD GREEN","SSE LINK ACTIVE"],"status":"NOMINAL","accent":"#59f3ff"}}'
```

The wall display keeps a useful local fallback screen until the first display event arrives. Display messages update only the canvas texture and do not route the robot.

## Send an activity stream event

```bash
curl -X POST http://localhost:8000/activityStream \
  -H 'Content-Type: application/json' \
  -d '{
    "schemaVersion": 1,
    "eventId": "validation-1234-001",
    "timestampUtc": "2026-07-29T14:30:45Z",
    "info": {
      "ticketId": "1234",
      "phase": "validate",
      "phaseState": "done",
      "eventType": "validation.completed",
      "summary": "18 passed; 0 failed",
      "metadata": {"exitCode": 0, "passed": 18, "failed": 0}
    }
  }'
```

Accepted activity events are sent through the existing `/event` SSE connection and take over the dot-matrix screen. The display shows `ticketId`, `phase`, `summary`, `timestampUtc`, and a live `duration` counter measured in whole seconds since `timestampUtc`. Activity events do not route the robot.

## Commands

```bash
npm run dev      # Vite development server
npm run api      # Agent event API on port 8000
npm run build    # Production build
npm run preview  # Preview the production build
npm test         # Playwright test suite
```

## Interaction

- Click the floor to move the robot.
- Click a workstation to run its local task routine.
- Click the couch to route through the canonical `done` routine and sit.
- When leaving the couch, the robot stands before turning and walking.

## Static mesh auto-batching

The room automatically scans opaque static meshes at startup, divides them into nearby 5-meter spatial cells, and merges compatible geometry that shares a material and render state. Source meshes stay attached to their semantic groups but are hidden, so names, colliders, and runtime diagnostics remain available while the renderer draws the merged batches.

New static props are included automatically after a normal Vite reload. If geometry is added at runtime, rebuild the batches with:

```js
window.__ROOM__.rebatchStaticMeshes();
```

Moving or otherwise runtime-mutated meshes should opt out on themselves or a parent group:

```js
movingGroup.userData.dynamic = true;
// or
mesh.userData.noAutoBatch = true;
```

Batch counts and estimated draw-call savings are available at `window.__ROOM__.snapshot().batching`. Multi-material faceted leaf geometry stores triangles contiguously by material, so each leaf uses three submissions rather than one submission per triangle while preserving its three-tone shading.

## AO-baked static lighting

Static room meshes are converted at startup to unlit `MeshBasicMaterial` variants using a shared procedural AO texture, generated `uv1` coordinates, and baked world-space vertex irradiance. This preserves the procedural floor, wall, and display textures without evaluating real-time lights for hundreds of static meshes.

Decorative point and hemisphere lights remain attached to their semantic fixtures for diagnostics but are disabled. Static meshes neither cast nor receive real-time shadows. The articulated robot uses a dedicated render layer, one tightly scoped directional shadow light, a transparent `ShadowMaterial` floor receiver, and a soft projected shadow texture that follows the robot while it moves.

Lighting diagnostics are available at `window.__ROOM__.snapshot().lighting`.

## License

Apache-2.0. See [`LICENSE`](LICENSE).
