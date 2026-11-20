const title = "Aviso de privacidad del chat web de U Link Systems";
const canonical = "https://menendez.lat/aviso-de-privacidad";
const sha256 = /^[a-f0-9]{64}$/;

async function loadNotice(value) {
  try {
    const { sourceSha256, articleSha256, article } = JSON.parse(value);
    if (!sha256.test(sourceSha256) || !sha256.test(articleSha256) ||
        typeof article !== "string" || !article.startsWith("<h1")) return null;
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(article));
    const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return actual === articleSha256 ? { sourceSha256, article } : null;
  } catch {
    return null;
  }
}

export async function onRequest({ request, env }) {
  const host = new URL(request.url).hostname;
  if (host === "www.menendez.lat") return Response.redirect(canonical, 308);
  if (host !== "menendez.lat") return new Response(null, { status: 404 });
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  const notice = await loadNotice(env.ULINK_DIRECT_PRIVACY_PAGE);
  if (!notice) return new Response("Aviso temporalmente no disponible.", { status: 503 });

  const html = [
    '<!doctype html><html lang="es"><head><meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>' + title + '</title>',
    '<meta name="description" content="Consulta cómo U Link Systems trata tus datos cuando usas su chat web.">',
    '<meta name="ulink-direct-notice-sha256" content="' + notice.sourceSha256 + '">',
    '<link rel="canonical" href="' + canonical + '">',
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg">',
    '<link rel="stylesheet" href="/direct-privacy.css"></head><body>',
    '<header><nav aria-label="Navegación principal"><a href="/">U Link Systems</a></nav></header>',
    '<main><article>' + notice.article + '</article></main></body></html>',
  ].join("\n");
  return new Response(request.method === "HEAD" ? null : html, { headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store, no-transform",
    "Content-Security-Policy": "default-src 'none'; style-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'",
    "X-Content-Type-Options": "nosniff",
  } });
}
