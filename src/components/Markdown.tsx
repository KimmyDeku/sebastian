import { Fragment } from "react";
import { CodeBlock } from "./CodeBlock";

// Inline formatting: `code`, **bold**, *italic*
function inline(s: string) {
  const parts = s.split(/(`[^`\n]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("`") && p.endsWith("`") && p.length > 2 ? <code key={i} translate="no" className="px-1.5 py-0.5 rounded-md bg-cream text-[0.9em] font-mono">{p.slice(1, -1)}</code> :
    p.startsWith("**") ? <strong key={i} className="font-medium">{p.slice(2, -2)}</strong> :
    p.startsWith("*") && p.length > 2 ? <em key={i}>{p.slice(1, -1)}</em> : <Fragment key={i}>{p}</Fragment>
  );
}

function Blocks({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/).filter(Boolean);
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        const h = lines[0].match(/^(#{1,4})\s+(.*)$/);
        if (h && lines.length === 1) {
          const size = h[1].length <= 2 ? "text-[1.15rem]" : "text-[1.02rem]";
          return <p key={i} className={`font-medium ${size} pt-1`}>{inline(h[2])}</p>;
        }
        if (h) return <Fragment key={i}><p className="font-medium text-[1.02rem] pt-1">{inline(h[2])}</p><Blocks text={lines.slice(1).join("\n")} /></Fragment>;
        if (lines.every((l) => /^\s*[-•*]\s+/.test(l)))
          return <ul key={i} className="list-disc pl-5 space-y-1">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-•*]\s+/, ""))}</li>)}</ul>;
        if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l)))
          return <ol key={i} className="list-decimal pl-5 space-y-1">{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>)}</ol>;
        return <p key={i}>{lines.map((l, j) => <Fragment key={j}>{j > 0 && <br />}{inline(l)}</Fragment>)}</p>;
      })}
    </>
  );
}

/** Safe markdown renderer: headings, lists, bold, italics, inline code and fenced code blocks. */
export function Markdown({ text }: { text: string }) {
  const segments: { code?: string; lang?: string; text?: string }[] = [];
  const re = /```([^\n`]*)\n([\s\S]*?)(?:```|$)/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index) });
    segments.push({ code: m[2].replace(/\n$/, ""), lang: m[1].trim().split(/\s+/)[0] });
    last = re.lastIndex;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });

  return (
    <div className="space-y-3 min-w-0">
      {segments.map((s, i) => (s.code != null ? <CodeBlock key={i} code={s.code} lang={s.lang} /> : s.text!.trim() ? <Blocks key={i} text={s.text!} /> : null))}
    </div>
  );
}

/** Text for speaking aloud: code is left on screen rather than read out. */
export function speakable(text: string) {
  return text
    .replace(/```[\s\S]*?(```|$)/g, " I've put the code on screen for you. ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
