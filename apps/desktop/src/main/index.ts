import { join } from "node:path";
import { app, BrowserWindow, nativeImage, shell, type WebContents } from "electron";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { getDatabase } from "./services/database";
import { abandonOrphanRuns } from "./services/abandon-orphan-runs";
import { bootstrapE2eStub } from "./services/e2e-bootstrap";
import { seedDevAutoP2IfRequested } from "./services/dev-auto-p2-seed";
import {
  configureAcpChildLedger,
  disposeAllAcpSessions,
  reapOrphanAcpChildren
} from "@enjoy-agents/agent-harness";
import { flushActiveRuns } from "./services/flush-agent-run";
import { isQuitAllowed, markQuitAllowed } from "./services/window-quit";
import { blockNativeHistoryNavigation } from "./services/block-native-history";
import { handleAssetProtocol, registerAssetScheme } from "./services/asset-protocol";
import { registerIpc, unregisterIpc } from "./ipc";
import { startAppUpdate } from "./services/app-update";
import { scheduleOrphanRestoreAfterLoad } from "./services/restore-after-load";
import {
  focusOrRestoreWindow,
  isPrimaryInstance,
  runIfPrimaryInstance,
  startPrimaryOrExit
} from "./services/single-instance";
import appIconIco from "../../resources/icon.ico?asset";
import appIconPng from "../../resources/icon.png?asset";

if (process.env.ENJOY_DEV_USERDATA || process.env.ENJOY_E2E_USERDATA) {
  app.setPath("userData", process.env.ENJOY_DEV_USERDATA || process.env.ENJOY_E2E_USERDATA);
}
if (process.env.ENJOY_E2E_STUB === "1") {
  app.disableHardwareAcceleration();
}

registerAssetScheme();

function focusOrCreateMainWindow(): void {
  focusOrRestoreWindow(
    () => BrowserWindow.getAllWindows(),
    createWindow,
    () => app.isReady()
  );
}

startPrimaryOrExit(app, focusOrCreateMainWindow, bootPrimaryInstance, markQuitAllowed);

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

function lockPreviewWebview(contents: WebContents): void {
  contents.on("will-attach-webview", (event, webPreferences, params) => {
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = true;
    delete webPreferences.preload;
    params.partition = "persist:enjoy-preview";
    try {
      const protocol = new URL(params.src).protocol;
      if (protocol !== "http:" && protocol !== "https:") event.preventDefault();
    } catch {
      event.preventDefault();
    }
  });
}

function createWindow(): BrowserWindow {
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

  blockNativeHistoryNavigation(mainWindow);
  lockPreviewWebview(mainWindow.webContents);

  mainWindow.webContents.setWindowOpenHandler((details) => {
    try {
      const parsed = new URL(details.url);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        shell.openExternal(details.url);
      }
    } catch {
      // ignore invalid URL schemes
    }
    return { action: "deny" };
  });

  registerIpc(mainWindow);

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
  return mainWindow;
}

function restoreOrphansOnce(window: BrowserWindow): void {
  void import("./services/restore-waiting-runs").then(({ restoreWaitingRuns }) => {
    void restoreWaitingRuns(window)
  })
  void import("./services/restore-running-runs").then(({ restoreRunningRuns }) => {
    void restoreRunningRuns(window)
  })
}

function bootPrimaryInstance(): void {
  app.whenReady().then(async () => {
    electronApp.setAppUserModelId("com.enjoyagents.desktop");
    handleAssetProtocol();
    getDatabase();
    configureAcpChildLedger(join(app.getPath("userData"), "acp-children.json"))
    reapOrphanAcpChildren()
    abandonOrphanRuns();
    await bootstrapE2eStub();
    seedDevAutoP2IfRequested();
    void import("./services/workflow-runner").then(({ recoverPausedWorkflows }) => {
      void recoverPausedWorkflows()
    })
    void import("./services/builtin-tools/bridge-server").then(({ syncBridgeServerWithState }) => {
      void syncBridgeServerWithState()
    })
    app.on("browser-window-created", (_event, window) => {
      optimizer.watchWindowShortcuts(window);
    });
    applyMacDockIcon();
    const win = createWindow();
    scheduleOrphanRestoreAfterLoad(win.webContents, () => restoreOrphansOnce(win));
    startAppUpdate();
    void import("./services/automations-scheduler").then(({ startAutomationScheduler }) => {
      startAutomationScheduler()
    })
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on("before-quit", (event) => {
  if (!isPrimaryInstance()) return
  if (isQuitAllowed()) return
  event.preventDefault()
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  if (!win || win.isDestroyed() || win.webContents.isDestroyed()) {
    markQuitAllowed()
    app.quit()
    return
  }
  try {
    win.webContents.send("window.quit-requested")
  } catch {
    markQuitAllowed()
    app.quit()
  }
});

app.on("will-quit", () => {
  runIfPrimaryInstance(() => {
    void import("./services/automations-scheduler").then(({ stopAutomationScheduler }) => {
      stopAutomationScheduler()
    })
    void import("@enjoy-agents/agent-core").then(({ clearAllConversationDesktopAllows }) => {
      clearAllConversationDesktopAllows()
    })
    flushActiveRuns();
    disposeAllAcpSessions();
    void import("./services/builtin-tools/bridge-server").then(({ stopBridgeServer }) => {
      void stopBridgeServer()
    })
    void import("./services/builtin-tools/screen-overlay-service").then(({ disposeOverlayWindow }) => {
      disposeOverlayWindow()
    })
  })
});

app.on("window-all-closed", () => {
  if (!isPrimaryInstance()) return
  flushActiveRuns();
  disposeAllAcpSessions();
  unregisterIpc();
  if (process.platform !== "darwin") {
    markQuitAllowed();
    app.quit();
  }
});
