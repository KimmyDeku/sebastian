"use client";
import { getLang } from "./i18n";

/**
 * Live page translator. It reads the text on screen, translates it in batches through
 * /api/translate, and swaps it in place. React keeps working normally because only the
 * words inside existing text nodes change. Translations are cached on this device.
 */
type Rec = { orig: string; shown?: string };
const textRec = new WeakMap<Text, Rec>();
const attrRec = new WeakMap<Element, Record<string, Rec>>();
const tracked = new Set<Node>();
const ATTRS = ["placeholder", "aria-label", "title", "alt"];
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA", "SVG", "PATH", "IFRAME"]);

let lang = "en";
let cache: Record<string, string> = {};
const failed = new Set<string>();
const pending = new Set<string>();
let timer: any = null;
let inflight = false;
let busyListener: (busy: boolean) => void = () => {};
let errorListener: (msg: string) => void = () => {};

export const onTranslateBusy = (f: (b: boolean) => void) => { busyListener = f; };
export const onTranslateError = (f: (m: string) => void) => { errorListener = f; };

function loadCache(l: string) { try { cache = JSON.parse(localStorage.getItem("sebastian-tr-" + l) || "{}"); } catch { cache = {}; } }
function saveCache() {
  try { localStorage.setItem("sebastian-tr-" + lang, JSON.stringify(cache)); }
  catch { try { localStorage.removeItem("sebastian-tr-" + lang); } catch {} }
}

const worth = (s: string) => {
  const t = s.trim();
  return t.length > 1 && /\p{L}/u.test(t) && !/^(https?:|www\.)/i.test(t) && !/^\S+@\S+\.\S+$/.test(t)
    && !/^[A-Za-z_]+\/[A-Za-z_\/+-]+$/.test(t) && t !== "Sebastian";
};

function blocked(el: Element | null) {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP.has(e.tagName.toUpperCase())) return true;
    if (e.getAttribute("translate") === "no" || e.classList.contains("notranslate") || (e as HTMLElement).isContentEditable) return true;
  }
  return false;
}

function split(s: string): [string, string, string] {
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
  return [m[1], m[2], m[3]];
}

function resolve(orig: string): string | null {
  if (lang === "en") return orig;
  const [a, core, b] = split(orig);
  if (cache[core] != null) return a + cache[core] + b;
  if (failed.has(core)) return orig;
  pending.add(core);
  schedule();
  return null;
}

function showText(node: Text) {
  const rec = textRec.get(node);
  if (!rec) return;
  const out = resolve(rec.orig);
  if (out != null && node.nodeValue !== out) { rec.shown = out; node.nodeValue = out; }
}

function trackText(node: Text) {
  const v = node.nodeValue || "";
  let rec = textRec.get(node);
  if (!rec) {
    if (!worth(v) || blocked(node.parentElement)) return;
    rec = { orig: v };
    textRec.set(node, rec);
    tracked.add(node);
  } else if (v !== rec.shown && v !== rec.orig) {
    rec.orig = v; rec.shown = undefined;
    if (!worth(v)) return;
  }
  showText(node);
}

function showAttr(el: Element, a: string, r: Rec) {
  const out = resolve(r.orig);
  if (out != null && el.getAttribute(a) !== out) { r.shown = out; el.setAttribute(a, out); }
}

function trackEl(el: Element) {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v == null) continue;
    let recs = attrRec.get(el);
    let r = recs?.[a];
    if (!r) {
      if (!worth(v) || blocked(el)) continue;
      if (!recs) { recs = {}; attrRec.set(el, recs); }
      r = recs[a] = { orig: v };
      tracked.add(el);
    } else if (v !== r.shown && v !== r.orig) { r.orig = v; r.shown = undefined; }
    showAttr(el, a, r);
  }
}

function scan(root: Node) {
  if (root.nodeType === 3) { trackText(root as Text); return; }
  if (root.nodeType !== 1) return;
  const el = root as Element;
  if (blocked(el)) return;
  trackEl(el);
  const w = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = w.nextNode())) {
    if (n.nodeType === 3) trackText(n as Text);
    else trackEl(n as Element);
  }
}

function refreshAll() {
  for (const n of tracked) {
    if (!n.isConnected) { tracked.delete(n); continue; }
    if (n.nodeType === 3) showText(n as Text);
    else { const recs = attrRec.get(n as Element); if (recs) for (const a in recs) showAttr(n as Element, a, recs[a]); }
  }
}

function schedule() {
  if (lang === "en" || timer || inflight) return;
  timer = setTimeout(flush, 120);
}

async function flush() {
  timer = null;
  const want = lang;
  // Batch by size so long paragraphs don't overflow one request.
  const batch: string[] = [];
  let chars = 0;
  for (const s of pending) {
    if (cache[s] != null || failed.has(s)) { pending.delete(s); continue; }
    if (batch.length >= 60 || (batch.length && chars + s.length > 3000)) break;
    batch.push(s); chars += s.length; pending.delete(s);
  }
  if (!batch.length) return;
  inflight = true;
  busyListener(true);
  try {
    const r = await fetch("/api/translate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lang: want, texts: batch }) });
    const j = await r.json().catch(() => ({ ok: false, error: "Unreadable response" }));
    if (want !== lang) return;
    if (j.ok) { batch.forEach((s, i) => (cache[s] = j.texts[i] ?? s)); saveCache(); }
    else { batch.forEach((s) => failed.add(s)); errorListener(j.error || "Translation is unavailable right now."); }
  } catch {
    batch.forEach((s) => failed.add(s));
    errorListener("Translation needs an internet connection.");
  } finally {
    inflight = false;
    refreshAll();
    busyListener(pending.size > 0);
    if (pending.size) schedule();
  }
}

let observer: MutationObserver | null = null;

export function startTranslator() {
  if (observer) return;
  observer = new MutationObserver((muts) => {
    if (lang === "en") return;
    for (const m of muts) {
      if (m.type === "characterData") trackText(m.target as Text);
      else if (m.type === "attributes") trackEl(m.target as Element);
      else m.addedNodes.forEach((n) => scan(n));
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  applyLanguage(getLang());
}

export function applyLanguage(l: string) {
  lang = l;
  document.documentElement.lang = l === "zh" ? "zh-CN" : l;
  pending.clear();
  failed.clear();
  if (l === "en") { refreshAll(); busyListener(false); return; }
  loadCache(l);
  refreshAll();
  scan(document.body);
}

/** Translate one piece of text (for spoken lines). Returns the original if translation fails. */
export async function translateText(text: string): Promise<string> {
  const l = getLang();
  if (l === "en") return text;
  if (l === lang && cache[text]) return cache[text];
  try {
    const r = await fetch("/api/translate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lang: l, texts: [text] }) });
    const j = await r.json();
    if (j.ok && j.texts?.[0]) { if (l === lang) { cache[text] = j.texts[0]; saveCache(); } return j.texts[0]; }
  } catch {}
  return text;
}
