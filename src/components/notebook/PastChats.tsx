"use client";
import { useState } from "react";
import { History, ChevronDown, Trash2 } from "lucide-react";
import type { PastChat } from "@/lib/notebook";
import { relTime, cx } from "@/lib/util";

/** Earlier conversations, kept when a clean one is started. Open one to continue it. */
export function PastChats({ history, onOpen, onDelete }: { history: PastChat[]; onOpen: (p: PastChat) => void; onDelete: (p: PastChat) => void }) {
  const [open, setOpen] = useState(false);
  if (!history.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-paper">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center gap-2 px-4 py-3 text-[13px]">
        <History className="w-4 h-4 text-gold" aria-hidden />Earlier conversations ({history.length})
        <ChevronDown className={cx("w-4 h-4 ml-auto text-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <ul className="border-t border-line divide-y divide-line">
          {history.map((p) => {
            const first = p.chat.find((m) => m.role === "user")?.content || "Conversation";
            return (
              <li key={p.id} className="flex items-center">
                <button onClick={() => onOpen(p)} className="flex-1 min-w-0 text-left px-4 py-2.5" title="Continue this conversation">
                  <span className="block text-[13px] truncate">{first}</span>
                  <span className="block text-[11px] text-muted">{relTime(p.at)} · {p.chat.length} messages</span>
                </button>
                <button onClick={() => onDelete(p)} aria-label="Delete this conversation" className="w-8 h-8 mr-2 rounded-full hover:bg-cream inline-flex items-center justify-center text-muted"><Trash2 className="w-3.5 h-3.5" /></button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
