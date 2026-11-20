export interface Memory {
  slug: string;
  title: string;
  body: string;
  memory_date: string;
  published_at: string | null;
  cover_id?: string | null;
  cover_alt?: string | null;
}

export interface Photo {
  id: string;
  alt: string;
}

const memoriesPath = "/memories";
const editorPath = memoriesPath + "/admin";
const dateFormat = new Intl.DateTimeFormat("en-MY", { dateStyle: "long", timeZone: "UTC" });

function escape(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function dateLabel(date: string) {
  return dateFormat.format(new Date(date + "T00:00:00Z"));
}

function page(title: string, content: string, status = 200, privatePage = false) {
  return new Response(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escape(title)} · Baltoratora</title>
  <link rel="icon" href="/favicon.png">
  <link rel="stylesheet" href="/memories.css">
</head>
<body><main>${content}</main></body>
</html>`, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      ...(privatePage ? { "X-Robots-Tag": "noindex, nofollow" } : {}),
    },
  });
}

export function errorPage(status: number, message: string, back = memoriesPath) {
  return page(message, `<a class="back" href="${escape(back)}">← Go back</a><h1>${escape(message)}</h1>`, status, true);
}

export function memoryIndex(memories: Memory[]) {
  const cards = memories.map((memory) => {
    const cover = memory.cover_id ? `<img src="${memoriesPath}/photo/${escape(memory.cover_id)}"
      alt="${escape(memory.cover_alt ?? "")}" loading="lazy" decoding="async">` : "";
    return `<li><a class="card" href="${memoriesPath}/${escape(memory.slug)}">
      ${cover}<div class="card-copy"><time datetime="${escape(memory.memory_date)}">${dateLabel(memory.memory_date)}</time>
      <h2>${escape(memory.title)}</h2></div></a></li>`;
  }).join("");
  return page("Memories", `<a class="back" href="/">← Baltoratora</a>
    <h1>Memories</h1>
    ${cards ? `<ul class="cards">${cards}</ul>` : "<p>No memories have been published yet.</p>"}`);
}

export function memoryPage(memory: Memory, photos: Photo[]) {
  const gallery = photos.map(({ id, alt }, index) => `<img src="${memoriesPath}/photo/${escape(id)}"
    alt="${escape(alt)}" loading="${index === 0 ? "eager" : "lazy"}" decoding="async">`).join("");
  return page(memory.title, `<a class="back" href="${memoriesPath}">← Memories</a>
    <article class="memory">
      <header><time datetime="${escape(memory.memory_date)}">${dateLabel(memory.memory_date)}</time>
        <h1>${escape(memory.title)}</h1></header>
      <p class="story">${escape(memory.body)}</p>
      ${gallery ? `<div class="gallery">${gallery}</div>` : ""}
    </article>`);
}

function memoryFields(memory?: Memory) {
  return `
    <label>Title <input name="title" required maxlength="100" value="${escape(memory?.title ?? "")}"></label>
    <label>Date <input type="date" name="memory_date" required value="${escape(memory?.memory_date ?? "")}"></label>
    <label>Story <textarea name="body" rows="8" maxlength="15000" required>${escape(memory?.body ?? "")}</textarea></label>`;
}

export function adminIndex(memories: Memory[], siteOrigin: string) {
  const items = memories.map((memory) => `<li><a href="${editorPath}/${escape(memory.slug)}">
    ${escape(memory.title)}</a><span>${memory.published_at ? "Published" : "Draft"}</span></li>`).join("");
  return page("Manage memories", `<a class="back" href="${escape(new URL(memoriesPath, siteOrigin).href)}">← Public memories</a>
    <h1>Manage memories</h1>
    ${items ? `<ul class="manage-list">${items}</ul>` : ""}
    <section class="panel"><h2>New memory</h2>
      <form method="post" action="${editorPath}">
        ${memoryFields()}
        <label>Page address <small>Optional. Use lowercase letters, numbers, and hyphens.</small>
          <input name="slug" maxlength="80" pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="first-hike">
        </label>
        <button type="submit">Create draft</button>
      </form>
    </section>`, 200, true);
}

export function editor(memory: Memory, photos: Photo[], siteOrigin: string) {
  const action = `${editorPath}/${escape(memory.slug)}`;
  const images = photos.map(({ id, alt }) => `<li>
    <img src="${editorPath}/photo/${escape(id)}" alt="${escape(alt)}" loading="lazy">
    <p>${escape(alt)}</p>
    <form method="post" action="${action}">
      <input type="hidden" name="id" value="${escape(id)}">
      <button class="secondary" name="operation" value="remove-photo">Remove photo</button>
    </form>
  </li>`).join("");
  const published = Boolean(memory.published_at);
  const publicUrl = new URL(`${memoriesPath}/${memory.slug}`, siteOrigin);
  return page("Edit " + memory.title, `<a class="back" href="${editorPath}">← Manage memories</a>
    <h1>Edit memory</h1>
    <p class="status">${published ? `Published · <a href="${escape(publicUrl.href)}">View public page</a>` : "Draft"}</p>
    <section class="panel">
      <form method="post" action="${action}">
        ${memoryFields()}
        <div class="actions">
          <button name="operation" value="save">${published ? "Save public changes" : "Save draft"}</button>
          ${published
            ? '<button class="secondary" name="operation" value="unpublish" formnovalidate>Unpublish</button>'
            : '<button class="secondary" name="operation" value="publish">Publish</button>'}
        </div>
      </form>
    </section>
    <section class="panel">
      <h2>Photos</h2>
      <p>The first photo is the cover. ${published ? "Photo changes appear on the public page immediately." : ""}</p>
      ${images ? `<ul class="photo-list">${images}</ul>` : ""}
      <form method="post" action="${action}" enctype="multipart/form-data">
        <label>Photo <small>JPEG, PNG, or WebP up to 8 MB.</small>
          <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required>
        </label>
        <label>Photo description <input name="alt" required maxlength="180"></label>
        <button name="operation" value="add-photo">Upload photo</button>
      </form>
    </section>`, 200, true);
}
