import electron, {
  type BrowserWindow as BrowserWindowType,
  type WebContentsView as WebContentsViewType,
} from "electron";
const { app, BrowserWindow, WebContentsView, ipcMain, session, nativeImage, globalShortcut, Menu, Tray } = electron;
import type { Tray as TrayType, Menu as MenuType } from "electron";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import { initAutoUpdater } from "./updater.js";
import {
  activateLicense,
  validateStoredLicense,
  hasStoredLicense,
} from "./license.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Types ──────────────────────────────────────────────────────────────────

interface Account {
  id: string;
  label: string;
  platform: string;
  color: string;
}

interface AccountWithActive extends Account {
  active: boolean;
}

// ── Persistence ────────────────────────────────────────────────────────────

let DATA_DIR: string;
let ACCOUNTS_FILE: string;

function initPaths(): void {
  DATA_DIR = path.join(app.getPath("userData"), "account_manager");
  ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json");
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadAccounts(): Account[] {
  ensureDataDir();
  if (fs.existsSync(ACCOUNTS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf-8"));
    } catch {
      return [];
    }
  }
  return [];
}

function saveAccounts(accounts: Account[]): void {
  ensureDataDir();
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
}

// ── Platform URLs ──────────────────────────────────────────────────────────

const PLATFORM_URLS: Record<string, string> = {
  instagram: "https://www.instagram.com/",
  twitter: "https://x.com/",
  facebook: "https://www.facebook.com/",
  tiktok: "https://www.tiktok.com/",
  linkedin: "https://www.linkedin.com/",
  youtube: "https://www.youtube.com/",
  reddit: "https://www.reddit.com/",
  threads: "https://www.threads.net/",
};

// ── State ──────────────────────────────────────────────────────────────────

const SIDEBAR_WIDTH = 280;
const VIEW_PADDING = 8;
const VIEW_BORDER_RADIUS = 12;
const SHADOW_SPREAD = 6;
let mainWindow: BrowserWindowType | null = null;
let shadowFrame: WebContentsViewType | null = null;
let accounts: Account[] = [];
let views: Map<string, WebContentsViewType> = new Map();
let activeAccountId: string | null = null;
let tray: TrayType | null = null;
let licenseGateActive = true;
let isQuitting = false;

// ── Helpers ────────────────────────────────────────────────────────────────

function partitionKey(account: Account): string {
  return `persist:${account.platform}_${account.id}`;
}

function createShadowFrame(): WebContentsViewType {
  const view = new WebContentsView({
    webPreferences: { contextIsolation: true, sandbox: true },
  });

  const html = `
    <html><body style="margin:0;background:transparent;overflow:hidden;">
      <div style="
        width: calc(100% - ${SHADOW_SPREAD * 2}px);
        height: calc(100% - ${SHADOW_SPREAD * 2}px);
        margin: ${SHADOW_SPREAD}px;
        border-radius: ${VIEW_BORDER_RADIUS}px;
        box-shadow: 0 2px 16px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06);
      "></div>
    </body></html>`;

  view.webContents.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  view.setBackgroundColor("#00000000");

  return view;
}

function createViewForAccount(account: Account): WebContentsViewType {
  const view = new WebContentsView({
    webPreferences: {
      partition: partitionKey(account),
      contextIsolation: true,
      sandbox: true,
    },
  });

  view.setBorderRadius(VIEW_BORDER_RADIUS);

  const url = PLATFORM_URLS[account.platform] ?? "https://www.instagram.com/";
  view.webContents.loadURL(url);

  return view;
}

function layoutViews(): void {
  if (!mainWindow) return;
  const { width, height } = mainWindow.getContentBounds();
  const p = VIEW_PADDING;
  const s = SHADOW_SPREAD;

  const contentBounds = {
    x: SIDEBAR_WIDTH + p,
    y: p,
    width: width - SIDEBAR_WIDTH - p * 2,
    height: height - p * 2,
  };

  // Hide everything when license gate is active
  if (licenseGateActive) {
    if (shadowFrame) shadowFrame.setVisible(false);
    for (const [, view] of views) view.setVisible(false);
    return;
  }

  // Position shadow frame behind the active view
  if (shadowFrame) {
    if (activeAccountId && views.has(activeAccountId)) {
      shadowFrame.setBounds({
        x: contentBounds.x - s,
        y: contentBounds.y - s,
        width: contentBounds.width + s * 2,
        height: contentBounds.height + s * 2,
      });
      shadowFrame.setVisible(true);
    } else {
      shadowFrame.setVisible(false);
    }
  }

  for (const [id, view] of views) {
    if (id === activeAccountId) {
      view.setBounds(contentBounds);
      view.setVisible(true);
    } else {
      view.setVisible(false);
    }
  }
}

function switchToAccount(accountId: string): void {
  if (!mainWindow) return;

  activeAccountId = accountId;
  layoutViews();
  sendAccountList();
}

function sendAccountList(): void {
  if (!mainWindow) return;
  const payload: AccountWithActive[] = accounts.map((a) => ({
    ...a,
    active: a.id === activeAccountId,
  }));
  mainWindow.webContents.send("accounts-updated", payload);
  buildTrayMenu();
}

// ── Tray ───────────────────────────────────────────────────────────────────

function buildTrayMenu(): void {
  if (!tray) return;

  const accountItems = accounts.map((a, i) => ({
    label: `${a.label} (${a.platform})`,
    type: "radio" as const,
    checked: a.id === activeAccountId,
    click: () => {
      switchToAccount(a.id);
      mainWindow?.show();
    },
    accelerator: i < 9 ? `CmdOrCtrl+${i + 1}` : undefined,
  }));

  const template = [
    ...accountItems,
    ...(accountItems.length > 0 ? [{ type: "separator" as const }] : []),
    {
      label: "Show Window",
      click: () => mainWindow?.show(),
    },
    {
      label: "About Social Account Manager",
      click: showAboutDialog,
    },
    { type: "separator" as const },
    {
      label: "Quit",
      accelerator: "CmdOrCtrl+Q",
      click: () => app.quit(),
    },
  ];

  tray.setContextMenu(Menu.buildFromTemplate(template));
}

function createTray(): void {
  const iconPath = path.join(__dirname, "assets", "icon.png");
  const trayIcon = nativeImage
    .createFromPath(iconPath)
    .resize({ width: 18, height: 18 });

  tray = new Tray(trayIcon);
  tray.setToolTip("Social Account Manager");
  buildTrayMenu();

  tray.on("click", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// ── About ──────────────────────────────────────────────────────────────────

function showAboutDialog(): void {
  const { dialog } = electron;
  const iconPath = path.join(__dirname, "assets", "icon.png");
  dialog.showMessageBox({
    type: "info",
    title: "About Social Account Manager",
    message: "Social Account Manager",
    detail: `Version ${app.getVersion()}\n\nSwitch between social media accounts with isolated sessions.\n\n© 2026 Erwan Vivien`,
    buttons: ["OK"],
    icon: nativeImage.createFromPath(iconPath),
  });
}

// ── Keyboard shortcuts ─────────────────────────────────────────────────────

function registerShortcuts(): void {
  if (!mainWindow) return;

  // Cmd/Ctrl+N to open add-account modal
  mainWindow.webContents.on("before-input-event", (_event, input) => {
    if (
      input.type === "keyDown" &&
      (input.meta || input.control) &&
      !input.shift &&
      !input.alt
    ) {
      // Cmd+N — new account
      if (input.key === "n") {
        mainWindow?.webContents.send("shortcut", "new-account");
      }
      // Cmd+R — reload current account view
      if (input.key === "r") {
        if (activeAccountId) {
          const view = views.get(activeAccountId);
          view?.webContents.reload();
        }
        _event.preventDefault();
      }
      // Cmd+1 through Cmd+9 — switch accounts
      const num = parseInt(input.key, 10);
      if (num >= 1 && num <= 9 && num <= accounts.length) {
        switchToAccount(accounts[num - 1].id);
      }
    }
  });
}

// ── Window creation ────────────────────────────────────────────────────────

function createWindow(): void {
  initPaths();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 700,
    minHeight: 500,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0f0f0f",
    icon: path.join(__dirname, "assets", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));

  // Shadow frame sits behind all account views
  shadowFrame = createShadowFrame();
  mainWindow.contentView.addChildView(shadowFrame);

  // Restore existing accounts
  accounts = loadAccounts();
  for (const account of accounts) {
    const view = createViewForAccount(account);
    views.set(account.id, view);
    mainWindow.contentView.addChildView(view);
  }

  if (accounts.length > 0) {
    activeAccountId = accounts[0].id;
  }

  layoutViews();

  mainWindow.on("resize", () => layoutViews());

  mainWindow.webContents.on("did-finish-load", () => {
    sendAccountList();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    shadowFrame = null;
    views.clear();
  });

  // Keep running in tray on macOS when closing, but allow actual quit
  mainWindow.on("close", (e) => {
    if (process.platform === "darwin" && tray && !isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  registerShortcuts();
}

// ── IPC handlers ───────────────────────────────────────────────────────────

function registerIpcHandlers(): void {
  ipcMain.handle(
    "add-account",
    async (
      _event,
      { label, platform, color }: { label: string; platform: string; color: string }
    ): Promise<void> => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const account: Account = { id, label, platform, color };

      accounts.push(account);
      saveAccounts(accounts);

      const view = createViewForAccount(account);
      views.set(id, view);
      mainWindow?.contentView.addChildView(view);

      switchToAccount(id);
    }
  );

  ipcMain.handle(
    "remove-account",
    async (_event, accountId: string): Promise<void> => {
      const account = accounts.find((a) => a.id === accountId);
      if (!account) return;

      const view = views.get(accountId);
      if (view && mainWindow) {
        mainWindow.contentView.removeChildView(view);
        const ses = session.fromPartition(partitionKey(account));
        await ses.clearStorageData();
      }
      views.delete(accountId);

      accounts = accounts.filter((a) => a.id !== accountId);
      saveAccounts(accounts);

      if (activeAccountId === accountId) {
        activeAccountId = accounts.length > 0 ? accounts[0].id : null;
        layoutViews();
      }

      sendAccountList();
    }
  );

  ipcMain.handle(
    "switch-account",
    async (_event, accountId: string): Promise<void> => {
      switchToAccount(accountId);
    }
  );

  ipcMain.handle("get-accounts", async (): Promise<AccountWithActive[]> => {
    return accounts.map((a) => ({
      ...a,
      active: a.id === activeAccountId,
    }));
  });

  ipcMain.handle(
    "reload-account",
    async (_event, accountId: string): Promise<void> => {
      const view = views.get(accountId);
      if (view) {
        view.webContents.reload();
      }
    }
  );

  ipcMain.handle(
    "navigate-account",
    async (_event, accountId: string, url: string): Promise<void> => {
      const view = views.get(accountId);
      if (view) {
        view.webContents.loadURL(url);
      }
    }
  );

  // ── License handlers ───────────────────────────────────────────────────

  ipcMain.handle(
    "activate-license",
    async (_event, key: string): Promise<{ valid: boolean; error?: string }> => {
      const result = await activateLicense(key);
      if (result.valid) {
        mainWindow?.webContents.send("license-status", true);
      }
      return result;
    }
  );

  ipcMain.handle("check-license", async (): Promise<boolean> => {
    if (!hasStoredLicense()) return false;
    return validateStoredLicense();
  });

  ipcMain.handle("license-gate-dismissed", async (): Promise<void> => {
    licenseGateActive = false;
    layoutViews();
  });
}

// ── App lifecycle ──────────────────────────────────────────────────────────

app.setName("Social Account Manager");

app.whenReady().then(() => {
  // Set dock icon on macOS
  if (process.platform === "darwin") {
    const iconPath = path.join(__dirname, "assets", "icon.png");
    if (fs.existsSync(iconPath)) {
      app.dock?.setIcon(nativeImage.createFromPath(iconPath));
    }
  }

  // Application menu
  const appMenu = Menu.buildFromTemplate([
    {
      label: app.name,
      submenu: [
        { label: "About", click: showAboutDialog },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "front" },
      ],
    },
  ]);
  Menu.setApplicationMenu(appMenu);

  registerIpcHandlers();
  createWindow();
  createTray();
  initAutoUpdater();
});

app.on("before-quit", () => {
  isQuitting = true;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
