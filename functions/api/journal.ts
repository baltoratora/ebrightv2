interface Env {
  DB: D1Database;
  JOURNAL_SECRET: string;
}

interface JournalEntry {
  id: number;
  title: string;
  body: string;
  created_at: string;
}

async function ensureTable(db: D1Database): Promise<void> {
  await db.exec(
    `CREATE TABLE IF NOT EXISTS journal_entries (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      title      TEXT NOT NULL,
      body       TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
  );
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    await ensureTable(env.DB);
    const { results } = await env.DB.prepare(
      "SELECT id, title, body, created_at FROM journal_entries ORDER BY id DESC LIMIT 100",
    ).all<JournalEntry>();
    return Response.json({ entries: results });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let data: Record<string, unknown>;
  try {
    data = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const { title, body, key } = data;
  if (typeof title !== "string" || typeof body !== "string" || typeof key !== "string") {
    return Response.json({ error: "missing fields" }, { status: 400 });
  }
  if (!title.trim() || !body.trim()) {
    return Response.json({ error: "empty fields" }, { status: 400 });
  }
  if (title.length > 200 || body.length > 10000) {
    return Response.json({ error: "too long" }, { status: 400 });
  }
  if (key !== env.JOURNAL_SECRET) {
    return Response.json({ error: "wrong key" }, { status: 401 });
  }

  try {
    await ensureTable(env.DB);
    const now = new Date().toISOString();
    const entry = await env.DB.prepare(
      `INSERT INTO journal_entries (title, body, created_at)
       VALUES (?, ?, ?) RETURNING id, title, body, created_at`,
    )
      .bind(title.trim(), body.trim(), now)
      .first<JournalEntry>();
    return Response.json({ entry }, { status: 201 });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
};
