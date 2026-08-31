import { contextBridge, ipcRenderer } from "electron";

import type { WindowActionResult, WindowState } from "@enjoy-agents/ipc-contract";

const ide = {
  workspace: {
    open: (input?: unknown) => ipcRenderer.invoke("workspace.open", input ?? {}),
    list: () => ipcRenderer.invoke("workspace.list"),
    files: (input: unknown) => ipcRenderer.invoke("workspace.files", input),
    readFile: (input: unknown) => ipcRenderer.invoke("workspace.readFile", input),
    diff: (input: unknown) => ipcRenderer.invoke("workspace.diff", input),
    changes: (workspaceId: string) => ipcRenderer.invoke("workspace.changes", workspaceId)
  },
  session: {
    list: (workspaceId: string) => ipcRenderer.invoke("session.list", workspaceId),
    create: (workspaceId: string, title?: string) =>
      ipcRenderer.invoke("session.create", workspaceId, title),
    messages: (sessionId: string) => ipcRenderer.invoke("session.messages", sessionId)
  },
  agent: {
    run: (input: unknown) => ipcRenderer.invoke("agent.run", input),
    abort: (runId: string) => ipcRenderer.invoke("agent.abort", runId),
    decide: (decision: unknown) => ipcRenderer.invoke("agent.decide", decision),
    onEvent: (callback: (event: unknown) => void) => {
      const listener = (_event: unknown, payload: unknown) => callback(payload);
      ipcRenderer.on("agent.event", listener);
      return () => ipcRenderer.off("agent.event", listener);
    }
  },
  settings: {
    get: () => ipcRenderer.invoke("settings.get"),
    saveSecret: (input: unknown) => ipcRenderer.invoke("settings.saveSecret", input),
    setDefaultModel: (modelId: string) => ipcRenderer.invoke("settings.setDefaultModel", modelId),
    setPreferences: (input: unknown) => ipcRenderer.invoke("settings.setPreferences", input),
    setHarness: (input: unknown) => ipcRenderer.invoke("settings.setHarness", input),
    listProviders: () => ipcRenderer.invoke("settings.listProviders"),
    presets: () => ipcRenderer.invoke("settings.presets"),
    upsertProvider: (input: unknown) => ipcRenderer.invoke("settings.upsertProvider", input),
    removeProvider: (id: string) => ipcRenderer.invoke("settings.removeProvider", id),
    activateProvider: (id: string) => ipcRenderer.invoke("settings.activateProvider", id),
    setActiveModel: (input: { providerId?: string; modelId: string }) =>
      ipcRenderer.invoke("settings.setActiveModel", input),
    probeProvider: (input: unknown) => ipcRenderer.invoke("settings.probeProvider", input),
    pingProvider: (input: unknown) => ipcRenderer.invoke("settings.pingProvider", input)
  },
  automations: {
    list: () => ipcRenderer.invoke("automations.list"),
    upsert: (input: unknown) => ipcRenderer.invoke("automations.upsert", input),
    remove: (id: string) => ipcRenderer.invoke("automations.remove", id)
  },
  models: {
    list: () => ipcRenderer.invoke("models.list")
  },
  terminal: {
    open: (input: unknown) =>
      ipcRenderer.invoke("terminal.open", input) as Promise<{ sessionId: string }>,
    write: (input: unknown) => ipcRenderer.invoke("terminal.write", input),
    close: (input: unknown) => ipcRenderer.invoke("terminal.close", input),
    onData: (callback: (event: { sessionId: string; text: string }) => void) => {
      const listener = (_event: unknown, payload: { sessionId: string; text: string }) =>
        callback(payload)
      ipcRenderer.on("terminal.data", listener)
      return () => ipcRenderer.off("terminal.data", listener)
    }
  },
  window: {
    minimize: () => ipcRenderer.invoke("window.minimize") as Promise<WindowActionResult>,
    toggleMaximize: () =>
      ipcRenderer.invoke("window.toggleMaximize") as Promise<WindowState>,
    isMaximized: () =>
      ipcRenderer.invoke("window.isMaximized") as Promise<WindowState>,
    close: () => ipcRenderer.invoke("window.close") as Promise<WindowActionResult>,
    onMaximizedChange: (callback: (isMaximized: boolean) => void) => {
      const listener = (_event: unknown, payload: WindowState) =>
        callback(payload.isMaximized)
      ipcRenderer.on("window.maximized-changed", listener)
      return () => ipcRenderer.off("window.maximized-changed", listener)
    }
  }
};

contextBridge.exposeInMainWorld("ide", ide);

export type EnjoyIdeApi = typeof ide;
