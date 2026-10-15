/**
 * 会话 IPC：创建、列表、归档、压缩、重命名与字段补丁 (session.patch)。
 */
import { app, BrowserWindow, ipcMain } from "electron"
import { SessionChangesInput, SessionChangesResult } from "@enjoy-agents/ipc-contract/session-changes"
import { sessionChanges } from "./services/session-changes"
import {
  SessionCompactInput,
  SessionCreateInput,
  SessionForkInput,
  SessionForkResult,
  SessionHeartbeatClearInput,
  SessionHeartbeatGetInput,
  SessionHeartbeatPutInput,
  SessionArchiveResult,
  SessionDeleteInput,
  SessionIdInput,
  SessionPatchInput,
  SessionRecapInput,
  SessionRecapResult,
  SessionRenameInput,
  SessionSetFocusedInput,
  SessionTruncateFromInput,
  WorkspaceIdInput
} from "@enjoy-agents/ipc-contract"
import { loadSessionEstimatedCost } from "./services/session-estimated-cost"
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
import { delaySessionCreateIfDev, delaySessionMessagesIfDev } from "./services/delay-session-create"
import {
  loadSessionDraftAssets,
  loadSessionDrafts,
  saveSessionDraft,
  saveSessionDraftAssets,
  type DraftAsset
} from "./services/session-drafts"
import { z } from "zod"
import { handleDismissError } from "./services/session-dismiss-error-ipc"
import { isE2eStub } from "./services/e2e-stub-gate"
import { dismissSessionError, SESSION_ERROR_MESSAGE_MAX, sessionLastError } from "./services/session-last-error"

const SessionLastErrorOutput = z
  .object({
    runId: z.string().min(1),
    message: z.string().min(1).max(SESSION_ERROR_MESSAGE_MAX),
    updatedAt: z.number()
  })
  .strict()
  .nullable()


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
  "session.heartbeat.clear",
  "session.estimatedCost",
  "session.lastError",
  "session.changes",
  "session.dismissError",
  "session.setFocused"
] as const

export function registerSessionIpc() {
  registerSessionDraftIpc()
  registerSessionCatalogIpc()
  registerSessionEditIpc()
  registerSessionLifecycleIpc()
  registerSessionForkIpc()
}

function registerSessionCatalogIpc() {
  ipcMain.handle("session.changes", (_event, raw) =>
    SessionChangesResult.parse(sessionChanges(SessionChangesInput.parse(raw).sessionId))
  )
  ipcMain.handle("session.lastError", (_event, raw) => {
    const sessionId =
      typeof (raw as { sessionId?: unknown })?.sessionId === "string"
        ? (raw as { sessionId: string }).sessionId
        : ""
    const parsed = SessionLastErrorOutput.safeParse(sessionLastError(sessionId))
    return parsed.success ? parsed.data : null
  })
  ipcMain.handle("session.dismissError", (_event, raw) =>
    handleDismissError(raw, { dismiss: dismissSessionError, isE2eStub })
  )
  ipcMain.handle("session.list", async (_event, raw) =>
    listSessions(WorkspaceIdInput.parse(raw).workspaceId)
  )
  ipcMain.handle("session.listArchived", async () => listArchivedSessions())
  ipcMain.handle("session.create", async (_event, raw) => {
    const input = SessionCreateInput.parse(raw)
    await delaySessionCreateIfDev({ packaged: app.isPackaged })
    return createSession(input.workspaceId, input.title || "新对话")
  })
  ipcMain.handle("session.messages", async (_event, raw) => {
    const { sessionId } = SessionIdInput.parse(raw)
    await delaySessionMessagesIfDev({ packaged: app.isPackaged })
    return listMessages(sessionId)
  })
  ipcMain.handle("session.estimatedCost", async (_event, raw) => loadSessionEstimatedCost(raw))
  ipcMain.handle("session.setFocused", async (_event, raw) => {
    const { setFocusedSessionId } = await import("./services/session-focus")
    setFocusedSessionId(SessionSetFocusedInput.parse(raw).sessionId)
    return { ok: true as const }
  })
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
  ipcMain.handle("session.archive", async (event, raw) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    return SessionArchiveResult.parse(
      await archiveSession(
        SessionIdInput.parse(raw).sessionId,
        window && !window.isDestroyed() ? window : undefined
      )
    )
  })
  ipcMain.handle("session.unarchive", async (_event, raw) =>
    unarchiveSession(SessionIdInput.parse(raw).sessionId)
  )
  ipcMain.handle("session.delete", async (_event, raw) => {
    const input = SessionDeleteInput.parse(raw)
    return deleteSession(input.sessionId, { onlyIfEmpty: input.onlyIfEmpty === true })
  })
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
    return truncateSessionFrom(input.sessionId, input.messageId, input.expectedTailIds, {
      dryRun: input.dryRun === true
    })
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

/** jojo P1：草稿落 DB。启动同步读一次（打开会话要同步取稿），写走 fire-and-forget。 */
function registerSessionDraftIpc() {
  ipcMain.removeAllListeners("session.drafts.loadSync")
  ipcMain.removeAllListeners("session.drafts.save")
  ipcMain.removeAllListeners("session.drafts.loadAssetsSync")
  ipcMain.removeAllListeners("session.drafts.saveAssets")
  ipcMain.on("session.drafts.loadAssetsSync", (event) => {
    event.returnValue = loadSessionDraftAssets()
  })
  ipcMain.on("session.drafts.saveAssets", (_event, raw: unknown) => {
    const input = (raw ?? {}) as { sessionId?: unknown; assets?: unknown }
    if (typeof input.sessionId !== "string" || !Array.isArray(input.assets)) return
    try {
      saveSessionDraftAssets(input.sessionId, input.assets as DraftAsset[])
    } catch {
      // 落盘失败只丢持久化
    }
  })
  ipcMain.on("session.drafts.loadSync", (event) => {
    event.returnValue = loadSessionDrafts()
  })
  ipcMain.on("session.drafts.save", (_event, raw: unknown) => {
    const input = (raw ?? {}) as { sessionId?: unknown; text?: unknown }
    if (typeof input.sessionId !== "string" || typeof input.text !== "string") return
    try {
      saveSessionDraft(input.sessionId, input.text)
    } catch {
      // 落盘失败只丢持久化，不影响内存草稿
    }
  })
}
