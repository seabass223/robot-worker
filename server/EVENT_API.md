# Room Event API

The room uses one unauthenticated public path, `/event`, for both event submission and the Server-Sent Events stream. The API listens on `0.0.0.0:8000` by default.

## POST `/event`

Send exactly one JSON property named `phase`:

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
