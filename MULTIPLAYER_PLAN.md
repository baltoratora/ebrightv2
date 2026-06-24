# Cross-device multiplayer via invite code — plan (free tier)

**Status:** proposal for approval. No code written yet.
**Goal:** Player A taps "Create game", gets a short invite code (e.g. `7F3K`), shares
it (text/QR). Player B enters the code on their own device and the two play the
same live game. Must run entirely on Cloudflare's **free** plan.

---

## 1. Feasibility (verified against current Cloudflare docs, Jun 2026)

Confirmed free-tier capabilities:

| Capability | Free-tier allowance | Enough for us? |
|---|---|---|
| Durable Objects (SQLite-backed) | 100k requests/day, 13,000 GB-s/day, 5 GB storage | Yes, easily |
| WebSockets | upgrade = 1 request; messages don't add request charges | Yes |
| D1 (already in use) | 5M reads/day, 100k writes/day, 5 GB | Yes |

**Conclusion: yes, real-time multiplayer is achievable for $0** at this site's scale.

---

## 2. Two architectures

### Option A — Durable Objects + WebSockets (recommended)
- One **invite code = one Durable Object instance** (the "room"). The DO holds the
  authoritative game state and relays moves between the two connected sockets in
  real time.
- Pros: instant moves, presence ("opponent connected/left"), reconnect support,
  authoritative state (no cheating/desync), scales cleanly to more games.
- Cons: more new infrastructure (a DO class + WebSocket plumbing).

### Option B — D1 polling (low-effort alternative)
- Reuse existing D1. Tables `room(code, fen, turn, updated_at, …)` and/or a
  `moves` log. Clients POST a move and GET (poll every ~1.5s) for the opponent's.
- Pros: minimal new infra, uses what we already deploy.
- Cons: ~1.5s perceived lag, chattier, no true presence. Fine for turn-based.

**Recommendation: Option A.** It's free, feels real-time, and becomes reusable
plumbing for every future multiplayer game. Option B is the fallback if we want
the smallest possible first step.

> Infra note to confirm at build time: the static site stays on Pages. Pages can
> bind to a Durable Object via `wrangler.toml` migrations. If a Pages Function
> can't host the DO class directly in this setup, we deploy a tiny companion
> Worker that owns the DO and bind to it — the site itself is unaffected.

---

## 3. Which games

| Tier | Games | Notes |
|---|---|---|
| **Great fit** (turn-based, discrete moves) | **Chess**, Checkers, Big 2, Battleship | State is small & serializable; just relay moves |
| Possible but harder (real-time physics) | Pool, Carrom | Need one authoritative "host" simulating; sync is non-trivial |
| Not really versus | Wordle/Quordle, Sudoku, Minesweeper, Tetris, etc. | Best as async "same board, compare results", not live |

**Start with Chess** — it's the flagship, and its entire state is a FEN string
with a one-line `game.move()` apply step, so wiring it to a remote opponent is
the smallest possible real change.

---

## 4. Room / connection lifecycle (Option A)

1. **Create:** A calls the room endpoint → server mints a unique 4–5 char code,
   the DO for that code initializes an empty game (A = white). Returns code.
2. **Join:** B opens `/chess?join=7F3K` (or types the code) → connects to the same
   DO via WebSocket → assigned black. DO broadcasts "both players present, start".
3. **Play:** On a local move, the client sends `{type:"move", from, to}`. The DO
   validates it's that player's turn, applies it to authoritative state, and
   broadcasts the new FEN to both. Each client renders from the broadcast.
4. **Turn enforcement:** DO rejects moves from the player who isn't on turn.
5. **Disconnect/reconnect:** DO keeps state; a returning socket with the same code
   gets the current FEN and resumes. Show "opponent disconnected" meanwhile.
6. **Game over / cleanup:** on checkmate/draw/resign, DO marks finished; instance
   idles out (SQLite state is cheap, or we delete on finish).

---

## 5. Concrete code touchpoints

- `wrangler.toml` — add the Durable Object binding + migration (and AI/D1 stay).
- New server module (Pages Function route or companion Worker) — `GameRoom` DO:
  `fetch()` handles the WebSocket upgrade; in-DO state = `{ fen, players, turn }`;
  message handlers for `join` / `move` / `resign`.
- New client hook `lib/useRoom.ts` — opens the WebSocket, exposes
  `{ status, color, fen, sendMove, opponentPresent }`. Reusable across games.
- `components/Chess.tsx` — add a `mode: "ai" | "online"`. In online mode, replace
  the AI-black timer with: send local moves via the hook, apply opponent moves
  from the hook's `fen`. Lock the board when it's not your turn.
- New UI — a small "Play a friend" panel: **Create code** / **Enter code**, plus a
  copy/share button. Could live on `/chess` or the `/thinking` hub.
- (Optional) QR code for the invite link so phones can join by scanning.

---

## 6. Phased delivery (with checkpoints)

- **Phase 1 — Plumbing:** DO + WebSocket echo room + `useRoom` hook + create/join
  UI. Checkpoint: two browser tabs connect to the same code and exchange a test
  message. *(No game logic yet.)*
- **Phase 2 — Chess online:** wire Chess to the hook; turn enforcement; win/draw
  handling; reconnect. Checkpoint: a full game played across two devices.
- **Phase 3 — Polish:** presence/"waiting for opponent", resign/rematch, share-link
  + QR, error/timeout handling.
- **Phase 4 — Reuse:** generalize the room to a 2nd game (Checkers or Big 2) by
  swapping the move/state codec. Confirms the plumbing is game-agnostic.

---

## 7. Risks / open questions

- **Pages + DO hosting** detail (see §2 note) — confirm in Phase 1; fallback is a
  companion Worker.
- **Free-tier limits** — generous for hobby scale; only a concern if it goes viral.
- **Physics games** (pool/carrom) explicitly **out of scope** for v1.
- **Abuse / spam rooms** — codes are ephemeral and capacity is tiny; low risk.
- **Matchmaking** — none; invite-code only (as requested). No accounts needed.

**Effort estimate:** Phase 1–2 (working Chess vs a friend) is the bulk of the
value and is a focused chunk of work; Phases 3–4 are incremental.
