// Runs only on Sebastian's own website: hands over unfinished items, then forgets them once Sebastian confirms.
(async () => {
  const send = async () => {
    const data = await chrome.runtime.sendMessage({ type: "get" });
    window.postMessage({ source: "sebastian-companion", type: "hello", version: chrome.runtime.getManifest().version, items: data.pending || [], openTabs: data.watchTabs ? data.openTabs || [] : [], openTabsAt: data.openTabsAt || null }, window.location.origin);
  };
  window.addEventListener("message", (e) => {
    if (e.source !== window || e.data?.source !== "sebastian-app") return;
    if (e.data.type === "ack" && Array.isArray(e.data.ids)) chrome.runtime.sendMessage({ type: "delivered", ids: e.data.ids });
    if (e.data.type === "ping") send();
  });
  send();
})();
