import { join } from "node:path";
import { app, BrowserWindow, shell } from "electron";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { getDatabase } from "./services/database";
import { bootstrapE2eStub } from "./services/e2e-bootstrap";
import { registerIpc, unregisterIpc } from "./ipc";
import appIconIco from "../../resources/icon.ico?asset";
import appIconPng from "../../resources/icon.png?asset";

if (process.env.ENJOY_E2E_USERDATA) {
  app.setPath("userData", process.env.ENJOY_E2E_USERDATA);
}

/** 任务栏 / Alt+Tab / 最小化缩略图用的图标路径。Windows 用多帧 ICO，其它平台用 PNG。 */
function resolveAppIconPath(): string {
  return process.platform === "win32" ? appIconIco : appIconPng;
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    title: "Enjoy Agents",
    icon: resolveAppIconPath(),
    frame: false,
    transparent: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  registerIpc(mainWindow);

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId("com.enjoyagents.desktop");
  getDatabase();
  await bootstrapE2eStub();
  void import("./services/workflow-runner").then(({ recoverPausedWorkflows }) => {
    void recoverPausedWorkflows()
  })
  app.on("browser-window-created", (_event, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  unregisterIpc();
  if (process.platform !== "darwin") app.quit();
});
