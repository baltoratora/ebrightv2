CREATE TABLE IF NOT EXISTS memories (
  slug TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  memory_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS memory_photos (
  position INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  memory_slug TEXT NOT NULL REFERENCES memories(slug),
  alt TEXT NOT NULL,
  content_type TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS memory_photos_by_memory ON memory_photos(memory_slug, position);
