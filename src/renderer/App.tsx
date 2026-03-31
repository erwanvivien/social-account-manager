import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { Account, AccountAPI } from "./types.js";

import {
  Plus,
  ChevronDown,
  RotateCw,
  Trash2,
  Globe,
  Check,
  Lock,
} from "lucide-react";
import {
  SiInstagram,
  SiX,
  SiFacebook,
  SiTiktok,
  SiLinkedin,
  SiYoutube,
  SiReddit,
  SiThreads,
} from "react-icons/si";

const api: AccountAPI = window.accountAPI;

const CUSTOM_OPTION_VALUE = "custom";

const PLATFORM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "instagram", label: "Instagram" },
  { value: "twitter", label: "Twitter / X" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "reddit", label: "Reddit" },
  { value: "threads", label: "Threads" },
];

type PlatformKey =
  | "instagram"
  | "twitter"
  | "facebook"
  | "tiktok"
  | "linkedin"
  | "youtube"
  | "reddit"
  | "threads"
  | "custom";

const PLATFORM_ICON: Record<PlatformKey, React.ReactNode> = {
  instagram: <SiInstagram size={14} />,
  twitter: <SiX size={14} />,
  facebook: <SiFacebook size={14} />,
  tiktok: <SiTiktok size={14} />,
  linkedin: <SiLinkedin size={14} />,
  youtube: <SiYoutube size={14} />,
  reddit: <SiReddit size={14} />,
  threads: <SiThreads size={14} />,
  custom: <Globe size={14} />,
};

const COLOR_OPTIONS = [
  "#6366f1",
  "#ec4899",
  "#f97316",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ef4444",
  "#eab308",
] as const;

function platformLabel(platform: string): string {
  if (platform === CUSTOM_OPTION_VALUE) return "Custom website";
  return PLATFORM_OPTIONS.find((o) => o.value === platform)?.label ?? platform;
}

function platformIcon(platform: string): React.ReactNode {
  const key =
    (platform as PlatformKey) in PLATFORM_ICON
      ? (platform as PlatformKey)
      : "custom";
  return PLATFORM_ICON[key];
}

