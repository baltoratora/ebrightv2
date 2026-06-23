// Global leaderboard API (Cloudflare D1). GET top 10, POST a score.
// Game keys may include a difficulty suffix, e.g. "sudoku:hard".

interface Env {
  DB: D1Database;
}

// Direction per base game: "desc" = higher is better, "asc" = lower is better.
const DIRECTION: Record<string, "asc" | "desc"> = {
  tetris: "desc",
  pinball: "desc",
  breakout: "desc",
  sudoku: "asc",
  minesweeper: "asc",
  wordle: "asc",
  quordle: "asc",
  chess: "asc",
  checkers: "asc",
};

const baseGame = (g: string) => g.split(":")[0];
const known = (g: string) => DIRECTION[baseGame(g)] !== undefined;
const orderSql = (g: string) => (DIRECTION[baseGame(g)] === "asc" ? "ASC" : "DESC");

async function top10(env: Env, game: string) {
  const { results } = await env.DB.prepare(
    `SELECT name, value FROM scores WHERE game = ? ORDER BY value ${orderSql(game)}, created_at ASC LIMIT 10`,
  )
    .bind(game)
    .all();
  return results;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const game = new URL(request.url).searchParams.get("game") ?? "";
  if (!known(game)) return Response.json({ error: "unknown game" }, { status: 400 });
  try {
    return Response.json({ scores: await top10(env, game) });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: { game?: unknown; name?: unknown; value?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad body" }, { status: 400 });
  }
  const game = String(body.game ?? "");
  if (!known(game)) return Response.json({ error: "unknown game" }, { status: 400 });

  const name =
    String(body.name ?? "")
      .replace(/[^\w \-]/g, "")
      .trim()
      .slice(0, 12) || "—";
  const value = Number(body.value);
  if (!Number.isFinite(value) || value < 0 || value > 100_000_000) {
    return Response.json({ error: "bad value" }, { status: 400 });
  }

  try {
    await env.DB.prepare(
      "INSERT INTO scores (game, name, value, created_at) VALUES (?, ?, ?, ?)",
    )
      .bind(game, name, value, Date.now())
      .run();
    return Response.json({ scores: await top10(env, game) });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
};
