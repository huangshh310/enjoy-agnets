import { join } from "node:path";
import { app, BrowserWindow, nativeImage, shell } from "electron";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { getDatabase } from "./services/database";
import { bootstrapE2eStub } from "./services/e2e-bootstrap";
import { flushActiveRuns } from "./services/flush-agent-run";
import { handleAssetProtocol, registerAssetScheme } from "./services/asset-protocol";
import { registerIpc, unregisterIpc } from "./ipc";
import appIconIco from "../../resources/icon.ico?asset";
import appIconPng from "../../resources/icon.png?asset";

if (process.env.ENJOY_E2E_USERDATA) {
  app.setPath("userData", process.env.ENJOY_E2E_USERDATA);
}

registerAssetScheme();

/** 任务栏 / Alt+Tab / 最小化缩略图用的图标路径。Windows 用多帧 ICO，其它平台用 PNG。 */
function resolveAppIconPath(): string {
  return process.platform === "win32" ? appIconIco : appIconPng;
}

/**
 * macOS 会忽略 BrowserWindow.icon，开发态进程又是 Electron.app。
 * Dock / Cmd+Tab 必须在 ready 之后单独设，否则一直显示 Electron 默认标。
 */
function applyMacDockIcon(): void {
  if (process.platform !== "darwin" || app.dock == null) return;
  const image = nativeImage.createFromPath(appIconPng);
  if (image.isEmpty()) return;
  app.dock.setIcon(image);
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
    // Windows acrylic 铺满矩形 HWND，CSS 圆角切不掉四角。磨砂走渲染层。
    ...(process.platform === "darwin" ? { vibrancy: "fullscreen-ui" as const } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // 右栏浏览器预览用 <webview>，guest 无 node，partition persist:enjoy-preview。
      webviewTag: true
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
  handleAssetProtocol();
  getDatabase();
  await bootstrapE2eStub();
  void import("./services/workflow-runner").then(({ recoverPausedWorkflows }) => {
    void recoverPausedWorkflows()
  })
  app.on("browser-window-created", (_event, window) => {
    optimizer.watchWindowShortcuts(window);
  });
  applyMacDockIcon();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  flushActiveRuns();
});

app.on("window-all-closed", () => {
  flushActiveRuns();
  unregisterIpc();
  if (process.platform !== "darwin") app.quit();
});
