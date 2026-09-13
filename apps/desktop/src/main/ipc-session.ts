/**
 * 会话 IPC：创建、列表、归档、压缩、重命名与字段补丁 (session.patch)。
 */
import { ipcMain } from "electron"
import {
  SessionCompactInput,
  SessionCreateInput,
  SessionIdInput,
  SessionPatchInput,
  SessionRecapInput,
  SessionRenameInput,
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
  "session.clearCompaction"
] as const

export function registerSessionIpc() {
  ipcMain.handle("session.list", async (_event, raw) =>
    listSessions(WorkspaceIdInput.parse(raw).workspaceId)
  )
  ipcMain.handle("session.listArchived", async () => listArchivedSessions())
  ipcMain.handle("session.create", async (_event, raw) => {
    const input = SessionCreateInput.parse(raw)
    return createSession(input.workspaceId, input.title || "New agent")
  })
  ipcMain.handle("session.messages", async (_event, raw) =>
    listMessages(SessionIdInput.parse(raw).sessionId)
  )
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
    const recap = await generateSessionRecap(input.sessionId)
    return { recap }
  })
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
}
