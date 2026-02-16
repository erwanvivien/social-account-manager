interface Account {
  id: string;
  label: string;
  platform: string;
  color: string;
  active: boolean;
}

interface AccountAPI {
  addAccount: (data: {
    label: string;
    platform: string;
    color: string;
  }) => Promise<void>;
  removeAccount: (accountId: string) => Promise<void>;
  switchAccount: (accountId: string) => Promise<void>;
  getAccounts: () => Promise<Account[]>;
  reloadAccount: (accountId: string) => Promise<void>;
  navigateAccount: (accountId: string, url: string) => Promise<void>;
  onAccountsUpdated: (callback: (accounts: Account[]) => void) => void;
}

export {};
declare global {
  interface Window {
    accountAPI: AccountAPI;
  }
}

const api: AccountAPI = window.accountAPI;

// ── DOM refs ───────────────────────────────────────────────────────────────

const accountList = document.getElementById("account-list")!;
const btnAdd = document.getElementById("btn-add")!;
const modalOverlay = document.getElementById("modal-overlay")!;
const addForm = document.getElementById("add-form") as HTMLFormElement;
const btnCancel = document.getElementById("btn-cancel")!;
const inputLabel = document.getElementById("input-label") as HTMLInputElement;
const inputPlatform = document.getElementById(
  "input-platform"
) as HTMLSelectElement;
const colorDots = document.querySelectorAll<HTMLButtonElement>(".color-dot");

let selectedColor = "#6366f1";

// ── Platform icons (simple SVGs) ───────────────────────────────────────────

const PLATFORM_ICONS: Record<string, string> = {
  instagram: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
  twitter: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  facebook: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  tiktok: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48v-7.1a8.16 8.16 0 005.58 2.2V11.33a4.85 4.85 0 01-3.77-1.87z"/></svg>`,
  linkedin: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  youtube: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  reddit: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 000-.462.342.342 0 00-.462 0c-.545.533-1.684.73-2.512.73-.828 0-1.953-.21-2.498-.73a.327.327 0 00-.22-.095z"/></svg>`,
  threads: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.781 3.632 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.187.408-2.26 1.33-3.02.88-.724 2.104-1.128 3.443-1.137 1.017-.007 1.942.142 2.763.44-.07-.6-.244-1.082-.527-1.455-.39-.513-1.02-.78-1.865-.794-1.186.003-2.075.467-2.573 1.055l-1.506-1.28c.826-.978 2.156-1.584 3.975-1.59h.048c1.248.015 2.24.478 2.932 1.364.594.763.939 1.787 1.03 3.052.538.254 1.025.567 1.456.937 1.1.944 1.773 2.26 1.882 3.668.157 2.066-.58 3.956-2.074 5.32-1.744 1.593-4.074 2.41-6.93 2.434zm-1.57-8.027c-1.095.033-2.532.353-2.497 1.602.017.614.378 1.584 2.322 1.584l.26-.008c1.07-.058 2.702-.586 2.862-3.754-.703-.246-1.555-.398-2.637-.424h-.31z"/></svg>`,
};

// ── Render ──────────────────────────────────────────────────────────────────

function renderAccounts(accounts: Account[]): void {
  if (accounts.length === 0) {
    accountList.innerHTML = `
      <div class="empty-state">
        <div class="icon">+</div>
        <p>No accounts yet.<br/>Click <b>+</b> above to add one.</p>
      </div>
    `;
    return;
  }

  accountList.innerHTML = accounts
    .map(
      (a) => `
    <div class="account-item ${a.active ? "active" : ""}"
         style="--account-color: ${a.color}"
         data-id="${a.id}">
      <div class="account-dot" style="background: ${a.color}"></div>
      <div class="account-info">
        <div class="account-label">${escapeHtml(a.label)}</div>
        <div class="account-platform">
          ${PLATFORM_ICONS[a.platform] || ""} ${a.platform}
        </div>
      </div>
      <div class="account-actions">
        <button class="btn-reload" title="Reload" data-id="${a.id}">&#x21bb;</button>
        <button class="btn-delete" title="Remove" data-id="${a.id}">&times;</button>
      </div>
    </div>
  `
    )
    .join("");

  // Attach click handlers
  accountList.querySelectorAll<HTMLElement>(".account-item").forEach((el) => {
    el.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.closest(".account-actions")) return;
      const id = el.dataset.id!;
      api.switchAccount(id);
    });
  });

  accountList
    .querySelectorAll<HTMLButtonElement>(".btn-reload")
    .forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        api.reloadAccount(btn.dataset.id!);
      });
    });

  accountList
    .querySelectorAll<HTMLButtonElement>(".btn-delete")
    .forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        api.removeAccount(btn.dataset.id!);
      });
    });
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ── Modal logic ────────────────────────────────────────────────────────────

btnAdd.addEventListener("click", () => {
  modalOverlay.classList.remove("hidden");
  inputLabel.value = "";
  inputPlatform.value = "instagram";
  selectColor("#6366f1");
  inputLabel.focus();
});

btnCancel.addEventListener("click", () => {
  modalOverlay.classList.add("hidden");
});

modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) {
    modalOverlay.classList.add("hidden");
  }
});

// Color picker
function selectColor(color: string): void {
  selectedColor = color;
  colorDots.forEach((dot) => {
    dot.classList.toggle("selected", dot.dataset.color === color);
  });
}

colorDots.forEach((dot) => {
  dot.addEventListener("click", () => {
    selectColor(dot.dataset.color!);
  });
});

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const label = inputLabel.value.trim();
  const platform = inputPlatform.value;
  if (!label) return;

  await api.addAccount({ label, platform, color: selectedColor });
  modalOverlay.classList.add("hidden");
});

// ── Listen for updates from main ───────────────────────────────────────────

api.onAccountsUpdated((accounts: Account[]) => {
  renderAccounts(accounts);
});

// Initial load
api.getAccounts().then((accounts: Account[]) => {
  renderAccounts(accounts);
});
