const FRAC: Record<string, number> = { "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875 };

function parseQty(s: string): [number, number] | null {
  const m = s.match(/^\s*(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?\s*[½⅓⅔¼¾⅛⅜⅝⅞]?|[½⅓⅔¼¾⅛⅜⅝⅞])/);
  if (!m) return null;
  const t = m[1].trim();
  let v = 0;
  for (const part of t.split(/\s+/)) {
    if (FRAC[part]) v += FRAC[part];
    else if (part.includes("/")) { const [a, b] = part.split("/").map(Number); v += a / b; }
    else { const u = part.match(/^(\d+(?:\.\d+)?)([½⅓⅔¼¾⅛⅜⅝⅞])?$/); if (u) v += +u[1] + (u[2] ? FRAC[u[2]] : 0); }
  }
  return [v, m[0].length];
}

function pretty(n: number) {
  const whole = Math.floor(n);
  const f = n - whole;
  const opts: [number, string][] = [[0, ""], [0.125, "⅛"], [0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"], [1, ""]];
  let best = opts[0];
  for (const o of opts) if (Math.abs(o[0] - f) < Math.abs(best[0] - f)) best = o;
  const w = best[0] === 1 ? whole + 1 : whole;
  if (n >= 10) return String(Math.round(n));
  return (w ? String(w) : "") + best[1] || "0";
}

export function scaleIngredient(line: string, factor: number) {
  if (factor === 1) return line;
  const p = parseQty(line);
  if (!p) return line;
  return pretty(p[0] * factor) + line.slice(p[1]).replace(/^(\s*)/, " ");
}
