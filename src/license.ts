import electron from "electron";
const { app, net } = electron;
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ── Configuration ──────────────────────────────────────────────────────────
// Replace with your actual LemonSqueezy store ID after setting up the product.
// API docs: https://docs.lemonsqueezy.com/api/license-keys

const LEMONSQUEEZY_VALIDATE_URL =
  "https://api.lemonsqueezy.com/v1/licenses/validate";
const LEMONSQUEEZY_ACTIVATE_URL =
  "https://api.lemonsqueezy.com/v1/licenses/activate";

// ── Persistence ────────────────────────────────────────────────────────────

function getLicenseFilePath(): string {
  return path.join(app.getPath("userData"), "license.json");
}

interface StoredLicense {
  key: string;
  instanceId: string;
  activatedAt: string;
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

// ── Validation ─────────────────────────────────────────────────────────────

async function postForm(
  url: string,
  body: Record<string, string>
): Promise<any> {
  const formBody = Object.entries(body)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  return new Promise((resolve, reject) => {
    const request = net.request({
      method: "POST",
      url,
    });
    request.setHeader("Content-Type", "application/x-www-form-urlencoded");
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
          reject(new Error("Invalid response from license server"));
        }
      });
    });
    request.on("error", reject);
    request.write(formBody);
    request.end();
  });
}

export async function activateLicense(
  licenseKey: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const instanceName = `${os.hostname()}-${process.platform}`;
    const result = await postForm(LEMONSQUEEZY_ACTIVATE_URL, {
      license_key: licenseKey,
      instance_name: instanceName,
    });

    if (result.activated || result.valid) {
      storeLicense({
        key: licenseKey,
        instanceId: result.instance?.id ?? "local",
        activatedAt: new Date().toISOString(),
      });
      return { valid: true };
    }

    return {
      valid: false,
      error: result.error ?? "Activation failed. Please check your license key.",
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err.message ?? "Could not reach the license server.",
    };
  }
}

export async function validateStoredLicense(): Promise<boolean> {
  const stored = loadStoredLicense();
  if (!stored) return false;

  try {
    const result = await postForm(LEMONSQUEEZY_VALIDATE_URL, {
      license_key: stored.key,
      instance_id: stored.instanceId,
    });
    return result.valid === true;
  } catch {
    // If offline, trust the local license for up to 30 days
    const activatedAt = new Date(stored.activatedAt).getTime();
    const daysSince = (Date.now() - activatedAt) / (1000 * 60 * 60 * 24);
    return daysSince < 30;
  }
}

export function hasStoredLicense(): boolean {
  return loadStoredLicense() !== null;
}
