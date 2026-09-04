import { contextBridge, ipcRenderer } from "electron";

import type { WindowActionResult, WindowState } from "@enjoy-agents/ipc-contract";

const ide = {
  workspace: {
    open: (input?: unknown) => ipcRenderer.invoke("workspace.open", input ?? {}),
    pickFolder: () => ipcRenderer.invoke("workspace.pickFolder"),
    pickFile: () => ipcRenderer.invoke("workspace.pickFile"),
    remove: (input: unknown) => ipcRenderer.invoke("workspace.remove", input),
    list: () => ipcRenderer.invoke("workspace.list"),
    files: (input: unknown) => ipcRenderer.invoke("workspace.files", input),
    readFile: (input: unknown) => ipcRenderer.invoke("workspace.readFile", input),
    diff: (input: unknown) => ipcRenderer.invoke("workspace.diff", input),
    changes: (input: unknown) => ipcRenderer.invoke("workspace.changes", input),
    gitLog: (input: unknown) => ipcRenderer.invoke("workspace.gitLog", input),
    gitCommit: (input: unknown) => ipcRenderer.invoke("workspace.gitCommit", input),
    gitPush: (input: unknown) => ipcRenderer.invoke("workspace.gitPush", input),
    gitPatch: (input: unknown) => ipcRenderer.invoke("workspace.gitPatch", input)
  },
  session: {
    list: (input: unknown) => ipcRenderer.invoke("session.list", input),
    create: (input: unknown) => ipcRenderer.invoke("session.create", input),
    messages: (input: unknown) => ipcRenderer.invoke("session.messages", input),
    rename: (input: unknown) => ipcRenderer.invoke("session.rename", input),
    listArchived: () => ipcRenderer.invoke("session.listArchived"),
    archive: (input: unknown) => ipcRenderer.invoke("session.archive", input),
    unarchive: (input: unknown) => ipcRenderer.invoke("session.unarchive", input),
    delete: (input: unknown) => ipcRenderer.invoke("session.delete", input),
    deleteArchived: () => ipcRenderer.invoke("session.deleteArchived"),
    compact: (input: unknown) => ipcRenderer.invoke("session.compact", input),
    getCompaction: (input: unknown) => ipcRenderer.invoke("session.getCompaction", input),
    clearCompaction: (input: unknown) => ipcRenderer.invoke("session.clearCompaction", input)
  },
  agent: {
    run: (input: unknown) => ipcRenderer.invoke("agent.run", input),
    abort: (runId: string) => ipcRenderer.invoke("agent.abort", runId),
    decide: (decision: unknown) => ipcRenderer.invoke("agent.decide", decision),
    inspectPrompt: (input: unknown) => ipcRenderer.invoke("agent.inspectPrompt", input),
    onEvent: (callback: (event: unknown) => void) => {
      const listener = (_event: unknown, payload: unknown) => callback(payload);
      ipcRenderer.on("agent.event", listener);
      return () => ipcRenderer.off("agent.event", listener);
    }
  },
  settings: {
    get: () => ipcRenderer.invoke("settings.get"),
    saveSecret: (input: unknown) => ipcRenderer.invoke("settings.saveSecret", input),
    setDefaultModel: (input: unknown) => ipcRenderer.invoke("settings.setDefaultModel", input),
    setPreferences: (input: unknown) => ipcRenderer.invoke("settings.setPreferences", input),
    setHarness: (input: unknown) => ipcRenderer.invoke("settings.setHarness", input),
    listProviders: () => ipcRenderer.invoke("settings.listProviders"),
    presets: () => ipcRenderer.invoke("settings.presets"),
    upsertProvider: (input: unknown) => ipcRenderer.invoke("settings.upsertProvider", input),
    removeProvider: (input: unknown) => ipcRenderer.invoke("settings.removeProvider", input),
    activateProvider: (input: unknown) => ipcRenderer.invoke("settings.activateProvider", input),
    setActiveModel: (input: { providerId?: string; modelId: string }) =>
      ipcRenderer.invoke("settings.setActiveModel", input),
    probeProvider: (input: unknown) => ipcRenderer.invoke("settings.probeProvider", input),
    pingProvider: (input: unknown) => ipcRenderer.invoke("settings.pingProvider", input)
  },
  automations: {
    list: () => ipcRenderer.invoke("automations.list"),
    upsert: (input: unknown) => ipcRenderer.invoke("automations.upsert", input),
    remove: (input: unknown) => ipcRenderer.invoke("automations.remove", input)
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
  ai: {
    generate: (input: unknown) => ipcRenderer.invoke("ai.generate", input),
    abort: (runId: string) => ipcRenderer.invoke("ai.abort", { runId }),
    resume: (runId: string) => ipcRenderer.invoke("ai.resume", { runId })
  },
  assets: {
    import: (input: unknown) => ipcRenderer.invoke("assets.import", input),
    list: () => ipcRenderer.invoke("assets.list"),
    read: (id: string) => ipcRenderer.invoke("assets.read", { id }),
    export: (input: unknown) => ipcRenderer.invoke("assets.export", input),
    delete: (id: string) => ipcRenderer.invoke("assets.delete", { id }),
    upload: (input: unknown) => ipcRenderer.invoke("assets.upload", input)
  },
  knowledge: {
    sources: (workspaceId: string) => ipcRenderer.invoke("knowledge.sources", { workspaceId }),
    documents: (input: unknown) => ipcRenderer.invoke("knowledge.documents", input),
    addSource: (input: unknown) => ipcRenderer.invoke("knowledge.addSource", input),
    index: (input: unknown) => ipcRenderer.invoke("knowledge.index", input),
    search: (input: unknown) => ipcRenderer.invoke("knowledge.search", input),
    cancel: (sourceId: string) => ipcRenderer.invoke("knowledge.cancel", { sourceId }),
    remove: (sourceId: string) => ipcRenderer.invoke("knowledge.remove", { sourceId })
  },
  workflow: {
    list: (input?: unknown) => ipcRenderer.invoke("workflow.list", input ?? {}),
    get: (runId: string) => ipcRenderer.invoke("workflow.get", { runId }),
    start: (input: unknown) => ipcRenderer.invoke("workflow.start", input),
    recover: () => ipcRenderer.invoke("workflow.recover", {}),
    resume: (runId: string) => ipcRenderer.invoke("workflow.resume", { runId }),
    cancel: (runId: string) => ipcRenderer.invoke("workflow.cancel", { runId }),
    retry: (runId: string) => ipcRenderer.invoke("workflow.retry", { runId })
  },
  mcp: {
    servers: () => ipcRenderer.invoke("mcp.servers"),
    upsert: (input: unknown) => ipcRenderer.invoke("mcp.upsert", input),
    remove: (id: string) => ipcRenderer.invoke("mcp.remove", { id }),
    connect: (id: string) => ipcRenderer.invoke("mcp.connect", { id }),
    disconnect: (id: string) => ipcRenderer.invoke("mcp.disconnect", { id }),
    test: (id: string) => ipcRenderer.invoke("mcp.test", { id }),
    tools: (id: string) => ipcRenderer.invoke("mcp.tools", { id }),
    call: (input: unknown) => ipcRenderer.invoke("mcp.call", input),
    setPermission: (input: unknown) => ipcRenderer.invoke("mcp.setPermission", input),
    openApp: (input: unknown) => ipcRenderer.invoke("mcp.openApp", input),
    appMessage: (input: unknown) => ipcRenderer.invoke("mcp.appMessage", input)
  },
  skills: {
    list: (input?: unknown) => ipcRenderer.invoke("skills.list", input ?? {}),
    read: (skillFilePath: string) => ipcRenderer.invoke("skills.read", { skillFilePath }),
    create: (input: unknown) => ipcRenderer.invoke("skills.create", input),
    delete: (directoryPath: string) => ipcRenderer.invoke("skills.delete", { directoryPath }),
    reveal: (directoryPath: string) => ipcRenderer.invoke("skills.reveal", { directoryPath })
  },
  rules: {
    list: (input?: unknown) => ipcRenderer.invoke("rules.list", input ?? {}),
    read: (filePath: string) => ipcRenderer.invoke("rules.read", { filePath }),
    create: (input: unknown) => ipcRenderer.invoke("rules.create", input),
    delete: (filePath: string) => ipcRenderer.invoke("rules.delete", { filePath }),
    reveal: (filePath: string) => ipcRenderer.invoke("rules.reveal", { filePath })
  },
  realtime: {
    open: (input: unknown) => ipcRenderer.invoke("realtime.open", input),
    sendAudio: (input: unknown) => ipcRenderer.invoke("realtime.sendAudio", input),
    close: (runId: string) => ipcRenderer.invoke("realtime.close", { runId })
  },
  observability: {
    metrics: (input?: unknown) => ipcRenderer.invoke("observability.metrics", input ?? {}),
    export: (format: "json" | "csv") => ipcRenderer.invoke("observability.export", { format }),
    setPolicy: (input: unknown) => ipcRenderer.invoke("observability.setPolicy", input),
    replay: (input?: unknown) => ipcRenderer.invoke("observability.replay", input ?? {})
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
