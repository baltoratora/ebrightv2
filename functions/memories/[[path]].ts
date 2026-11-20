import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  adminIndex,
  editor,
  errorPage,
  memoryIndex,
  memoryPage,
  type Memory,
  type Photo,
} from "../../lib/memories-view";

interface Env {
  MEMORIES_DB?: D1Database;
  MEMORIES_PHOTOS?: R2Bucket;
  MEMORIES_SITE_ORIGIN?: string;
  MEMORIES_ADMIN_ORIGIN?: string;
  MEMORIES_ACCESS_ISSUER?: string;
  MEMORIES_ACCESS_AUD?: string;
  MEMORIES_OWNER_EMAIL?: string;
}

const base = "/memories";
const admin = base + "/admin";
const maxPhotoBytes = 8 * 1024 * 1024;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const photoPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

async function isOwner(request: Request, issuer: string, audience: string, email: string) {
  const jwt = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!jwt || !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer)) return false;
  let keySet = keySets.get(issuer);
  if (!keySet) {
    keySet = createRemoteJWKSet(new URL("/cdn-cgi/access/certs", issuer));
    keySets.set(issuer, keySet);
  }
  try {
    const { payload } = await jwtVerify(jwt, keySet, {
      issuer,
      audience,
      algorithms: ["RS256"],
      requiredClaims: ["exp", "sub", "email"],
    });
    return Boolean(payload.sub) &&
      typeof payload.email === "string" && payload.email.toLowerCase() === email;
  } catch {
    return false;
  }
}

function redirect(location: string) {
  return new Response(null, {
    status: 303,
    headers: { Location: location, "Cache-Control": "no-store" },
  });
}

async function listMemories(db: D1Database, owner: boolean) {
  const filter = owner ? "" : "WHERE m.published_at IS NOT NULL";
  const { results } = await db.prepare(
    `SELECT m.slug, m.title, m.memory_date, m.published_at,
      (SELECT id FROM memory_photos WHERE memory_slug = m.slug ORDER BY position LIMIT 1) AS cover_id,
      (SELECT alt FROM memory_photos WHERE memory_slug = m.slug ORDER BY position LIMIT 1) AS cover_alt
      FROM memories m ${filter} ORDER BY m.memory_date DESC, m.created_at DESC`,
  ).all<Memory>();
  return results;
}

async function getMemory(db: D1Database, slug: string, owner: boolean) {
  const filter = owner ? "" : "AND published_at IS NOT NULL";
  return db.prepare(`SELECT * FROM memories WHERE slug = ? ${filter}`).bind(slug).first<Memory>();
}

async function getPhotos(db: D1Database, slug: string) {
  const { results } = await db.prepare(
    "SELECT id, alt FROM memory_photos WHERE memory_slug = ? ORDER BY position",
  ).bind(slug).all<Photo>();
  return results;
}

