#!/usr/bin/env npx tsx

/**
 * Writes a dev license (JWT) directly to the app's userData directory,
 * bypassing the backend API. For local development/testing only.
 *
 * Usage:
 *   npx tsx scripts/activate-dev-license.ts [email]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as crypto from "node:crypto";

const email = process.argv[2] || "dev@localhost";

function getUserDataPath(): string {
  const appName = "social-account-manager";
  switch (process.platform) {
    case "darwin":
      return path.join(os.homedir(), "Library", "Application Support", appName);
    case "win32":
      return path.join(process.env.APPDATA ?? os.homedir(), appName);
    default:
      return path.join(
        process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config"),
        appName,
      );
  }
}

// Build a simple JWT manually (HS256) so we don't need jsonwebtoken as a dep here
function makeDevJwt(payload: Record<string, unknown>, secret: string): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

const JWT_SECRET = "change-me-to-a-random-secret"; // Must match site/.env JWT_SECRET

const token = makeDevJwt(
  {
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60, // 90 days
  },
  JWT_SECRET,
);

const userDataDir = getUserDataPath();
const licenseFile = path.join(userDataDir, "license.json");

const license = {
  email,
  token,
  validatedAt: new Date().toISOString(),
};

fs.mkdirSync(userDataDir, { recursive: true });
fs.writeFileSync(licenseFile, JSON.stringify(license, null, 2));

console.log(`Dev license written to: ${licenseFile}`);
console.log(`Email: ${email}`);
console.log(`Token: ${token.slice(0, 40)}...`);
