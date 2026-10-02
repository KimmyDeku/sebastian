# Sebastian Companion (browser extension)

Save pages and tasks you haven't finished; Sebastian reminds you when you next log in.

## Install it (Chrome or Edge, developer mode)
1. Open chrome://extensions (or edge://extensions) and switch on **Developer mode**.
2. Click **Load unpacked** and choose this `browser-extension` folder.
3. Pin it: click the jigsaw icon in the toolbar, then the pin next to Sebastian Companion.

## Your website address
`manifest.json` lists the addresses where Sebastian runs (under `content_scripts` → `matches`):
`http://localhost:3000/*` and `https://*.vercel.app/*`. If you use your own domain, add it there,
for example `"https://sebastian.example.com/*"`, then click the reload icon on the extension card.

## Privacy
- Saved items stay in the extension until Sebastian (open in the same browser) collects them.
- Reading open tabs is optional and needs the separate "tabs" permission, requested only when you
  switch on "Remind me about tabs I leave open".
- Nothing is sent to any other server.
