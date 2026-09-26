import type { Itinerary } from "@/lib/types";

export async function downloadItineraryPDF(t: { destination: string; start: string; end: string; budget: number; travellers: number; address: string }, it: Itinerary, weather?: any) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 50;
  let y = M;
  const need = (h: number) => { if (y + h > H - M) { doc.addPage(); y = M; } };
  const text = (s: string, size = 10, style: "normal" | "bold" | "italic" = "normal", color = 40) => {
    doc.setFont("times", style); doc.setFontSize(size); doc.setTextColor(color);
    const lines = doc.splitTextToSize(s, W - M * 2);
    lines.forEach((l: string) => { need(size * 1.4); doc.text(l, M, y); y += size * 1.4; });
  };
  doc.setFillColor(28, 27, 25); doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(255); doc.setFont("times", "normal"); doc.setFontSize(26); doc.text(`${t.destination}`, M, 52);
  doc.setFontSize(11); doc.text(`${t.start} to ${t.end} · ${t.travellers} traveller(s) · budget $${t.budget}`, M, 72);
  y = 120;
  text(`Prepared by Sebastian for ${t.address}`, 10, "italic", 110);
  y += 6; text(it.summary, 12);
  if (weather) { y += 10; text("Weather outlook", 14, "bold", 28); text(weather.days.slice(0, 7).map((d: any) => `${d.date}: ${d.label}, ${Math.round(d.min)}–${Math.round(d.max)}°C`).join("   "), 9, "normal", 80); text("Forecasts change. Check again before you travel.", 8, "italic", 130); }
  it.days.forEach((d) => {
    y += 12; need(80);
    text(`Day ${d.day}${d.date ? " · " + d.date : ""} — ${d.title}`, 14, "bold", 28);
    text(`Morning: ${d.morning}`); text(`Afternoon: ${d.afternoon}`); text(`Evening: ${d.evening}`);
    if (d.estCost) text(`Estimated spend: $${d.estCost}`, 9, "italic", 110);
  });
  y += 12; text("Budget breakdown", 14, "bold", 28);
  it.budgetBreakdown.forEach((b) => text(`${b.item}: $${b.amount}`));
  y += 12; text("Tips", 14, "bold", 28);
  it.tips.forEach((tp) => text(`• ${tp}`));
  y += 16; text("AI can make mistakes. Verify bookings, opening hours and prices before you go.", 8, "italic", 130);
  doc.save(`Sebastian-itinerary-${t.destination.replace(/\W+/g, "-")}.pdf`);
}
