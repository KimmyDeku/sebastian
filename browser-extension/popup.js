let tab = null;
const $ = (id) => document.getElementById(id);
async function render() {
  const d = await chrome.runtime.sendMessage({ type: "get" });
  const items = d.pending || [];
  $("count").textContent = items.length ? `${items.length}` : "none";
  $("list").innerHTML = "";
  items.forEach((p) => {
    const li = document.createElement("li");
    const s = document.createElement("span"); s.textContent = p.title; s.title = p.url || "";
    const b = document.createElement("button"); b.className = "ghost"; b.textContent = "Remove";
    b.onclick = async () => { await chrome.runtime.sendMessage({ type: "remove", id: p.id }); render(); };
    li.append(s, b); $("list").append(li);
  });
  $("watch").checked = !!d.watchTabs && (await chrome.permissions.contains({ permissions: ["tabs"] }));
}
chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => { tab = t; $("current").textContent = t?.title || "This page"; });
$("save").onclick = async () => {
  await chrome.runtime.sendMessage({ type: "add", item: { title: tab?.title || tab?.url || "Untitled page", url: tab?.url || "", note: $("note").value.trim() } });
  $("note").value = ""; $("save").textContent = "Saved ✓"; setTimeout(() => ($("save").textContent = "Save this page as unfinished"), 1500); render();
};
$("watch").onchange = async (e) => {
  if (e.target.checked) {
    const ok = await chrome.permissions.request({ permissions: ["tabs"] });
    await chrome.storage.local.set({ watchTabs: ok }); e.target.checked = ok;
  } else {
    await chrome.storage.local.set({ watchTabs: false, openTabs: [] });
    chrome.permissions.remove({ permissions: ["tabs"] });
  }
};
render();
