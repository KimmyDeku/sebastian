// Languages Sebastian can display. "speech" is the language used for voice recognition.
// Browsers don't offer Shona or Ndebele speech recognition yet, so those listen in English.
export const LANGUAGES = [
  { code: "en", name: "English", native: "English", speech: "en-GB" },
  { code: "sn", name: "Shona", native: "chiShona", speech: "en-GB" },
  { code: "nd", name: "Ndebele", native: "isiNdebele", speech: "en-GB" },
  { code: "fr", name: "French", native: "Français", speech: "fr-FR" },
  { code: "zh", name: "Chinese (Simplified)", native: "中文", speech: "zh-CN" },
  { code: "de", name: "German", native: "Deutsch", speech: "de-DE" },
  { code: "ja", name: "Japanese", native: "日本語", speech: "ja-JP" },
  { code: "pt", name: "Portuguese", native: "Português", speech: "pt-PT" },
];

export const LANG_NAMES: Record<string, string> = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.name]));

export function getLang(): string {
  if (typeof window === "undefined") return "en";
  try { const l = localStorage.getItem("sebastian-lang") || "en"; return LANG_NAMES[l] ? l : "en"; } catch { return "en"; }
}

export function setLang(code: string) {
  try { localStorage.setItem("sebastian-lang", code); } catch {}
  window.dispatchEvent(new CustomEvent("sebastian-lang", { detail: code }));
}

export function speechLang(): string {
  return LANGUAGES.find((l) => l.code === getLang())?.speech || "en-GB";
}
