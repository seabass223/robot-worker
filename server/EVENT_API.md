# Room Event API

The room exposes unauthenticated REST submission paths at `/event` and `/activityStream`. The browser receives both kinds of accepted events from the Server-Sent Events stream at `GET /event`. The API listens on `0.0.0.0:8000` by default.

## POST `/event`

Send exactly one top-level JSON property: either `phase` for robot routing or `display` for the wall LED matrix:

```json
{
  "phase": "prepare"
}
```

`phase` is required and must be one of:

| Phase | Robot destination |
|---|---|
| `read` | Workbench |
| `prepare` | Workbench |
| `spec` | Workbench |
| `implement` | Software desk with computer and plant |
| `validate` | Test desk |
| `review` | Test desk |
| `submit` | Test desk |
| `sync` | Test desk |
| `waiting` | Couch |
| `done` | Couch |

When a network phase routes the robot to the workbench, software desk, or test desk, the robot keeps running its existing work animation after arrival. This network-triggered animation does not display the progress meter and continues until another phase arrives. Couch phases (`waiting` and `done`) stop the work animation.

Successful requests return HTTP `202 Accepted`:

```json
{
  "accepted": true,
  "delivered": 1,
  "event": {
    "id": "uuid",
    "phase": "prepare",
    "receivedAt": "ISO-8601 timestamp"
  }
}
```

Invalid phase values, the old `type` property, or other payload shapes return HTTP `422`. Invalid JSON returns `400`; a non-JSON content type returns `415`.

Example:

```bash
curl -X POST http://localhost:8000/event \
  -H 'Content-Type: application/json' \
  -d '{"phase":"implement"}'
```

### LED matrix display payload

```json
{
  "display": {
    "title": "ROOM OPERATIONS",
    "lines": ["BUILD GREEN", "TESTS 23 / 23", "SSE LINK ACTIVE"],
    "status": "ALL SYSTEMS NOMINAL",
    "accent": "#59f3ff"
  }
}
```

- `title` is required, non-empty, and limited to 40 characters.
- `lines` is required and contains one to four non-empty strings, each limited to 80 characters.
- `status` is optional and limited to 32 characters; it defaults to `LIVE`.
- `accent` is optional and must be a six-digit `#RRGGBB` color; it defaults to cyan.
- Unknown nested properties, extra top-level properties, malformed colors, and out-of-range strings return HTTP `422`.

The browser normalizes the SSE data into display state, redraws the 1024×360 HTML canvas as a 64×22 LED-dot grid, and marks its Three.js `CanvasTexture` for upload. Display events do not change robot motion, destination, or work state.

Example:

```bash
curl -X POST http://localhost:8000/event \
  -H 'Content-Type: application/json' \
  -d '{"display":{"title":"ROOM OPERATIONS","lines":["BUILD GREEN","SSE LINK ACTIVE"],"status":"NOMINAL","accent":"#59f3ff"}}'
```

## POST `/activityStream`

Send an activity event using this exact top-level and `info` shape:

```json
{
  "schemaVersion": 1,
  "eventId": "validation-1234-001",
  "timestampUtc": "2026-07-29T14:30:45Z",
  "info": {
    "ticketId": "1234",
    "phase": "validate",
    "phaseState": "done",
    "eventType": "validation.completed",
    "summary": "18 passed; 0 failed",
    "metadata": {
      "exitCode": 0,
      "passed": 18,
      "failed": 0
    }
  }
}
```

Validation limits:

- `schemaVersion` must be the number `1`.
- `eventId` is required, limited to 128 characters, starts with an ASCII letter or digit, and may then contain letters, digits, `.`, `_`, `:`, `/`, or `-`. It becomes the SSE event id.
- `timestampUtc` must be a valid ISO-8601 UTC timestamp ending in `Z`.
- `ticketId`, `phase`, `phaseState`, `eventType`, and `summary` are required non-empty strings.
- `summary` is limited to 96 characters so it remains readable on the matrix.
- `metadata` is required and may contain any JSON object.
- Unknown or missing top-level and `info` properties return HTTP `422`.

Successful requests return HTTP `202 Accepted` and this envelope:

```json
{
  "accepted": true,
  "delivered": 1,
  "event": {
    "id": "validation-1234-001",
    "activityStream": {
      "schemaVersion": 1,
      "eventId": "validation-1234-001",
      "timestampUtc": "2026-07-29T14:30:45Z",
      "info": {}
    },
    "receivedAt": "ISO-8601 timestamp"
  }
}
```

The event is emitted over `GET /event` as a named `room-event`. The browser renders the matrix as:

```text
ticketId: 1234
phase: validate
summary: 18 passed; 0 failed
timestampUtc: 2026-07-29T14:30:45Z
duration: 42s
```

`duration` updates once per second and is clamped to zero for timestamps in the future. Activity events do not route or animate the robot. A later `/activityStream` event replaces the current activity view; a later `/event` display payload returns the matrix to explicit display mode.

## GET `/event`

The frontend opens this same path as a Server-Sent Events stream. Accepted POST requests are emitted as `room-event` events. The server sends heartbeat comments every 15 seconds and allows cross-origin access so the Vite frontend can connect from port 5173.

## Run

```bash
npm run api
```

Optional configuration:

- `--port <number>` — command-line port override, for example `npm run api -- --port 8001`
- `EVENT_API_HOST` — defaults to `0.0.0.0`
- `EVENT_API_PORT` — defaults to `8000`

The endpoint intentionally has no authentication, as requested. Binding to `0.0.0.0` exposes it to every interface and any network permitted by the host firewall.
