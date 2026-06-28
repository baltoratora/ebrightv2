"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientMsg, ServerMsg } from "./roomProtocol";

// The GameRoom Durable Object is hosted in the baltoratora-rooms Worker.
// We connect to it directly (cross-origin WebSockets need no CORS preflight),
// which avoids depending on the Pages->DO binding. Override at build time with
// NEXT_PUBLIC_REALTIME_URL if the Worker is ever renamed/moved.
const REALTIME_URL =
  process.env.NEXT_PUBLIC_REALTIME_URL ??
  "wss://baltoratora-rooms.iqyhakim21.workers.dev";

// Bounded auto-reconnect: retry an unexpectedly-dropped socket a few times with
// exponential backoff, then give up (status stays "closed"). Bounded so a
// permanently-down server can't cause a reconnect storm.
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_MS = 1000;

export type RoomStatus = "idle" | "connecting" | "open" | "closed";

export interface Room {
  status: RoomStatus;
  seat: number | null;
  turn: number;
  peers: number;
  error: string | null;
  send: (msg: ClientMsg) => void;
}

/**
 * Connect to a room by code. Pass `code = null` to stay disconnected.
 * `onEvent` fires synchronously for every server message (so no move is ever
 * lost to state-batching); its latest version is always used without
 * reconnecting.
 */
export function useRoom(
  code: string | null,
  onEvent?: (msg: ServerMsg) => void,
): Room {
  const [status, setStatus] = useState<RoomStatus>("idle");
  const [seat, setSeat] = useState<number | null>(null);
  const [turn, setTurn] = useState(0);
  const [peers, setPeers] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const prevCodeRef = useRef<string | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!code) {
      setStatus("idle");
      attemptRef.current = 0;
      return;
    }
    // Reset the backoff when connecting to a different room (not a retry).
    if (prevCodeRef.current !== code) {
      attemptRef.current = 0;
      prevCodeRef.current = code;
    }
    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    setStatus("connecting");
    setError(null);
    setSeat(null);
    setPeers(0);

    const ws = new WebSocket(`${REALTIME_URL}/room/${code}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!disposed) setStatus("open");
    };
    ws.onmessage = (e) => {
      let msg: ServerMsg;
      try {
        msg = JSON.parse(e.data as string);
      } catch {
        return;
      }
      if (msg.t === "welcome") {
        // A real, healthy connection (server accepted us) — reset the backoff
        // here rather than on `onopen`, so a server that opens then immediately
        // drops still escalates and eventually gives up.
        attemptRef.current = 0;
        setSeat(msg.seat);
        setTurn(msg.turn);
        setPeers(msg.peers);
      } else if (msg.t === "move" || msg.t === "reset") {
        setTurn(msg.turn);
      } else if (msg.t === "peer") {
        setPeers(msg.peers);
      } else if (msg.t === "error") {
        setError(msg.msg);
      }
      onEventRef.current?.(msg);
    };
    ws.onclose = () => {
      if (disposed) return;
      setStatus("closed");
      // Auto-reconnect with bounded exponential backoff (1s, 2s, 4s, …).
      if (attemptRef.current < MAX_RECONNECT_ATTEMPTS) {
        const delay = RECONNECT_BASE_MS * 2 ** attemptRef.current;
        attemptRef.current += 1;
        reconnectTimer = setTimeout(() => {
          if (!disposed) setRetryTick((t) => t + 1);
        }, delay);
      }
    };
    ws.onerror = () => {
      /* surfaced via onclose */
    };

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        ws.close();
      } catch {
        /* noop */
      }
      wsRef.current = null;
    };
  }, [code, retryTick]);

  const send = useCallback((msg: ClientMsg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  return { status, seat, turn, peers, error, send };
}
