/**
 * 会话 IPC：创建、列表、归档、压缩、重命名与字段补丁 (session.patch)。
 */
import { ipcMain } from "electron"
import {
  SessionCompactInput,
  SessionCreateInput,
  SessionForkInput,
  SessionForkResult,
  SessionHeartbeatClearInput,
  SessionHeartbeatGetInput,
  SessionHeartbeatPutInput,
  SessionIdInput,
  SessionPatchInput,
  SessionRecapInput,
  SessionRecapResult,
  SessionRenameInput,
  SessionTruncateFromInput,
  WorkspaceIdInput
} from "@enjoy-agents/ipc-contract"
import {
  createSession,
  listMessages,
  listSessions,
  patchSession
} from "./services/agent-runner"
import {
  archiveSession,
  deleteAllArchivedSessions,
  deleteSession,
  listArchivedSessions,
  unarchiveSession
} from "./services/session-lifecycle"
import { renameSession } from "./services/persist-session"
import {
  clearSessionCompaction,
  compactSession,
  getSessionCompaction
} from "./services/session-compaction-service"
import { generateSessionRecap } from "./services/session-recap-service"
import { truncateSessionFrom } from "./services/session-truncate"
import { forkSession } from "./services/session-fork"
import { clearHeartbeat, putHeartbeat, readHeartbeat } from "./services/session-heartbeat-store"

export const SESSION_CHANNELS = [
  "session.list",
  "session.listArchived",
  "session.create",
  "session.messages",
  "session.rename",
  "session.patch",
  "session.recap",
  "session.archive",
  "session.unarchive",
  "session.delete",
  "session.deleteArchived",
  "session.compact",
  "session.getCompaction",
  "session.clearCompaction",
  "session.truncateFrom",
  "session.fork",
  "session.heartbeat.get",
  "session.heartbeat.put",
  "session.heartbeat.clear"
] as const

export function registerSessionIpc() {
  registerSessionCatalogIpc()
  registerSessionEditIpc()
  registerSessionLifecycleIpc()
  registerSessionForkIpc()
}

function registerSessionCatalogIpc() {
  ipcMain.handle("session.list", async (_event, raw) =>
    listSessions(WorkspaceIdInput.parse(raw).workspaceId)
  )
  ipcMain.handle("session.listArchived", async () => listArchivedSessions())
  ipcMain.handle("session.create", async (_event, raw) => {
    const input = SessionCreateInput.parse(raw)
    return createSession(input.workspaceId, input.title || "新对话")
  })
  ipcMain.handle("session.messages", async (_event, raw) =>
    listMessages(SessionIdInput.parse(raw).sessionId)
  )
}

function registerSessionEditIpc() {
  ipcMain.handle("session.rename", async (_event, raw: unknown) => {
    const input = SessionRenameInput.parse(raw)
    return renameSession(input.sessionId, input.title)
  })
  ipcMain.handle("session.patch", async (_event, raw: unknown) => {
    const input = SessionPatchInput.parse(raw)
    return patchSession(input)
  })
  ipcMain.handle("session.recap", async (_event, raw: unknown) => {
    const input = SessionRecapInput.parse(raw)
    const generated = await generateSessionRecap(input.sessionId)
    return SessionRecapResult.parse(generated)
  })
  ipcMain.handle("session.fork", async (_event, raw) => {
    const input = SessionForkInput.parse(raw)
    return SessionForkResult.parse(await forkSession(input.sessionId, input.messageId))
  })
}

function registerSessionLifecycleIpc() {
  ipcMain.handle("session.archive", async (_event, raw) =>
    archiveSession(SessionIdInput.parse(raw).sessionId)
  )
  ipcMain.handle("session.unarchive", async (_event, raw) =>
    unarchiveSession(SessionIdInput.parse(raw).sessionId)
  )
  ipcMain.handle("session.delete", async (_event, raw) =>
    deleteSession(SessionIdInput.parse(raw).sessionId)
  )
  ipcMain.handle("session.deleteArchived", async () => deleteAllArchivedSessions())
  ipcMain.handle("session.compact", async (_event, raw) => {
    const input = SessionCompactInput.parse(raw)
    return compactSession(input.sessionId, input.keepRecent)
  })
  ipcMain.handle("session.getCompaction", async (_event, raw) => {
    const input = SessionIdInput.parse(raw)
    return getSessionCompaction(input.sessionId)
  })
  ipcMain.handle("session.clearCompaction", async (_event, raw) => {
    const input = SessionIdInput.parse(raw)
    return clearSessionCompaction(input.sessionId)
  })
  ipcMain.handle("session.truncateFrom", async (_event, raw) => {
    const input = SessionTruncateFromInput.parse(raw)
    return truncateSessionFrom(input.sessionId, input.messageId)
  })
}

function registerSessionForkIpc() {
  ipcMain.handle("session.heartbeat.get", async (_event, raw) => {
    const input = SessionHeartbeatGetInput.parse(raw)
    return readHeartbeat(input.sessionId)
  })
  ipcMain.handle("session.heartbeat.put", async (_event, raw) => {
    const input = SessionHeartbeatPutInput.parse(raw)
    return putHeartbeat(input)
  })
  ipcMain.handle("session.heartbeat.clear", async (_event, raw) => {
    const input = SessionHeartbeatClearInput.parse(raw)
    return clearHeartbeat(input.sessionId)
  })
}