export default function App() {
  const SIDEBAR_MIN_WIDTH = 200;
  const SIDEBAR_MAX_WIDTH = 500;

  const [sidebarWidth, setSidebarWidth] = useState(280);
  const isDraggingRef = useRef(false);

  const [isLicensed, setIsLicensed] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // Add modal state
  const [addOpen, setAddOpen] = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("instagram");
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_OPTIONS[0]);
  const [customUrl, setCustomUrl] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  // Platform dropdown
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);

  // Sign in modal state
  const [signinOpen, setSigninOpen] = useState(false);
  const [signinEmail, setSigninEmail] = useState("");
  const [signinError, setSigninError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const labelInputRef = useRef<HTMLInputElement | null>(null);
  const platformSelectRef = useRef<HTMLDivElement | null>(null);
  const signinEmailRef = useRef<HTMLInputElement | null>(null);

  const availableOptions = useMemo(() => {
    const usedPlatforms = new Set(accounts.map((a) => a.platform));
    const base = PLATFORM_OPTIONS.map((opt) => ({
      ...opt,
      disabled: !isLicensed && usedPlatforms.has(opt.value),
    }));
    if (isLicensed) {
      base.push({
        value: CUSTOM_OPTION_VALUE,
        label: "Custom website",
        disabled: false,
      });
    }
    return base;
  }, [accounts, isLicensed]);

  const accountCountText = useMemo(
    () => `${accounts.length} / 4`,
    [accounts.length],
  );

  function closeAddModal() {
    setAddOpen(false);
    setPlatformDropdownOpen(false);
    api.setModalOpen(false);
  }

  function openAddModal() {
    if (!isLicensed && accounts.length >= 4) {
      api.openExternal(api.getBaseUrl());
      return;
    }

    const firstEnabled = availableOptions.find((o) => !o.disabled);
    if (firstEnabled) setSelectedPlatform(firstEnabled.value);

    setAddLabel("");
    setCustomUrl("");
    setSelectedColor(COLOR_OPTIONS[0]);
    setAddError(null);
    setPlatformDropdownOpen(false);
    setAddOpen(true);
    api.setModalOpen(true);

    // focus next tick
    setTimeout(() => labelInputRef.current?.focus(), 0);
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();

    const label = addLabel.trim();
    if (!label) return;

    setAddError(null);

    const data: {
      label: string;
      platform: string;
      color: string;
      url?: string;
    } = {
      label,
      platform: selectedPlatform,
      color: selectedColor,
    };

    if (selectedPlatform === CUSTOM_OPTION_VALUE) {
      const urlRaw = customUrl.trim();
      if (!urlRaw) {
        setAddError("Please enter a website URL.");
        return;
      }
      data.url = urlRaw.startsWith("http") ? urlRaw : `https://${urlRaw}`;
    }

    const result = await api.addAccount(data);
    if (result.ok) {
      closeAddModal();
    } else {
      setAddError(result.error ?? "Failed to add account.");
    }
  }

  function openSigninModal(e?: React.MouseEvent) {
    e?.preventDefault();
    setSigninEmail("");
    setSigninError(null);
    setSigningIn(false);
    setSigninOpen(true);
    api.setModalOpen(true);
    setTimeout(() => signinEmailRef.current?.focus(), 0);
  }

  function closeSigninModal() {
    setSigninOpen(false);
    api.setModalOpen(false);
  }

  async function handleSigninSubmit(e: React.FormEvent) {
    e.preventDefault();
    const email = signinEmail.trim();
    if (!email) {
      return;
    }

    setSigningIn(true);
    setSigninError(null);

    const result = await api.login(email);

    if (result.valid) {
      setIsLicensed(true);
      closeSigninModal();
    } else {
      setSigninError(
        result.error ?? "Login failed. Please check your email address.",
      );
    }

    setSigningIn(false);
  }

  async function handleLogout(e: React.MouseEvent) {
    e.preventDefault();
    await api.logout();
    setIsLicensed(false);
  }

  useEffect(() => {
    // init
    (async () => {
      const licenseInfo = await api.getLicenseInfo();
      setIsLicensed(licenseInfo.licensed);

      const initialAccounts = await api.getAccounts();
      setAccounts(initialAccounts);
    })();

    // listeners
    api.onAccountsUpdated((next) => setAccounts(next));
    api.onLicenseStatus((valid) => setIsLicensed(valid));
    api.onShortcut((action) => {
      if (action === "new-account") openAddModal();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sidebar resize drag handling
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newWidth = Math.max(
        SIDEBAR_MIN_WIDTH,
        Math.min(SIDEBAR_MAX_WIDTH, moveEvent.clientX),
      );
      setSidebarWidth(newWidth);
      api.resizeSidebar(newWidth);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!platformSelectRef.current?.contains(target)) {
        setPlatformDropdownOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // When platform changes, clear add errors and toggle URL group appropriately
  useEffect(() => {
    setAddError(null);
    // keep dropdown closed after selection if desired
  }, [selectedPlatform]);

  return (
    <>
      <div id="sidebar" style={{ width: sidebarWidth }}>
        <div id="drag-region"></div>

        <div id="sidebar-header">
          <h1>Accounts</h1>
          <button id="btn-add" title="Add account" onClick={openAddModal}>
            <Plus size={16} />
          </button>
        </div>

        <div id="account-list">
          {accounts.length === 0 ? (
            <div className="empty-state">
              <div className="icon">
                <Plus size={18} />
              </div>
              <p>
                No accounts yet.
                <br />
                Click <b>+</b> above to add one.
              </p>
            </div>
          ) : (
            accounts.map((a) => (
              <div
                key={a.id}
                className={`account-item ${a.active ? "active" : ""} ${a.locked ? "locked" : ""}`}
                style={
                  { ["--account-color" as any]: a.color } as React.CSSProperties
                }
                data-id={a.id}
                onClick={() => {
                  if (a.locked) {
                    api.openExternal(api.getBaseUrl());
                  } else {
                    api.switchAccount(a.id);
                  }
                }}
                title={a.locked ? "Upgrade to access this account" : undefined}
              >
                <div
                  className="account-dot"
                  style={{ background: a.color }}
                ></div>

                <div className="account-info">
                  <div className="account-label">
                    {a.label}
                    {a.locked && (
                      <Lock size={12} style={{ marginLeft: 6, opacity: 0.6 }} />
                    )}
                  </div>
                  <div className="account-platform">
                    {platformIcon(a.platform)} {platformLabel(a.platform)}
                  </div>
                </div>

                <div
                  className="account-actions"
                  onClick={(e) => {
                    // prevent switchAccount when clicking action area
                    e.stopPropagation();
                  }}
                >
                  <button
                    className="btn-reload"
                    title="Reload"
                    data-id={a.id}
                    onClick={() => api.reloadAccount(a.id)}
                    disabled={a.locked}
                  >
                    <RotateCw size={14} />
                  </button>
                  <button
                    className="btn-delete"
                    title="Remove"
                    data-id={a.id}
                    onClick={() => api.removeAccount(a.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar footer */}
        <div id="sidebar-footer">
          {!isLicensed ? (
            <div id="free-plan-banner">
              <div id="free-plan-row">
                <span id="plan-label">Free Plan</span>
                <span id="account-count">{accountCountText}</span>
              </div>
              <button
                id="btn-upgrade"
                onClick={() => api.openExternal(api.getBaseUrl())}
              >
                Upgrade
              </button>
              <a href="#" id="btn-show-signin" onClick={openSigninModal}>
                Already purchased? Sign in
              </a>
            </div>
          ) : (
            <div id="licensed-badge">
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Check size={14} />
                Licensed
              </span>
              <a href="#" id="btn-logout" onClick={handleLogout}>
                Log out
              </a>
            </div>
          )}
        </div>

        {/* Resize handle */}
        <div
          className="sidebar-resize-handle"
          onMouseDown={handleResizeMouseDown}
        />
      </div>

      {/* Portaled modals to escape sidebar stacking context */}
      {createPortal(
        <div
          id="modal-overlay"
          className={addOpen ? "" : "hidden"}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAddModal();
          }}
        >
          <div id="modal">
            <h2>Add Account</h2>
            <form id="add-form" onSubmit={handleAddSubmit}>
              <label htmlFor="input-label">Account name</label>
              <input
                type="text"
                id="input-label"
                placeholder="e.g. Personal, Brand…"
                required
                ref={labelInputRef}
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
              />

              <label>Platform</label>
              <div
                id="platform-select"
                className="custom-select"
                ref={platformSelectRef}
              >
                <button
                  type="button"
                  className="custom-select-trigger"
                  id="platform-trigger"
                  onClick={() => setPlatformDropdownOpen((v) => !v)}
                >
                  <span id="platform-value-text">
                    {platformLabel(selectedPlatform)}
                  </span>
                  <span className="custom-select-arrow">
                    <ChevronDown size={14} />
                  </span>
                </button>

                <div
                  id="platform-options"
                  className={`custom-select-options ${
                    platformDropdownOpen ? "" : "hidden"
                  }`}
                >
                  {availableOptions.map((opt) => {
                    const isSelected = opt.value === selectedPlatform;
                    const classes = [
                      "custom-select-option",
                      opt.disabled ? "disabled" : "",
                      isSelected ? "selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    const tooltip = opt.disabled
                      ? `Multiple ${opt.label} accounts require a license.`
                      : "";

                    return (
                      <div
                        key={opt.value}
                        className={classes}
                        data-value={opt.value}
                        title={tooltip}
                        onClick={() => {
                          if (opt.disabled) return;
                          setSelectedPlatform(opt.value);
                          setPlatformDropdownOpen(false);
                        }}
                      >
                        {opt.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              <input
                type="hidden"
                id="input-platform"
                value={selectedPlatform}
                readOnly
              />

              <div
                id="custom-url-group"
                className={
                  selectedPlatform === CUSTOM_OPTION_VALUE ? "" : "hidden"
                }
              >
                <label htmlFor="input-url">Website URL</label>
                <input
                  type="url"
                  id="input-url"
                  placeholder="https://example.com"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                />
              </div>

              <p
                id="add-error"
                className={`form-error ${addError ? "" : "hidden"}`}
              >
                {addError ?? ""}
              </p>

              <label>Color tag</label>
              <div id="color-picker">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-dot ${
                      selectedColor === c ? "selected" : ""
                    }`}
                    data-color={c}
                    style={{ background: c }}
                    onClick={() => setSelectedColor(c)}
                  />
                ))}
              </div>

              <div id="form-actions">
                <button type="button" id="btn-cancel" onClick={closeAddModal}>
                  Cancel
                </button>
                <button type="submit" id="btn-submit">
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}

      {createPortal(
        <div
          id="signin-overlay"
          className={signinOpen ? "" : "hidden"}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeSigninModal();
          }}
        >
          <div id="signin-modal">
            <h2>Sign In</h2>
            <p className="signin-desc">
              Enter your email to activate your account.
            </p>

            <form id="signin-form" onSubmit={handleSigninSubmit}>
              <input
                type="email"
                id="signin-email"
                placeholder="you@example.com"
                required
                spellCheck={false}
                autoComplete="email"
                ref={signinEmailRef}
                value={signinEmail}
                onChange={(e) => setSigninEmail(e.target.value)}
              />

              <p
                id="signin-error"
                className={`form-error ${signinError ? "" : "hidden"}`}
              >
                {signinError ?? ""}
              </p>

              <div id="signin-actions">
                <button
                  type="button"
                  id="btn-signin-cancel"
                  onClick={closeSigninModal}
                >
                  Cancel
                </button>
                <button type="submit" id="btn-signin" disabled={signingIn}>
                  {signingIn ? "Signing in..." : "Sign In"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
