"use client";
import { useMemo, useState } from "react";
import hljs from "highlight.js/lib/common";
import { Check, Copy } from "lucide-react";

const ALIASES: Record<string, string> = {
  "c++": "cpp", cc: "cpp", hpp: "cpp", h: "c", js: "javascript", jsx: "javascript", mjs: "javascript", ts: "typescript", tsx: "typescript",
  py: "python", python3: "python", sh: "bash", shell: "bash", zsh: "bash", console: "bash", html: "xml", xhtml: "xml", svg: "xml",
  "c#": "csharp", cs: "csharp", golang: "go", kt: "kotlin", yml: "yaml", md: "markdown", rb: "ruby", rs: "rust", ps1: "powershell",
};
const LABELS: Record<string, string> = {
  cpp: "C++", c: "C", csharp: "C#", javascript: "JavaScript", typescript: "TypeScript", python: "Python", java: "Java", kotlin: "Kotlin",
  go: "Go", rust: "Rust", php: "PHP", ruby: "Ruby", swift: "Swift", sql: "SQL", bash: "Bash", xml: "HTML", css: "CSS", scss: "SCSS",
  json: "JSON", yaml: "YAML", markdown: "Markdown", r: "R", dart: "Dart", lua: "Lua", perl: "Perl", powershell: "PowerShell", plaintext: "Text",
};

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch {}
  // Fallback for browsers that block the clipboard on non-secure (http) addresses.
  const ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  const ok = document.execCommand("copy");
  ta.remove();
  return ok;
}

/** A code panel with a language label, copy button and syntax colouring. Never translated. */
export function CodeBlock({ code, lang = "" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const key = lang.trim().toLowerCase();
  const id = ALIASES[key] || key;
  const { html, detected } = useMemo(() => {
    try {
      if (id && hljs.getLanguage(id)) return { html: hljs.highlight(code, { language: id, ignoreIllegals: true }).value, detected: id };
      const auto = hljs.highlightAuto(code);
      return { html: auto.value, detected: auto.language || "" };
    } catch { return { html: escapeHtml(code), detected: "" }; }
  }, [code, id]);
  const label = LABELS[id] || (lang ? lang : LABELS[detected] || "Code");

  return (
    <figure translate="no" className="my-3 rounded-2xl bg-[#1f1e1d] border border-[#2e2c2a] overflow-hidden text-left not-prose">
      <figcaption className="flex items-center justify-between px-4 h-10 text-[12px] text-[#b9b2a6]">
        <span className="font-medium">{label}</span>
        <button type="button" onClick={async () => { if (await copyText(code)) { setCopied(true); setTimeout(() => setCopied(false), 1800); } }}
          aria-label={copied ? "Copied" : `Copy ${label} code`} className="inline-flex items-center gap-1.5 h-7 px-2 rounded-lg hover:bg-white/10 text-[#e6e1d8]">
          {copied ? <><Check className="w-3.5 h-3.5" />Copied</> : <Copy className="w-4 h-4" />}
        </button>
      </figcaption>
      <pre className="overflow-x-auto px-4 pb-4 pt-1 text-[13px] leading-[1.65] text-[#e6e1d8]"><code className="hljs font-mono" dangerouslySetInnerHTML={{ __html: html }} /></pre>
    </figure>
  );
}
