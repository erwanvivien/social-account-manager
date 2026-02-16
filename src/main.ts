import electron, {
  type BrowserWindow as BrowserWindowType,
  type WebContentsView as WebContentsViewType,
} from "electron";
const { app, BrowserWindow, WebContentsView, ipcMain, session, nativeImage } = electron;
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";

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
    icon: path.join(__dirname, "..", "assets", "icon.png"),
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
}

// ── App lifecycle ──────────────────────────────────────────────────────────

app.whenReady().then(() => {
  // Set dock icon on macOS
  if (process.platform === "darwin") {
    const iconPath = path.join(__dirname, "..", "assets", "icon.png");
    if (fs.existsSync(iconPath)) {
      app.dock?.setIcon(nativeImage.createFromPath(iconPath));
    }
  }

  registerIpcHandlers();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
