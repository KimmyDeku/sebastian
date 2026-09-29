import { PDFDocument, StandardFonts, rgb, degrees, type PDFFont, type PDFPage } from "pdf-lib";

export const runtime = "nodejs";
export const maxDuration = 30;

// Standard PDF fonts only cover Western European characters, so other characters are removed.
const safe = (s: any) => String(s ?? "").replace(/[^\x20-\x7E\u00A0-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022]/g, "").replace(/\s+/g, " ").trim();
const nice = (iso: string, o: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) => { try { return new Date(iso.length === 10 ? iso + "T00:00" : iso).toLocaleDateString("en-GB", o); } catch { return iso; } };

export async function POST(req: Request) {
  const { trip, who } = await req.json();
  const it = trip?.itinerary;
  if (!it?.days?.length) return Response.json({ ok: false, error: "No itinerary to download." }, { status: 400 });

  const doc = await PDFDocument.create();
  doc.setTitle(safe(`${trip.destination} itinerary`));
  doc.setAuthor("Sebastian");
  const serif = await doc.embedFont(StandardFonts.TimesRoman), serifB = await doc.embedFont(StandardFonts.TimesRomanBold);
  const sans = await doc.embedFont(StandardFonts.Helvetica), sansB = await doc.embedFont(StandardFonts.HelveticaBold);
  const gold = rgb(0.72, 0.51, 0.23), ink = rgb(0.11, 0.106, 0.098), muted = rgb(0.43, 0.415, 0.39), cream = rgb(0.97, 0.94, 0.89), line = rgb(0.9, 0.87, 0.83);
  const W = 595.28, H = 841.89, M = 50;
  let page: PDFPage, y = 0, pageNo = 0;

  const wrap = (t: string, font: PDFFont, size: number, width: number) => {
    const words = safe(t).split(" "); const lines: string[] = []; let cur = "";
    for (const w of words) { const next = cur ? `${cur} ${w}` : w; if (font.widthOfTextAtSize(next, size) > width && cur) { lines.push(cur); cur = w; } else cur = next; }
    if (cur) lines.push(cur);
    return lines;
  };
  const footer = () => {
    page.drawText("SEBASTIAN", { x: 120, y: 300, size: 90, font: serifB, color: gold, opacity: 0.045, rotate: degrees(38) });
    page.drawLine({ start: { x: M, y: 40 }, end: { x: W - M, y: 40 }, thickness: 0.5, color: line });
    page.drawText(safe(`${trip.destination} · Prepared by Sebastian`), { x: M, y: 26, size: 8, font: sans, color: muted });
    const n = `${pageNo}`; page.drawText(n, { x: W - M - sans.widthOfTextAtSize(n, 8), y: 26, size: 8, font: sans, color: muted });
  };
  const newPage = () => { page = doc.addPage([W, H]); pageNo++; y = H - 60; footer(); };
  const need = (h: number) => { if (y - h < 60) newPage(); };
  const para = (t: string, size = 10, font = sans, color = ink, x = M, width = W - 2 * M, gap = 1.45) => {
    for (const l of wrap(t, font, size, width)) { need(size * gap); page.drawText(l, { x, y, size, font, color }); y -= size * gap; }
  };
  const heading = (t: string) => { need(80); y -= 14; page.drawText(safe(t), { x: M, y, size: 17, font: serif, color: ink }); y -= 8; page.drawLine({ start: { x: M, y }, end: { x: M + 40, y }, thickness: 1.5, color: gold }); y -= 18; };

  // ---- Cover ----
  newPage();
  page.drawRectangle({ x: 0, y: H - 300, width: W, height: 300, color: ink });
  page.drawCircle({ x: M + 16, y: H - 60, size: 16, color: rgb(1, 1, 1) });
  page.drawSvgPath("M6 16 L28 28 Q30 32 28 36 L6 48 Q3 32 6 16 Z M58 16 L36 28 Q34 32 36 36 L58 48 Q61 32 58 16 Z M26.5 26 H37.5 V38 H26.5 Z", { x: M + 1.5, y: H - 45, scale: 0.46, color: ink });
  page.drawText("Sebastian", { x: M + 42, y: H - 67, size: 18, font: serif, color: rgb(1, 1, 1) });
  page.drawText("YOUR ITINERARY", { x: M, y: H - 150, size: 10, font: sansB, color: gold });
  let ty = H - 190;
  for (const l of wrap(trip.destination, serif, 40, W - 2 * M)) { page.drawText(l, { x: M, y: ty, size: 40, font: serif, color: rgb(1, 1, 1) }); ty -= 44; }
  page.drawText(safe(`${nice(trip.start, { day: "numeric", month: "long" })} to ${nice(trip.end, { day: "numeric", month: "long", year: "numeric" })}`), { x: M, y: H - 272, size: 12, font: sans, color: rgb(0.9, 0.87, 0.83) });
  y = H - 340;
  const facts: [string, string][] = [["Days", String(it.days.length)], ["Travellers", String(trip.travellers)], ["Budget", `$${Number(trip.budget).toLocaleString()}`], ["Pace", trip.pace || "Balanced"]];
  facts.forEach(([k, v], i) => {
    const x = M + i * ((W - 2 * M) / 4);
    page.drawText(k.toUpperCase(), { x, y, size: 8, font: sansB, color: muted });
    page.drawText(safe(v), { x, y: y - 20, size: 16, font: serif, color: ink });
  });
  y -= 60;
  if (who) para(`Prepared for ${who}`, 10, sans, muted);
  y -= 6;
  para(it.summary, 12, serif, ink);
  if (trip.activities?.length) { y -= 8; para(`Interests: ${trip.activities.join(", ")}`, 9.5, sans, muted); }

  // ---- Day by day ----
  heading("Day by day");
  for (const d of it.days) {
    need(120);
    page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 26, color: cream });
    page.drawText(safe(`Day ${d.day}`), { x: M + 10, y: y + 1, size: 11, font: sansB, color: gold });
    page.drawText(safe(d.title), { x: M + 62, y: y + 1, size: 11.5, font: serifB, color: ink });
    if (d.date) { const t = safe(nice(d.date)); page.drawText(t, { x: W - M - 10 - sans.widthOfTextAtSize(t, 9), y: y + 2, size: 9, font: sans, color: muted }); }
    y -= 30;
    for (const [label, text] of [["Morning", d.morning], ["Afternoon", d.afternoon], ["Evening", d.evening]] as [string, string][]) {
      if (!text) continue;
      need(28);
      page.drawText(label.toUpperCase(), { x: M + 10, y, size: 7.5, font: sansB, color: muted });
      para(text, 9.8, sans, ink, M + 90, W - 2 * M - 100, 1.4);
      y -= 4;
    }
    if (d.estCost) { need(16); para(`Estimated spend: $${d.estCost}`, 8.5, sans, muted, M + 90); }
    y -= 10;
  }

  // ---- Highlights ----
  if (it.attractions?.length) {
    heading("Highlights");
    for (const a of it.attractions) { need(30); page.drawText(safe(a.name), { x: M, y, size: 10.5, font: sansB, color: ink }); y -= 14; para(a.why, 9.5, sans, muted); y -= 6; }
  }

  // ---- Etiquette ----
  if (it.etiquette?.length) {
    heading("Local etiquette");
    for (const e of it.etiquette) { need(20); page.drawCircle({ x: M + 3, y: y + 3, size: 2, color: gold }); para(e, 10, sans, ink, M + 14, W - 2 * M - 14); y -= 3; }
    y -= 4;
    para(it.etiquetteSource ? `Based on Wikivoyage's "${it.etiquetteSource.title}" guide (CC BY-SA): ${it.etiquetteSource.url}` : "General guidance. Customs vary by region and community, so follow local lead.", 8, sans, muted);
  }

  // ---- Budget ----
  if (it.budgetBreakdown?.length) {
    heading("Budget");
    let total = 0;
    for (const b of it.budgetBreakdown) {
      need(20); const amt = `$${Number(b.amount || 0).toLocaleString()}`; total += Number(b.amount || 0);
      page.drawText(safe(b.item), { x: M, y, size: 10, font: sans, color: ink });
      page.drawText(amt, { x: W - M - sans.widthOfTextAtSize(amt, 10), y, size: 10, font: sans, color: ink });
      y -= 6; page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.4, color: line }); y -= 12;
    }
    need(20); const t = `$${total.toLocaleString()}`;
    page.drawText("Estimated total", { x: M, y, size: 10.5, font: sansB, color: ink });
    page.drawText(t, { x: W - M - sansB.widthOfTextAtSize(t, 11), y, size: 11, font: sansB, color: ink }); y -= 20;
  }

  // ---- Tips ----
  if (it.tips?.length) {
    heading("Good to know");
    for (const tip of it.tips) { need(20); page.drawCircle({ x: M + 3, y: y + 3, size: 2, color: gold }); para(tip, 10, sans, ink, M + 14, W - 2 * M - 14); y -= 3; }
  }
  y -= 12;
  para("Check the latest weather, opening hours, prices and entry requirements before you travel. AI can make mistakes.", 8.5, sans, muted);

  const bytes = await doc.save();
  const name = safe(trip.destination).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "trip";
  return new Response(Buffer.from(bytes), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="Sebastian-itinerary-${name}.pdf"` } });
}
