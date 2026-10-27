import "./services/stdio-epipe-install";
import { join } from "node:path";
import { pruneEmptySessions } from "./services/session-lifecycle"
import { app, BrowserWindow, clipboard, dialog, nativeImage, shell, type WebContents } from "electron";
import { conflictLocale, openDatabaseOrExit } from "./services/migration-conflict-guard";
import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { getDatabase } from "./services/database";
import { abandonOrphanRuns } from "./services/abandon-orphan-runs";
import { bootstrapE2eStub } from "./services/e2e-bootstrap";
import { seedDevAutoP2IfRequested } from "./services/dev-auto-p2-seed";
import { seedDevCostIfRequested } from "./services/dev-cost-seed";
import {
  configureAcpChildLedger,
  disposeAllAcpSessions,
  reapOrphanAcpChildren
} from "@enjoy-agents/agent-harness";
import { flushActiveRuns } from "./services/flush-agent-run";
import { shouldFlushRunsOnWindowAllClosed } from "./services/flush-on-window-all-closed";
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
import { gpuCompositingArg } from "./services/gpu-compositing";
import { e2eSendWatchdogArgs, e2eStubArgs } from "./services/e2e-send-watchdog";
import { installGpuCompositing } from "./services/gpu-compositing-runtime";
import { pushGpuCompositingScript } from "./services/gpu-compositing-watch";
import { isolatedUserDataOverride } from "./services/e2e-stub-gate";

const isolatedUserData = isolatedUserDataOverride()
if (isolatedUserData) {
  app.setPath("userData", isolatedUserData);
}
const e2eStub = process.env.ENJOY_E2E_STUB === "1"
const disableHaForE2e = e2eStub && process.env.ENJOY_E2E_ALLOW_GPU !== "1"
const gpuCompositing = installGpuCompositing({
  app,
  disableHardwareAcceleration: disableHaForE2e,
  getWindows: () => BrowserWindow.getAllWindows()
})
if (disableHaForE2e) {
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
  gpuCompositing.publishCurrent()
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: e2eStub ? 400 : 1100,
    minHeight: e2eStub ? 300 : 720,
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
      additionalArguments: [gpuCompositingArg(gpuCompositing.getFlag()), ...e2eSendWatchdogArgs(), ...e2eStubArgs()],
      // 右栏浏览器预览用 <webview>，guest 无 node，partition persist:enjoy-preview。
      webviewTag: true
    }
  });

  mainWindow.on("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.on("dom-ready", () => {
    void mainWindow.webContents.executeJavaScript(pushGpuCompositingScript(gpuCompositing.getFlag()))
  })
  mainWindow.on("blur", () => {
    void import("./services/session-focus").then(({ clearFocusedSessionId }) => {
      clearFocusedSessionId()
    })
  })
  mainWindow.on("closed", () => {
    void import("./services/session-focus").then(({ clearFocusedSessionId }) => {
      clearFocusedSessionId()
    })
  })

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
  scheduleOrphanRestoreAfterLoad(mainWindow, (win) => restoreOrphansOnce(win));

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
    if (
      !openDatabaseOrExit({
        open: getDatabase,
        showMessageBoxSync: (options) => dialog.showMessageBoxSync(options),
        writeClipboard: (text) => clipboard.writeText(text),
        openPath: (path) => void shell.openPath(path),
        exit: (code) => app.exit(code),
        userDataPath: app.getPath("userData"),
        dbPath: join(app.getPath("userData"), "app.db"),
        appVersion: app.getVersion(),
        locale: conflictLocale(process.env.ENJOY_E2E_LANG, app.getLocale())
      })
    ) return;
    configureAcpChildLedger(join(app.getPath("userData"), "acp-children.json"))
    reapOrphanAcpChildren()
    abandonOrphanRuns();
    // luna P3：空「新对话」壳（无消息 / run / 草稿）启动时清掉。
    try {
      pruneEmptySessions()
    } catch (error) {
      console.error("pruneEmptySessions failed", error)
    }
    await bootstrapE2eStub();
    seedDevAutoP2IfRequested();
    await seedDevCostIfRequested();
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
    createWindow();
    gpuCompositing.refreshCompleteInfo()
    if (process.env.ENJOY_DEV_SIMULATE_GPU_GONE === "1") {
      setImmediate(() => {
        app.emit("child-process-gone", {}, { type: "GPU", reason: "crashed" })
      })
    }
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
    void import("./services/conversation-session-allow").then(({ clearAllConversationSessionAllows }) => {
      clearAllConversationSessionAllows()
    })
    flushActiveRuns({ failClosed: true });
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
  // macOS 关光窗口应用还在 Dock：不 flush、不 fail-closed，禁止碰库。
  if (shouldFlushRunsOnWindowAllClosed(process.platform)) {
    flushActiveRuns({ failClosed: true });
  }
  disposeAllAcpSessions();
  unregisterIpc();
  if (process.platform !== "darwin") {
    markQuitAllowed();
    app.quit();
  }
});
