import { contextBridge, ipcRenderer } from "electron";

export interface AccountAPI {
  addAccount: (data: {
    label: string;
    platform: string;
    color: string;
  }) => Promise<void>;
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
      }>
    ) => void
  ) => void;
}

contextBridge.exposeInMainWorld("accountAPI", {
  addAccount: (data: { label: string; platform: string; color: string }) =>
    ipcRenderer.invoke("add-account", data),
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
      callback(accounts)
    );
  },
} satisfies AccountAPI);
