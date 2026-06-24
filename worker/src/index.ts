// Realtime backend for cross-device multiplayer.
//
// A Durable Object cannot live inside a Cloudflare Pages project, so this is a
// standalone Worker that ONLY hosts the GameRoom DO class. The Pages project
// binds to this Worker's DO namespace (see ../../wrangler.toml) and forwards
// WebSocket upgrades to it from functions/api/room/[code].ts. You can also hit
// this Worker directly at /room/<code> for testing.
//
// GameRoom is a generic two-seat relay: it assigns seats, enforces turns, keeps
// the authoritative game state (an opaque string — a chess FEN today) in SQLite
// so late joiners and reconnects resync, and relays moves between the players.
// Being game-agnostic, it can back checkers/big2/battleship later unchanged.

import { DurableObject } from "cloudflare:workers";
import {
  assignSeat,
  otherSeat,
  SEAT_FULL,
  type ClientMsg,
  type ServerMsg,
} from "../../lib/roomProtocol";

export interface Env {
  ROOMS: DurableObjectNamespace<GameRoom>;
}

interface SeatAttachment {
  seat: number;
}

export class GameRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(
        `CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)`,
      );
    });
  }

  private get(k: string): string | null {
    const rows = this.ctx.storage.sql
      .exec<{ v: string }>("SELECT v FROM kv WHERE k = ?", k)
      .toArray();
    return rows.length ? rows[0].v : null;
  }

  private put(k: string, v: string): void {
    this.ctx.storage.sql.exec(
      "INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v",
      k,
      v,
    );
  }

  private seatsTaken(): number[] {
    return this.ctx
      .getWebSockets()
      .map((ws) => (ws.deserializeAttachment() as SeatAttachment | null)?.seat)
      .filter((s): s is number => s === 0 || s === 1);
  }

  private get turn(): number {
    return Number(this.get("turn") ?? "0");
  }

  private get state(): string {
    return this.get("state") ?? "";
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }

    const seat = assignSeat(this.seatsTaken());
    if (seat === SEAT_FULL) {
      return new Response("room full", { status: 409 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ seat } satisfies SeatAttachment);

    const welcome: ServerMsg = {
      t: "welcome",
      seat,
      state: this.state,
      turn: this.turn,
      peers: this.seatsTaken().length,
    };
    server.send(JSON.stringify(welcome));
    this.broadcast({ t: "peer", peers: this.seatsTaken().length }, server);

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): void {
    const att = ws.deserializeAttachment() as SeatAttachment | null;
    if (!att) return;

    let msg: ClientMsg;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    } catch {
      return;
    }

    if (msg.t === "move") {
      if (att.seat !== this.turn) {
        this.sendTo(ws, { t: "error", msg: "not your turn" });
        return;
      }
      const nextTurn = otherSeat(att.seat);
      this.put("state", msg.state);
      this.put("turn", String(nextTurn));
      this.broadcast(
        { t: "move", move: msg.move, state: msg.state, by: att.seat, turn: nextTurn },
        ws,
      );
    } else if (msg.t === "reset") {
      this.put("state", msg.state);
      this.put("turn", "0");
      this.broadcast({ t: "reset", state: msg.state, turn: 0 }, ws);
    } else if (msg.t === "rematch") {
      this.broadcast({ t: "rematch" }, ws);
    }
  }

  webSocketClose(ws: WebSocket): void {
    try {
      ws.close();
    } catch {
      /* already closing */
    }
    this.broadcast({ t: "peer", peers: this.seatsTaken().length });
  }

  webSocketError(): void {
    this.broadcast({ t: "peer", peers: this.seatsTaken().length });
  }

  private sendTo(ws: WebSocket, msg: ServerMsg): void {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* socket gone */
    }
  }

  private broadcast(msg: ServerMsg, except?: WebSocket): void {
    const s = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      try {
        ws.send(s);
      } catch {
        /* socket gone */
      }
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/room\/([A-HJ-NP-Z2-9]{3,12})$/i);
    if (!match) return new Response("not found", { status: 404 });
    const stub = env.ROOMS.getByName(match[1].toUpperCase());
    return stub.fetch(request);
  },
} satisfies ExportedHandler<Env>;
