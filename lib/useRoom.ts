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

  const wsRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!code) {
      setStatus("idle");
      return;
    }
    let disposed = false;
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
      if (!disposed) setStatus("closed");
    };
    ws.onerror = () => {
      /* surfaced via onclose */
    };

    return () => {
      disposed = true;
      try {
        ws.close();
      } catch {
        /* noop */
      }
      wsRef.current = null;
    };
  }, [code]);

  const send = useCallback((msg: ClientMsg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  return { status, seat, turn, peers, error, send };
}