async function servePhoto(db: D1Database, bucket: R2Bucket, id: string, owner: boolean) {
  const filter = owner ? "" : "AND m.published_at IS NOT NULL";
  const photo = await db.prepare(
    `SELECT p.id, p.content_type FROM memory_photos p
      JOIN memories m ON m.slug = p.memory_slug WHERE p.id = ? ${filter}`,
  ).bind(id).first<{ id: string; content_type: string }>();
  if (!photo) return errorPage(404, "Photo not found.");
  const object = await bucket.get(photo.id);
  if (!object) return errorPage(404, "Photo not found.");
  return new Response(object.body, {
    headers: {
      "Content-Type": photo.content_type,
      "Content-Length": String(object.size),
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function getText(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readMemory(form: FormData) {
  const title = getText(form, "title");
  const body = getText(form, "body");
  const date = getText(form, "memory_date");
  const parsedDate = new Date(date);
  if (!title || title.length > 100 || !body || body.length > 15000 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.valueOf()) ||
      parsedDate.toISOString().slice(0, 10) !== date || date.startsWith("0000")) return null;
  return { title, body, date };
}

async function createMemory(db: D1Database, form: FormData) {
  const values = readMemory(form);
  if (!values) return errorPage(400, "Enter a title, a valid date, and a story.", admin);

  const customSlug = getText(form, "slug");
  const titleSlug = values.title.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-").slice(0, 60).replace(/^-|-$/g, "");
  const slug = customSlug || `${titleSlug || "memory"}-${crypto.randomUUID().slice(0, 8)}`;
  if (!slugPattern.test(slug) || slug.length > 80 || slug === "admin" || slug === "photo") {
    return errorPage(400, "Use up to 80 lowercase letters, numbers, and single hyphens for the URL.", admin);
  }

  const result = await db.prepare(
    "INSERT INTO memories (slug, title, body, memory_date) VALUES (?, ?, ?, ?) ON CONFLICT(slug) DO NOTHING",
  ).bind(slug, values.title, values.body, values.date).run();
  if (!result.meta.changes) return errorPage(409, "That URL is already taken.", admin);
  return redirect(`${admin}/${slug}`);
}

function detectPhotoType(bytes: Uint8Array) {
  const ascii = new TextDecoder().decode(bytes);
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) return "image/png";
  if (ascii.slice(0, 4) === "RIFF" && ascii.slice(8, 12) === "WEBP") return "image/webp";
  return null;
}

async function addPhoto(db: D1Database, bucket: R2Bucket, memory: Memory, form: FormData) {
  const back = `${admin}/${memory.slug}`;
  const file = form.get("photo");
  const alt = getText(form, "alt");
  if (!(file instanceof File) || !file.size || file.size > maxPhotoBytes || !alt || alt.length > 180) {
    return errorPage(400, "Select a photo up to 8 MB and add a short description.", back);
  }
  const bytes = await file.arrayBuffer();
  const contentType = detectPhotoType(new Uint8Array(bytes, 0, Math.min(12, bytes.byteLength)));
  if (!contentType) return errorPage(400, "Choose a JPEG, PNG, or WebP photo.", back);

  const id = crypto.randomUUID();
  await bucket.put(id, bytes);
  try {
    await db.prepare(
      "INSERT INTO memory_photos (id, memory_slug, alt, content_type) VALUES (?, ?, ?, ?)",
    ).bind(id, memory.slug, alt, contentType).run();
  } catch (error) {
    await bucket.delete(id).catch(console.error);
    throw error;
  }
  return redirect(back);
}

async function removePhoto(db: D1Database, bucket: R2Bucket, slug: string, id: string) {
  const result = await db.prepare("DELETE FROM memory_photos WHERE id = ? AND memory_slug = ?")
    .bind(id, slug).run();
  if (result.meta.changes) await bucket.delete(id).catch(console.error);
  return redirect(`${admin}/${slug}`);
}

async function editMemory(db: D1Database, bucket: R2Bucket, memory: Memory, operation: string, form: FormData) {
  const back = `${admin}/${memory.slug}`;
  switch (operation) {
    case "save":
    case "publish": {
      const values = readMemory(form);
      if (!values) return errorPage(400, "Enter a title, a valid date, and a story.", back);
      await db.prepare(
        `UPDATE memories SET title = ?, body = ?, memory_date = ?,
          published_at = CASE WHEN ? = 'publish' THEN COALESCE(published_at, CURRENT_TIMESTAMP) ELSE published_at END
          WHERE slug = ?`,
      ).bind(values.title, values.body, values.date, operation, memory.slug).run();
      return redirect(back);
    }
    case "unpublish":
      await db.prepare("UPDATE memories SET published_at = NULL WHERE slug = ?").bind(memory.slug).run();
      return redirect(back);
    case "add-photo":
      return addPhoto(db, bucket, memory, form);
    case "remove-photo":
      return removePhoto(db, bucket, memory.slug, getText(form, "id"));
    default:
      return errorPage(400, "Choose a valid action.", back);
  }
}

async function handleAdmin(request: Request, env: Env, path: string[], db: D1Database, bucket: R2Bucket, siteOrigin: string) {
  const { MEMORIES_ACCESS_ISSUER: issuer, MEMORIES_ACCESS_AUD: audience, MEMORIES_OWNER_EMAIL: email } = env;
  if (!issuer || !audience || !email) return errorPage(503, "The memories editor is being set up.");
  if (!(await isOwner(request, issuer, audience, email.trim().toLowerCase()))) {
    return errorPage(403, "Sign in with the owner account to open the editor.");
  }

  const [slug, id] = path;
  if (request.method === "GET") {
    if (path.length === 0) return adminIndex(await listMemories(db, true), siteOrigin);
    if (path.length === 2 && slug === "photo" && photoPattern.test(id)) return servePhoto(db, bucket, id, true);
    if (path.length === 1 && slugPattern.test(slug)) {
      const memory = await getMemory(db, slug, true);
      if (memory) return editor(memory, await getPhotos(db, slug), siteOrigin);
    }
    return errorPage(404, "Memory not found.", admin);
  }

  if (request.method !== "POST") return errorPage(405, "Method not allowed.", admin);
  if (request.headers.get("Origin") !== env.MEMORIES_ADMIN_ORIGIN) {
    return errorPage(403, "Submit changes from the memories editor.", admin);
  }

  const contentLength = Number(request.headers.get("Content-Length"));
  if (contentLength > maxPhotoBytes + 65536) return errorPage(413, "The upload is too large.", admin);
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorPage(400, "The form could not be read.", admin);
  }

  if (!path.length) return createMemory(db, form);
  if (path.length === 1 && slugPattern.test(slug)) {
    const memory = await getMemory(db, slug, true);
    if (memory) return editMemory(db, bucket, memory, getText(form, "operation"), form);
  }
  return errorPage(404, "Memory not found.", admin);
}

export const onRequest: PagesFunction<Env, "path"> = async ({ request, env, params }) => {
  const path = Array.isArray(params.path) ? params.path : params.path ? [params.path] : [];
  const [slug, id] = path;
  const { MEMORIES_SITE_ORIGIN: siteOrigin, MEMORIES_ADMIN_ORIGIN: adminOrigin } = env;
  const expectedOrigin = slug === "admin" ? adminOrigin : siteOrigin;
  if (!siteOrigin || new URL(request.url).origin !== expectedOrigin) {
    return errorPage(404, "Page not found.");
  }

  const { MEMORIES_DB: db, MEMORIES_PHOTOS: bucket } = env;
  if (!db || !bucket) return errorPage(503, "Memories is being set up.");

  try {
    if (slug === "admin") return await handleAdmin(request, env, path.slice(1), db, bucket, siteOrigin);
    if (request.method !== "GET") return errorPage(405, "Method not allowed.");
    if (path.length === 0) return memoryIndex(await listMemories(db, false));
    if (path.length === 2 && slug === "photo" && photoPattern.test(id)) return await servePhoto(db, bucket, id, false);
    if (path.length === 1 && slugPattern.test(slug)) {
      const memory = await getMemory(db, slug, false);
      if (memory) return memoryPage(memory, await getPhotos(db, slug));
    }
    return errorPage(404, "Memory not found.");
  } catch (error) {
    console.error("Memories request failed", error);
    return errorPage(500, "Something went wrong. Try again in a moment.");
  }
};
