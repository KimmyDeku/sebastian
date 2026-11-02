"use client";
/**
 * Notebook has been removed. This permanently deletes any Notebook data (research notebooks,
 * sources, tutoring, languages, assignments and coding chats) for every account on this device.
 * The change then syncs to the cloud copy. Coding usage is kept, because it also counts chat.
 */
import { useStore } from "./store";

export function wipeNotebookData() {
  const s = useStore.getState();
  let changed = false;
  const data: Record<string, any> = {};
  for (const [id, d0] of Object.entries(s.data || {})) {
    const d: any = { ...(d0 as any) };
    if (d.notebook) {
      d.codingUsage = d.codingUsage || d.notebook.codingUsage || [];
      delete d.notebook;
      changed = true;
    }
    if ((d.activity || []).some((a: any) => a.kind === "notebook" || String(a.href || "").startsWith("/notebook"))) {
      d.activity = d.activity.filter((a: any) => !(a.kind === "notebook" || String(a.href || "").startsWith("/notebook")));
      changed = true;
    }
    if (d.usage?.days && Object.values(d.usage.days).some((x: any) => x?.sections?.notebook)) {
      const days: any = {};
      for (const [k, v] of Object.entries(d.usage.days) as [string, any][]) {
        const sections = { ...(v.sections || {}) }; const extra = sections.notebook || 0; delete sections.notebook;
        days[k] = { ...v, total: Math.max(0, (v.total || 0) - extra), sections };
      }
      d.usage = { ...d.usage, days };
      changed = true;
    }
    data[id] = d;
  }
  if (changed) useStore.setState({ data } as any);
  try { sessionStorage.removeItem("sebastian-drive-token"); } catch {}
  return changed;
}
