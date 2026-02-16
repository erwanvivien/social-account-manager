# Architecture

## How it works

Each account gets its own Electron [session partition](https://www.electronjs.org/docs/latest/api/session#sessionfrompartitionpartition-options) (`persist:<platform>_<id>`). This means:

- Cookies and storage are **completely isolated** between accounts
- Sessions are **persisted to disk** — you stay logged in across app restarts
- Switching accounts is **instant** — no page reloads, just show/hide the right view

## Window structure

The app uses a single `BrowserWindow` with multiple layered `WebContentsView` children:

```
BrowserWindow
 └─ contentView
      ├─ (main webContents)   ← sidebar HTML/CSS/JS
      ├─ shadowFrame view     ← renders CSS box-shadow behind the active view
      ├─ account view 1       ← partition: persist:instagram_<id>
      ├─ account view 2       ← partition: persist:twitter_<id>
      └─ ...
```

Only the active account view is visible at any time. Inactive views are hidden via `setVisible(false)` — their web contents stay alive in the background so sessions aren't interrupted.

## Session isolation

When a new account is created, a `WebContentsView` is instantiated with a unique partition string:

```typescript
const view = new WebContentsView({
  webPreferences: {
    partition: `persist:${platform}_${id}`,
  },
});
```

The `persist:` prefix tells Electron to store the session on disk. Different partition strings never share cookies, localStorage, IndexedDB, or cache. This is what allows multiple logins on the same platform.

## IPC communication

The sidebar (renderer process) communicates with the main process through a preload script that exposes a typed API via `contextBridge`:

```
Renderer  ──  accountAPI.addAccount(...)  ──►  ipcMain.handle("add-account")
          ◄──  "accounts-updated" event   ──   mainWindow.webContents.send(...)
```

All account mutations (add, remove, switch, reload) go through IPC handlers in the main process, which owns the views and persists the account list to disk as JSON.

## Persistence

Account metadata (id, label, platform, color) is stored in a JSON file at:

```
<userData>/account_manager/accounts.json
```

Session data (cookies, storage) lives in Electron's partition storage under the app's userData directory, managed automatically by Chromium.

## Project structure

```
src/
  main.ts            # Main process — window, views, IPC, persistence
  preload.cts        # Preload script (CJS) — exposes IPC bridge to renderer
  renderer/
    index.html       # Sidebar markup
    styles.css       # Dark theme styling
    renderer.ts      # Sidebar logic — account list, modal, event handlers
    tsconfig.json    # Separate tsconfig for browser-targeted compilation
```
