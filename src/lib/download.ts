"use client";
/**
 * "Download …": Sebastian saves things to the user's PC or phone. Answers, recipes, itineraries and
 * briefings as PDFs, the schedule as a calendar file, finances as spreadsheets, and direct file links.
 * Videos and posts from YouTube, TikTok, Instagram and similar are never downloaded (their rules forbid it).
 */
import { useStore } from "./store";
import { allItems, refreshGoogle } from "./clash";

export const wantsDownload = (text: string) => /\bdownload\b/i.test(text);
/** Sebastian's own "Done, I've saved…" messages, which "download that" should skip. */
export const isDownloadNote = (text?: string) => /^(Done\. I've saved|I'm sorry, I can't download|I couldn't download|What would you like me to download)/.test(String(text || ""));
type Ctx = { lastReply?: string };
export type DownloadResult = { ok: boolean; message: string; file?: string };

/* ---------- Saving a file ---------- */
export function saveBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.rel = "noopener"; a.style.display = "none";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
const slug = (s: string) => (s || "sebastian").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "sebastian";

/* ---------- PDF ---------- */
type Block = { h?: string; p?: string; li?: string[] };
export async function makePdf(title: string, blocks: Block[]): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const [regular, bold, serif] = await Promise.all([doc.embedFont(StandardFonts.Helvetica), doc.embedFont(StandardFonts.HelveticaBold), doc.embedFont(StandardFonts.TimesRoman)]);
  // Keep only characters the PDF fonts can draw.
  const safe = (s: string) => Array.from(String(s || "").replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/\u2026/g, "...").replace(/[\u2013\u2014]/g, "-").replace(/\u2605/g, "*"))
    .map((ch) => { try { regular.widthOfTextAtSize(ch, 10); return ch; } catch { return ""; } }).join("");
  const W = 595, H = 842, M = 56, ink = rgb(0.11, 0.106, 0.098), gold = rgb(0.72, 0.51, 0.23), muted = rgb(0.43, 0.42, 0.39);
  let page = doc.addPage([W, H]); let y = H - M;
  const newPage = () => { page = doc.addPage([W, H]); y = H - M; };
  const wrap = (text: string, font: any, size: number, width: number) => {
    const out: string[] = [];
    for (const para of safe(text).split(/\n/)) {
      let line = "";
      for (const w of para.split(/\s+/)) { const t = line ? `${line} ${w}` : w; if (font.widthOfTextAtSize(t, size) > width && line) { out.push(line); line = w; } else line = t; }
      out.push(line);
    }
    return out;
  };
  const write = (text: string, font: any, size: number, color = ink, indent = 0, gap = 4) => {
    for (const ln of wrap(text, font, size, W - 2 * M - indent)) { if (y < M + size) newPage(); page.drawText(ln, { x: M + indent, y, size, font, color }); y -= size + gap; }
  };
  page.drawText("SEBASTIAN", { x: M, y, size: 9, font: bold, color: gold }); y -= 30;
  write(title, serif, 22, ink, 0, 6); y -= 4;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: gold }); y -= 20;
  for (const b of blocks) {
    if (b.h) { y -= 6; write(b.h, bold, 12.5, ink, 0, 6); }
    if (b.p) { write(b.p, regular, 10.5, ink, 0, 4.5); y -= 6; }
    if (b.li) { for (const it of b.li) { if (y < M + 12) newPage(); page.drawText("-", { x: M + 2, y, size: 10.5, font: regular, color: gold }); write(it, regular, 10.5, ink, 14, 4.5); } y -= 6; }
  }
  const pages = doc.getPages();
  pages.forEach((p, i) => p.drawText(safe(`Prepared by Sebastian - page ${i + 1} of ${pages.length}`), { x: M, y: 30, size: 8, font: regular, color: muted }));
  return new Blob([await doc.save()], { type: "application/pdf" });
}

