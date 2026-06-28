// Shared types + pure helpers for two-player "rooms", used by BOTH the client
// (lib/useRoom.ts) and the realtime Worker (worker/src/index.ts). Keep this
// runtime-agnostic: no DOM, no Workers, no React — just types and pure logic.

/** A chess move in chess.js shorthand. The room treats it as opaque payload. */
export interface RoomMove {
  from: string;
  to: string;
  promotion?: string;
}

// Messages the client sends to the server.
export type ClientMsg =
  | { t: "move"; move: RoomMove; state: string }
  | { t: "reset"; state: string }
  | { t: "rematch" };

// Messages the server sends to clients.
export type ServerMsg =
  | { t: "welcome"; seat: number; state: string; turn: number; peers: number }
  | { t: "move"; move: RoomMove; state: string; by: number; turn: number }
  | { t: "reset"; state: string; turn: number }
  | { t: "peer"; peers: number }
  | { t: "rematch" }
  | { t: "error"; msg: string };

export const SEAT_FULL = -1;

/** The other seat in a 2-player room. */
export function otherSeat(seat: number): number {
  return seat === 0 ? 1 : 0;
}

/** chess.js colour for a seat: seat 0 plays white, seat 1 plays black. */
export function seatColor(seat: number): "w" | "b" {
  return seat === 1 ? "b" : "w";
}

/** Pick the lowest free seat (0, then 1), or SEAT_FULL if both are taken. */
export function assignSeat(taken: readonly number[]): number {
  if (!taken.includes(0)) return 0;
  if (!taken.includes(1)) return 1;
  return SEAT_FULL;
}

// Unambiguous alphabet (no O/0/I/1) for human-friendly invite codes.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Generate a random invite code (default 4 chars) using a CSPRNG. */
export function genRoomCode(len = 4): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

/** Codes accepted by the server route: 3–12 of the safe alphabet, upper-case. */
export const ROOM_CODE_RE = /^[A-HJ-NP-Z2-9]{3,12}$/;

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidCode(raw: string): boolean {
  return ROOM_CODE_RE.test(normalizeCode(raw));
}

// The room state is a chess.js FEN (~90 chars); cap generously to bound abuse
// while never rejecting a legitimate game state.
const MAX_STATE_LEN = 4096;

function isStateString(s: unknown): s is string {
  return typeof s === "string" && s.length > 0 && s.length <= MAX_STATE_LEN;
}

/**
 * Validate a parsed client message before the server acts on it. A malformed
 * "move"/"reset" (e.g. missing `state`) must be ignored like a bad JSON parse,
 * NOT passed through — otherwise the Durable Object binds `undefined` to its
 * NOT NULL state column and throws, killing that socket.
 */
export function isValidClientMsg(msg: unknown): msg is ClientMsg {
  if (typeof msg !== "object" || msg === null) return false;
  const m = msg as Record<string, unknown>;
  switch (m.t) {
    case "move": {
      const mv = m.move as Record<string, unknown> | undefined;
      return (
        isStateString(m.state) &&
        typeof mv === "object" &&
        mv !== null &&
        typeof mv.from === "string" &&
        typeof mv.to === "string"
      );
    }
    case "reset":
      return isStateString(m.state);
    case "rematch":
      return true;
    default:
      return false;
  }
}
