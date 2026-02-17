#!/usr/bin/env npx tsx

/**
 * Writes a dev license directly to the app's userData directory,
 * bypassing the LemonSqueezy API. For local development/testing only.
 *
 * Usage:
 *   npx tsx scripts/activate-dev-license.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

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
        appName
      );
  }
}

const userDataDir = getUserDataPath();
const licenseFile = path.join(userDataDir, "license.json");

const license = {
  key: "DEV-LICENSE-DO-NOT-DISTRIBUTE",
  instanceId: "local-dev",
  activatedAt: new Date().toISOString(),
};

fs.mkdirSync(userDataDir, { recursive: true });
fs.writeFileSync(licenseFile, JSON.stringify(license, null, 2));

console.log(`Dev license written to: ${licenseFile}`);
console.log(JSON.stringify(license, null, 2));
