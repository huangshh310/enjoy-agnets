import { ipcMain, type BrowserWindow } from "electron";
import {
  ListDirInput,
  OpenWorkspaceInput,
  ReadFileInput,
  SaveSecretInput
} from "@enjoy-agents/ipc-contract";
import { MODEL_CATALOG } from "@enjoy-agents/providers";
import {
  abortAgent,
  createSession,
  decideApproval,
  listMessages,
  listSessions,
  runAgent
} from "./services/agent-runner";
import { getSetting, setSetting } from "./services/database";
import { hasSecret, readSecret, saveSecret } from "./services/secrets";
import {
  changedFiles,
  getWorkspace,
  listWorkspaces,
  listWorkspaceDir,
  openWorkspace,
  readWorkspaceFile
} from "./services/workspace";

export function registerIpc(window: BrowserWindow) {
  ipcMain.handle("workspace.open", async (_event, raw) => {
    const input = OpenWorkspaceInput.parse(raw ?? {});
    return openWorkspace(input.path);
  });
  ipcMain.handle("workspace.list", async () => listWorkspaces());
  ipcMain.handle("workspace.files", async (_event, raw) => {
    const input = ListDirInput.parse(raw);
    return listWorkspaceDir(input.workspaceId, input.path);
  });
  ipcMain.handle("workspace.readFile", async (_event, raw) => {
    const input = ReadFileInput.parse(raw);
    return readWorkspaceFile(input.workspaceId, input.path);
  });
  ipcMain.handle("workspace.changes", async (_event, workspaceId: string) => {
    const workspace = await getWorkspace(workspaceId);
    return changedFiles(workspace.rootPath);
  });

  ipcMain.handle("session.list", async (_event, workspaceId: string) => listSessions(workspaceId));
  ipcMain.handle("session.create", async (_event, workspaceId: string, title?: string) =>
    createSession(workspaceId, title || "New agent")
  );
  ipcMain.handle("session.messages", async (_event, sessionId: string) => listMessages(sessionId));

  ipcMain.handle("agent.run", (_event, raw) => runAgent(window, raw));
  ipcMain.handle("agent.abort", (_event, runId: string) => abortAgent(runId));
  ipcMain.handle("agent.decide", (_event, raw) => decideApproval(window, raw));

  ipcMain.handle("settings.get", async () => {
    const secret = await readSecret();
    return {
      hasKey: Boolean(secret),
      provider: secret?.provider ?? null,
      baseURL: secret?.baseURL ?? null,
      defaultModelId: getSetting("defaultModelId") ?? "deepseek-chat"
    };
  });
  ipcMain.handle("settings.saveSecret", async (_event, raw) => {
    const input = SaveSecretInput.parse(raw);
    await saveSecret(input);
    return { ok: true, hasKey: await hasSecret() };
  });
  ipcMain.handle("settings.setDefaultModel", async (_event, modelId: string) => {
    setSetting("defaultModelId", modelId);
    return { ok: true };
  });
  ipcMain.handle("models.list", async () => MODEL_CATALOG);
}

export function unregisterIpc() {
  const channels = [
    "workspace.open",
    "workspace.list",
    "workspace.files",
    "workspace.readFile",
    "workspace.changes",
    "session.list",
    "session.create",
    "session.messages",
    "agent.run",
    "agent.abort",
    "agent.decide",
    "settings.get",
    "settings.saveSecret",
    "settings.setDefaultModel",
    "models.list"
  ];
  for (const channel of channels) ipcMain.removeHandler(channel);
}
