// This afterSign hook handles macOS notarization via electron-builder.
// Requires environment variables:
//   APPLE_ID          - Your Apple ID email
//   APPLE_APP_SPECIFIC_PASSWORD - App-specific password (generate at appleid.apple.com)
//   APPLE_TEAM_ID     - Your Apple Developer Team ID
//
// To set up:
// 1. Enroll in Apple Developer Program ($99/year): https://developer.apple.com/programs/
// 2. Create an app-specific password: https://support.apple.com/en-us/102654
// 3. Set the env vars above before running `npm run dist:mac`

const { notarize } = require("@electron/notarize");

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") return;

  const appId = "com.erwanvivien.social-account-manager";
  const appName = context.packager.appInfo.productFilename;

  if (process.env.SKIP_NOTARIZE === "true") {
    console.log("  Skipping notarization: SKIP_NOTARIZE is set");
    return;
  }

  if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD) {
    console.log(
      "  Skipping notarization: APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD not set",
    );
    return;
  }

  console.log(`  Notarizing ${appName}... (this can take several minutes)`);
  const start = Date.now();

  await notarize({
    appBundleId: appId,
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`  Notarization complete in ${elapsed}s.`);
};
