// Sebastian Companion: keeps unfinished items until Sebastian collects them.
const id = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

async function addItem(item) {
  const { pending = [] } = await chrome.storage.local.get("pending");
  pending.unshift({ id: id(), at: new Date().toISOString(), ...item });
  await chrome.storage.local.set({ pending: pending.slice(0, 200) });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "save-page", title: "Save to Sebastian as unfinished", contexts: ["page", "link", "selection"] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const url = info.linkUrl || info.pageUrl || tab?.url || "";
  addItem({ title: (info.linkUrl ? info.selectionText || info.linkUrl : tab?.title) || url, url, note: info.linkUrl ? "" : info.selectionText || "" });
});

// Optional: a snapshot of open tabs every 15 minutes, only if the user granted the "tabs" permission.
chrome.alarms.create("tabs-snapshot", { periodInMinutes: 15 });
chrome.alarms.onAlarm.addListener(async (a) => {
  if (a.name !== "tabs-snapshot") return;
  const { watchTabs } = await chrome.storage.local.get("watchTabs");
  if (!watchTabs || !(await chrome.permissions.contains({ permissions: ["tabs"] }))) return;
  const tabs = await chrome.tabs.query({});
  const openTabs = tabs.filter((t) => t.url && /^https?:/.test(t.url) && !/localhost:3000|vercel\.app/.test(t.url)).slice(0, 30).map((t) => ({ title: t.title || t.url, url: t.url }));
  await chrome.storage.local.set({ openTabs, openTabsAt: new Date().toISOString() });
});

// Messages from the popup and from Sebastian's page.
chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  (async () => {
    if (msg.type === "add") { await addItem(msg.item); reply({ ok: true }); }
    else if (msg.type === "get") { reply(await chrome.storage.local.get(["pending", "openTabs", "openTabsAt", "watchTabs"])); }
    else if (msg.type === "remove") { const { pending = [] } = await chrome.storage.local.get("pending"); await chrome.storage.local.set({ pending: pending.filter((p) => p.id !== msg.id) }); reply({ ok: true }); }
    else if (msg.type === "delivered") { const { pending = [] } = await chrome.storage.local.get("pending"); await chrome.storage.local.set({ pending: pending.filter((p) => !msg.ids.includes(p.id)) }); reply({ ok: true }); }
  })();
  return true;
});
