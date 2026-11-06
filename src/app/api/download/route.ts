export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Downloads a file from a direct link the user gave (a document, image or similar), so their browser
 * can save it. Videos and posts from social and streaming sites are refused: their rules forbid it.
 * Private and local network addresses are refused too, and files are limited to 25 MB.
 */
const BLOCKED = /(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com|fb\.watch|twitter\.com|x\.com|vimeo\.com|netflix\.com|spotify\.com|soundcloud\.com)$/i;
const PRIVATE = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[?::1\]?|.*\.local$|.*\.internal$)/i;
const MAX = 25 * 1024 * 1024;

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url") || "";
  let u: URL;
  try { u = new URL(raw); } catch { return Response.json({ ok: false, error: "That doesn't look like a web address." }, { status: 400 }); }
  if (!/^https?:$/.test(u.protocol)) return Response.json({ ok: false, error: "Only web links (http or https) can be downloaded." }, { status: 400 });
  if (PRIVATE.test(u.hostname)) return Response.json({ ok: false, error: "That address can't be downloaded." }, { status: 400 });
  if (BLOCKED.test(u.hostname.replace(/^www\./, ""))) return Response.json({ ok: false, error: "I can't download videos or posts from that site: its rules don't allow it." }, { status: 400 });
  let r: Response;
  try { r = await fetch(u, { redirect: "follow", headers: { "user-agent": "SebastianAI/1.0 (download on request)" }, signal: AbortSignal.timeout(20000) }); }
  catch { return Response.json({ ok: false, error: "I couldn't reach that link." }, { status: 502 }); }
  if (!r.ok || !r.body) return Response.json({ ok: false, error: `That link returned an error (${r.status}).` }, { status: 502 });
  const type = r.headers.get("content-type") || "application/octet-stream";
  if (/text\/html/i.test(type)) return Response.json({ ok: false, error: "That link is a web page, not a file. Send me a direct link to the file (ending in .pdf, .jpg, .docx and so on), or ask me to download my answer about it." }, { status: 415 });
  if (Number(r.headers.get("content-length") || 0) > MAX) return Response.json({ ok: false, error: "That file is larger than 25 MB, so please download it directly." }, { status: 413 });
  const buf = await r.arrayBuffer();
  if (buf.byteLength > MAX) return Response.json({ ok: false, error: "That file is larger than 25 MB, so please download it directly." }, { status: 413 });
  const name = (r.headers.get("content-disposition") || "").match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i)?.[1] || decodeURIComponent(u.pathname.split("/").pop() || "download").slice(0, 120);
  return new Response(buf, { headers: { "content-type": type, "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`, "cache-control": "no-store" } });
}
