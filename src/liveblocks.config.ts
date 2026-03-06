import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
});

// ── Presence ─────────────────────────────────────────────────────────────
// Each user broadcasts their cursor position and a display name + color.
export type Presence = {
  cursor: { x: number; y: number } | null;
  name: string;
  color: string;
};

// ── Broadcast events ──────────────────────────────────────────────────────
// Thin envelope wrapping Fabric JSON so other clients can apply changes live.
export type RoomEvent =
  | { type: "OBJECT_UPSERTED"; objectId: string; fabricJSON: string }
  | { type: "OBJECT_DELETED";  objectId: string }
  | { type: "CANVAS_CLEARED" }
  | { type: "LAYER_REORDERED"; order: string[] };

export const {
  RoomProvider,
  useMyPresence,
  useOthers,
  useOthersListener,
  useSelf,
  useBroadcastEvent,
  useEventListener,
} = createRoomContext<
  Presence,
  Record<string, never>,
  Record<string, never>,
  RoomEvent
>(client);
