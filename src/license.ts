import electron from "electron";
const { app, net } = electron;
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const API_BASE = process.env.API_BASE_URL || "http://localhost:3000";

// ── Persistence ────────────────────────────────────────────────────────────

function getLicenseFilePath(): string {
  return path.join(app.getPath("userData"), "license.json");
}

interface StoredLicense {
  email: string;
  token: string;
  validatedAt: string;
}

function loadStoredLicense(): StoredLicense | null {
  const filePath = getLicenseFilePath();
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function storeLicense(data: StoredLicense): void {
  fs.writeFileSync(getLicenseFilePath(), JSON.stringify(data, null, 2));
}

export function clearLicense(): void {
  const filePath = getLicenseFilePath();
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

// ── Device name ────────────────────────────────────────────────────────────

export function getDeviceName(): string {
  return `${os.hostname()}-${process.platform}`;
}

// ── HTTP helpers ───────────────────────────────────────────────────────────

function postJson(url: string, body: Record<string, string>): Promise<any> {
  const json = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const request = net.request({ method: "POST", url });
    request.setHeader("Content-Type", "application/json");
    request.setHeader("Accept", "application/json");

    let responseData = "";
    request.on("response", (response) => {
      response.on("data", (chunk: Buffer) => {
        responseData += chunk.toString();
      });
      response.on("end", () => {
        try {
          resolve(JSON.parse(responseData));
        } catch {
          reject(new Error("Invalid response from server"));
        }
      });
    });
    request.on("error", reject);
    request.write(json);
    request.end();
  });
}

function getJson(url: string, token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = net.request({ method: "GET", url });
    request.setHeader("Authorization", `Bearer ${token}`);
    request.setHeader("Accept", "application/json");

    let responseData = "";
    request.on("response", (response) => {
      response.on("data", (chunk: Buffer) => {
        responseData += chunk.toString();
      });
      response.on("end", () => {
        try {
          resolve(JSON.parse(responseData));
        } catch {
          reject(new Error("Invalid response from server"));
        }
      });
    });
    request.on("error", reject);
    request.end();
  });
}

function deleteJson(url: string, token: string, body: Record<string, string>): Promise<any> {
  const json = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const request = net.request({ method: "DELETE", url });
    request.setHeader("Authorization", `Bearer ${token}`);
    request.setHeader("Content-Type", "application/json");
    request.setHeader("Accept", "application/json");

    let responseData = "";
    request.on("response", (response) => {
      response.on("data", (chunk: Buffer) => {
        responseData += chunk.toString();
      });
      response.on("end", () => {
        try {
          resolve(JSON.parse(responseData));
        } catch {
          reject(new Error("Invalid response from server"));
        }
      });
    });
    request.on("error", reject);
    request.write(json);
    request.end();
  });
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function setPassword(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const result = await postJson(`${API_BASE}/api/auth/set-password`, { email, password });
    if (result.ok) return { ok: true };
    return { ok: false, error: result.error ?? "Failed to set password." };
  } catch (err: any) {
    return { ok: false, error: err.message ?? "Could not reach the server." };
  }
}

export async function login(
  email: string,
): Promise<{ valid: boolean; needsPassword?: boolean; deviceLimitReached?: boolean; devices?: any[]; error?: string }> {
  try {
    const deviceName = getDeviceName();
    const result = await postJson(`${API_BASE}/api/auth/login`, { email, deviceName });

    if (result.token) {
      storeLicense({
        email: result.email,
        token: result.token,
        validatedAt: new Date().toISOString(),
      });
      return { valid: true };
    }

    return {
      valid: false,
      needsPassword: result.needsPassword,
      deviceLimitReached: result.deviceLimitReached,
      devices: result.devices,
      error: result.error ?? "Login failed.",
    };
  } catch (err: any) {
    return { valid: false, error: err.message ?? "Could not reach the server." };
  }
}

export async function validateStoredLicense(): Promise<boolean> {
  const stored = loadStoredLicense();
  if (!stored) return false;

  try {
    const result = await getJson(`${API_BASE}/api/license/status`, stored.token);
    if (result.valid) {
      storeLicense({ ...stored, validatedAt: new Date().toISOString() });
      return true;
    }
    return false;
  } catch {
    const validatedAt = new Date(stored.validatedAt).getTime();
    const daysSince = (Date.now() - validatedAt) / (1000 * 60 * 60 * 24);
    return daysSince < 30;
  }
}

export function hasStoredLicense(): boolean {
  return loadStoredLicense() !== null;
}

export async function getDevices(): Promise<{ devices: any[]; maxDevices: number } | null> {
  const stored = loadStoredLicense();
  if (!stored) return null;

  try {
    return await getJson(`${API_BASE}/api/devices`, stored.token);
  } catch {
    return null;
  }
}

export async function removeDevice(deviceId: string): Promise<{ ok: boolean; error?: string }> {
  const stored = loadStoredLicense();
  if (!stored) return { ok: false, error: "Not logged in." };

  try {
    const result = await deleteJson(`${API_BASE}/api/devices`, stored.token, { deviceId });
    if (result.ok) return { ok: true };
    return { ok: false, error: result.error ?? "Failed to remove device." };
  } catch (err: any) {
    return { ok: false, error: err.message ?? "Could not reach the server." };
  }
}
