import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;
import electron from "electron";
const { dialog } = electron;

export function initAutoUpdater(): void {
  // Don't check for updates in dev mode
  if (!electron.app.isPackaged) return;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    console.info(`Update available: ${info.version}`);
  });

  // autoUpdater.on("update-downloaded", (info) => {
  //   dialog
  //     .showMessageBox({
  //       type: "info",
  //       title: "Update Ready",
  //       message: `Version ${info.version} has been downloaded.`,
  //       detail: "The update will be installed when you restart the app.",
  //       buttons: ["Restart Now", "Later"],
  //       defaultId: 0,
  //     })
  //     .then(({ response }) => {
  //       if (response === 0) {
  //         autoUpdater.quitAndInstall();
  //       }
  //     });
  // });

  // autoUpdater.setFeedURL({
  //   // url: "https://api.github.com/repos/erwanvivien/social-account-manager/releases",
  //   provider: "github",
  //   owner: "erwanvivien",
  //   repo: "social-account-manager",
  // })

  autoUpdater.on("error", (err) => {
    console.error("Auto-update error:", err.message);
  });

  // Check for updates after a short delay
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error("Update check failed:", err.message);
    });
  }, 5000);
}
