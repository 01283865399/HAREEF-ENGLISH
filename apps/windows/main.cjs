const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");

const defaultSiteUrl = "https://hareef-english.vercel.app/";
const siteUrl = new URL(process.env.HAREEF_SITE_URL || defaultSiteUrl);
if (siteUrl.protocol !== "https:") {
  throw new Error("HAREEF_SITE_URL must use HTTPS.");
}

const siteOrigin = siteUrl.origin;
let mainWindow;
let pendingCallback;

function isSiteUrl(value) {
  try {
    return new URL(value).origin === siteOrigin;
  } catch {
    return false;
  }
}

function isAuthCallback(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "hareefenglish:" &&
      url.hostname === "auth" &&
      (url.pathname === "/callback" || url.pathname === "/reset-password")
    );
  } catch {
    return false;
  }
}

function callbackWebsiteUrl(value) {
  const callback = new URL(value);
  const result = new URL(
    `/${callback.hostname}${callback.pathname}`,
    siteOrigin,
  );
  result.search = callback.search;
  result.hash = callback.hash;
  return result.toString();
}

function findCallback(args) {
  return args.find(isAuthCallback);
}

function navigateToCallback(value) {
  if (!isAuthCallback(value)) return;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(callbackWebsiteUrl(value));
    mainWindow.focus();
  } else {
    pendingCallback = value;
  }
}

const callbackFromLaunch = findCallback(process.argv);
if (callbackFromLaunch) pendingCallback = callbackFromLaunch;

if (process.platform === "win32" && !app.isPackaged) {
  app.setAsDefaultProtocolClient("hareefenglish", process.execPath, [
    path.resolve(process.argv[1] || "."),
  ]);
} else {
  app.setAsDefaultProtocolClient("hareefenglish");
}

const hasLock = app.requestSingleInstanceLock();
if (!hasLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, commandLine) => {
    navigateToCallback(findCallback(commandLine) || "");
  });

  app.on("open-url", (event, value) => {
    event.preventDefault();
    navigateToCallback(value);
  });

  app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
      width: 1280,
      height: 860,
      minWidth: 900,
      minHeight: 640,
      title: "حريف إنجليش",
      icon: path.join(__dirname, "icon.ico"),
      backgroundColor: "#f7f4f9",
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (
        url.startsWith("https://") ||
        url.startsWith("mailto:") ||
        url.startsWith("tel:")
      ) {
        void shell.openExternal(url).catch((error) => {
          console.error("Unable to open external link.", error);
        });
      }
      return { action: "deny" };
    });

    mainWindow.webContents.on("will-navigate", (event, url) => {
      if (isAuthCallback(url)) {
        event.preventDefault();
        navigateToCallback(url);
        return;
      }
      if (isSiteUrl(url)) return;
      event.preventDefault();
      if (
        url.startsWith("https://") ||
        url.startsWith("mailto:") ||
        url.startsWith("tel:")
      ) {
        void shell.openExternal(url).catch((error) => {
          console.error("Unable to open external navigation.", error);
        });
      }
    });

    mainWindow.loadURL(
      pendingCallback
        ? callbackWebsiteUrl(pendingCallback)
        : siteUrl.toString(),
    );
    pendingCallback = undefined;
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