/* ---------- Calendar file and spreadsheets ---------- */
function ics(items: { id: string; title: string; start: string; end: string; location?: string }[]) {
  const t = (d: string) => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => String(s || "").replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const ev = items.map((i) => ["BEGIN:VEVENT", `UID:${i.id}@sebastian`, `DTSTAMP:${t(new Date().toISOString())}`, `DTSTART:${t(i.start)}`, `DTEND:${t(i.end)}`, `SUMMARY:${esc(i.title)}`, ...(i.location ? [`LOCATION:${esc(i.location)}`] : []), "END:VEVENT"].join("\r\n"));
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Sebastian//EN", "CALSCALE:GREGORIAN", ...ev, "END:VCALENDAR"].join("\r\n");
}
const csv = (rows: (string | number)[][]) => "\uFEFF" + rows.map((r) => r.map((c) => { const s = String(c ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\r\n");

/* ---------- Direct file links ---------- */
const NO_VIDEO = /(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|facebook\.com|fb\.watch|twitter\.com|x\.com|vimeo\.com|netflix\.com|spotify\.com|soundcloud\.com)/i;
async function downloadUrl(url: string): Promise<DownloadResult> {
  if (NO_VIDEO.test(url)) return { ok: false, message: "I'm sorry, I can't download videos or posts from that site: its rules don't allow it, and the content belongs to its creator. You can watch or save it there instead." };
  const r = await fetch(`/api/download?url=${encodeURIComponent(url)}`);
  if (!r.ok) { const j = await r.json().catch(() => ({})); return { ok: false, message: j.error || "I couldn't download that file." }; }
  const name = decodeURIComponent((r.headers.get("content-disposition") || "").match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i)?.[1] || "") || url.split("?")[0].split("/").pop() || "download";
  saveBlob(name, await r.blob());
  return { ok: true, message: `Done. I've saved ${name} to your downloads.`, file: name };
}

/** Works out what the user wants downloaded, makes the file, and saves it. */
export async function downloadFor(text: string, ctx: Ctx = {}): Promise<DownloadResult> {
  const t = text.toLowerCase();
  const s = useStore.getState(); const d: any = s.sessionId ? s.data[s.sessionId] : null;
  if (!d) return { ok: false, message: "Please sign in first." };
  const url = text.match(/https?:\/\/[^\s<>"]+/)?.[0];
  if (url) return downloadUrl(url.replace(/[).,]+$/, ""));
  const date = new Date().toISOString().slice(0, 10);

  if (/calendar|schedule|events|appointments|\bics\b/.test(t)) {
    await refreshGoogle().catch(() => null); // include Google Calendar's events when it's connected
    const items = allItems().filter((i) => new Date(i.end).getTime() > Date.now() - 30 * 86400e3);
    if (!items.length) return { ok: false, message: "Your calendar is empty, so there's nothing to download yet." };
    saveBlob(`sebastian-calendar-${date}.ics`, new Blob([ics(items)], { type: "text/calendar" }));
    return { ok: true, message: `Done. I've saved your calendar (${items.length} plan${items.length === 1 ? "" : "s"}) to your downloads. Open it to add them to Outlook, Apple or Google Calendar.`, file: "calendar" };
  }
  if (/expense|spending|transaction|income/.test(t)) {
    const rows = (d.txns || []).map((x: any) => [x.date, x.type, x.label, x.category, x.amount]);
    if (!rows.length) return { ok: false, message: "You haven't recorded any income or expenses yet." };
    saveBlob(`sebastian-income-and-expenses-${date}.csv`, new Blob([csv([["Date", "Type", "Description", "Category", "Amount"], ...rows])], { type: "text/csv" }));
    return { ok: true, message: "Done. I've saved your income and expenses as a spreadsheet in your downloads.", file: "csv" };
  }
  if (/subscription|finance|bills?\b|payments/.test(t)) {
    const subs = (d.subscriptions || []).filter((x: any) => x.active);
    if (!subs.length) return { ok: false, message: "You haven't added any subscriptions yet." };
    saveBlob(`sebastian-subscriptions-${date}.csv`, new Blob([csv([["Name", "Category", "Amount", "Currency", "How often", "Next due", "Payments recorded"], ...subs.map((x: any) => [x.name, x.category, x.amount, x.currency, x.cycle, x.nextDue, (x.payments || []).length])])], { type: "text/csv" }));
    return { ok: true, message: "Done. I've saved your subscriptions as a spreadsheet in your downloads.", file: "csv" };
  }
  if (/briefing/.test(t)) {
    const b = d.briefing; if (!b) return { ok: false, message: "There's no briefing yet. Open Daily briefing and I'll prepare one." };
    saveBlob(`sebastian-briefing-${b.date}.pdf`, await makePdf(`${b.greeting} Your daily briefing`, [{ p: b.narration }, ...(b.focus?.length ? [{ h: "Focus on today", li: b.focus }] : []), ...b.sections.map((x: any) => ({ h: x.title, li: x.items.map((i: any) => i.text) }))]));
    return { ok: true, message: "Done. I've saved today's briefing as a PDF in your downloads.", file: "pdf" };
  }
  if (/itinerar|trip|travel plan|holiday/.test(t)) {
    const trip = [...(d.trips || [])].reverse().find((x: any) => x.itinerary) || (d.trips || []).slice(-1)[0];
    if (!trip?.itinerary) return { ok: false, message: "You don't have a trip plan yet. Plan one in Travel and I'll save it for you." };
    const it = trip.itinerary;
    saveBlob(`sebastian-${slug(trip.destination)}-itinerary.pdf`, await makePdf(`${trip.destination}: your itinerary`, [
      { p: `${trip.start} to ${trip.end} · ${trip.travellers} traveller${trip.travellers > 1 ? "s" : ""}. ${it.summary || ""}` },
      ...(it.days || []).map((x: any) => ({ h: `Day ${x.day}${x.date ? ` (${x.date})` : ""}: ${x.title}`, li: [`Morning: ${x.morning}`, `Afternoon: ${x.afternoon}`, `Evening: ${x.evening}`] })),
      ...(it.attractions?.length ? [{ h: "Must-sees", li: it.attractions.map((a: any) => `${a.name}: ${a.why}`) }] : []),
      ...(it.tips?.length ? [{ h: "Tips", li: it.tips }] : []), ...(it.etiquette?.length ? [{ h: "Local etiquette", li: it.etiquette }] : [])]));
    return { ok: true, message: `Done. I've saved your ${trip.destination} itinerary as a PDF in your downloads.`, file: "pdf" };
  }
  if (/cookbook|recipes\b|all (my )?recipes/.test(t) || (/recipe/.test(t) && !(window as any).__sebastianLastRecipe)) {
    const list = d.cookbook || []; if (!list.length) return { ok: false, message: "Your cookbook is empty. Save a recipe and I'll download it for you." };
    saveBlob(`sebastian-cookbook-${date}.pdf`, await makePdf("Your cookbook", list.flatMap((r: any) => [{ h: r.title }, ...(r.summary ? [{ p: r.summary }] : []), { h: "Ingredients", li: r.ingredients || [] }, { h: "Method", li: (r.steps || []).map((x: string, i: number) => `${i + 1}. ${x}`) }])));
    return { ok: true, message: `Done. I've saved your cookbook (${list.length} recipe${list.length > 1 ? "s" : ""}) as a PDF in your downloads.`, file: "pdf" };
  }
  if (/recipe/.test(t)) {
    const r = (window as any).__sebastianLastRecipe;
    saveBlob(`${slug(r.title)}.pdf`, await makePdf(r.title, [...(r.summary ? [{ p: r.summary }] : []), { p: `Serves ${r.baseServings}${r.totalTime ? ` · ${r.totalTime}` : ""} · ${r.source}${r.url ? ` (${r.url})` : ""}` }, { h: "Ingredients", li: r.ingredients || [] }, { h: "Method", li: (r.steps || []).map((x: string, i: number) => `${i + 1}. ${x}`) }]));
    return { ok: true, message: `Done. I've saved the ${r.title} recipe as a PDF in your downloads.`, file: "pdf" };
  }
  // "Download that", "download your answer", "download this": the last reply.
  const reply = ctx.lastReply?.trim();
  if (!reply) return { ok: false, message: "What would you like me to download? For example your calendar, your cookbook, your itinerary, your briefing, or a link to a file." };
  const title = reply.split("\n").find((l) => l.trim())?.replace(/[#*_`>]/g, "").trim().slice(0, 70) || "Sebastian's answer";
  const blocks: Block[] = reply.replace(/[*_`]/g, "").split(/\n{2,}/).map((p) => (/^\s*#+\s/.test(p) ? { h: p.replace(/^\s*#+\s*/, "") } : /^\s*[-•]\s/m.test(p) ? { li: p.split("\n").map((l) => l.replace(/^\s*[-•]\s*/, "")).filter(Boolean) } : { p }));
  const first = blocks[0]; if (first && (first.p || first.h || "").replace(/[#*_`>]/g, "").trim() === title) blocks.shift(); // the title already says it
  saveBlob(`${slug(title)}.pdf`, await makePdf(title, blocks));
  return { ok: true, message: "Done. I've saved that as a PDF in your downloads.", file: "pdf" };
}
