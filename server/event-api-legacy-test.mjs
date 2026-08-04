delete process.env.ROOM_EDITOR_ENABLED;
process.env.EVENT_API_HOST = '127.0.0.1';
await import('./event-api.mjs');
