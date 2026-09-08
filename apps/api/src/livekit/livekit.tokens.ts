// Eigene Datei wie storage/s3.tokens.ts: So kann ein Consumer das Token importieren, ohne
// das Modul selbst zu laden – das hält Import-Zyklen fern.
export const LIVEKIT_ROOM_SERVICE = Symbol('LIVEKIT_ROOM_SERVICE');
