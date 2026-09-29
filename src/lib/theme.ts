export type Theme = "light" | "dark" | "system";

export function getTheme(): Theme {
  try { return (localStorage.getItem("sebastian-theme") as Theme) || "light"; } catch { return "light"; }
}

export function applyTheme(t: Theme) {
  const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function setTheme(t: Theme) {
  try { localStorage.setItem("sebastian-theme", t); } catch {}
  applyTheme(t);
}

// Runs before the page draws, so there's no flash of the wrong theme.
export const THEME_SCRIPT = `try{var t=localStorage.getItem('sebastian-theme');if(t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;
