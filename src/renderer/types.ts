export interface Account {
    id: string;
    label: string;
    platform: string;
    color: string;
    active: boolean;
}

export interface AccountAPI {
    addAccount: (data: {
        label: string;
        platform: string;
        color: string;
        url?: string;
    }) => Promise<{ ok: boolean; error?: string }>;
    removeAccount: (accountId: string) => Promise<void>;
    switchAccount: (accountId: string) => Promise<void>;
    getAccounts: () => Promise<Account[]>;
    reloadAccount: (accountId: string) => Promise<void>;
    navigateAccount: (accountId: string, url: string) => Promise<void>;
    onAccountsUpdated: (callback: (accounts: Account[]) => void) => void;
    login: (email: string) => Promise<{
        valid: boolean;
        needsPassword?: boolean;
        deviceLimitReached?: boolean;
        devices?: Array<{ id: string; name: string; lastSeen: string }>;
        error?: string;
    }>;
    setPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
    checkLicense: () => Promise<boolean>;
    getLicenseInfo: () => Promise<{ licensed: boolean }>;
    getDevices: () => Promise<{
        devices: Array<{ id: string; name: string; lastSeen: string; createdAt: string }>;
        maxDevices: number;
    } | null>;
    removeDevice: (deviceId: string) => Promise<{ ok: boolean; error?: string }>;
    onLicenseStatus: (callback: (valid: boolean) => void) => void;
    onShortcut: (callback: (action: string) => void) => void;
    openExternal: (url: string) => Promise<void>;
    logout: () => Promise<void>;
    getBaseUrl: () => string;
}

declare global {
    interface Window {
        accountAPI: AccountAPI;
    }
}
