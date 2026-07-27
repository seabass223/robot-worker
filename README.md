# Robot Worker

An interactive Three.js operations room centered on a compact articulated robot worker. Click destinations in the room or send agent-status phases through the event API to route the robot between planning, implementation, review, validation, and rest stations.

## Highlights

- Constant-speed, distance-synchronized robot locomotion
- Articulated walk, work, sit, and stand-up animation states
- Clickable floor, workstations, and couch
- Ten-phase Server-Sent Events status-routing API
- Animated CanvasTexture oscilloscope with a glowing sine wave
- Animated review monitor with a restrained graph display
- Procedural room materials, workstation props, lounge, stairs, and utility details
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

## License

Apache-2.0. See [`LICENSE`](LICENSE).
