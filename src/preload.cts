import { contextBridge, ipcRenderer } from "electron";

export interface AccountAPI {
  addAccount: (data: {
    label: string;
    platform: string;
    color: string;
    url?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  removeAccount: (accountId: string) => Promise<void>;
  switchAccount: (accountId: string) => Promise<void>;
  getAccounts: () => Promise<
    Array<{
      id: string;
      label: string;
      platform: string;
      color: string;
      active: boolean;
    }>
  >;
  reloadAccount: (accountId: string) => Promise<void>;
  navigateAccount: (accountId: string, url: string) => Promise<void>;
  onAccountsUpdated: (
    callback: (
      accounts: Array<{
        id: string;
        label: string;
        platform: string;
        color: string;
        active: boolean;
      }>,
    ) => void,
  ) => void;
  login: (email: string) => Promise<{
    valid: boolean;
    needsPassword?: boolean;
    deviceLimitReached?: boolean;
    devices?: Array<{ id: string; name: string; lastSeen: string }>;
    error?: string;
  }>;
  setPassword: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  checkLicense: () => Promise<boolean>;
  getLicenseInfo: () => Promise<{ licensed: boolean }>;
  getDevices: () => Promise<{
    devices: Array<{
      id: string;
      name: string;
      lastSeen: string;
      createdAt: string;
    }>;
    maxDevices: number;
  } | null>;
  removeDevice: (deviceId: string) => Promise<{ ok: boolean; error?: string }>;
  onLicenseStatus: (callback: (valid: boolean) => void) => void;
  onShortcut: (callback: (action: string) => void) => void;
  resizeSidebar: (width: number) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
  logout: () => Promise<void>;
  getBaseUrl: () => string;
}

const BASE_URL = process.env.API_BASE_URL || "https://sam.xiaojiba.dev";

contextBridge.exposeInMainWorld("accountAPI", {
  addAccount: (data: {
    label: string;
    platform: string;
    color: string;
    url?: string;
  }) => ipcRenderer.invoke("add-account", data),
  removeAccount: (accountId: string) =>
    ipcRenderer.invoke("remove-account", accountId),
  switchAccount: (accountId: string) =>
    ipcRenderer.invoke("switch-account", accountId),
  getAccounts: () => ipcRenderer.invoke("get-accounts"),
  reloadAccount: (accountId: string) =>
    ipcRenderer.invoke("reload-account", accountId),
  navigateAccount: (accountId: string, url: string) =>
    ipcRenderer.invoke("navigate-account", accountId, url),
  onAccountsUpdated: (callback: (accounts: any[]) => void) => {
    ipcRenderer.on("accounts-updated", (_event, accounts) =>
      callback(accounts),
    );
  },
  login: (email: string) => ipcRenderer.invoke("login", email),
  setPassword: (email: string, password: string) =>
    ipcRenderer.invoke("set-password", email, password),
  checkLicense: () => ipcRenderer.invoke("check-license"),
  getLicenseInfo: () => ipcRenderer.invoke("get-license-info"),
  getDevices: () => ipcRenderer.invoke("get-devices"),
  removeDevice: (deviceId: string) =>
    ipcRenderer.invoke("remove-device", deviceId),
  onLicenseStatus: (callback: (valid: boolean) => void) => {
    ipcRenderer.on("license-status", (_event, valid) => callback(valid));
  },
  onShortcut: (callback: (action: string) => void) => {
    ipcRenderer.on("shortcut", (_event, action) => callback(action));
  },
  resizeSidebar: (width: number) => ipcRenderer.invoke("resize-sidebar", width),
  openExternal: (url: string) => ipcRenderer.invoke("open-external", url),
  logout: () => ipcRenderer.invoke("logout"),
  getBaseUrl: () => BASE_URL,
} satisfies AccountAPI);
