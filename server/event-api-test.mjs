process.env.ROOM_EDITOR_FAKE_HERMES = '1';
process.env.ROOM_EDITOR_ENABLED = '1';
process.env.EVENT_API_HOST = '127.0.0.1';
process.env.ROOM_EDITOR_FAKE_DELAY_MS = '1500';
process.env.ROOM_EDITOR_FAKE_SPECIALIST_DELAY_MS = '400';
await import('./event-api.mjs');
