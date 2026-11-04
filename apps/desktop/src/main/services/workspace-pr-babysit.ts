/**
 * P2 切片② · 盯 PR（Must×8 + tip A/B/C）
 * - Must#1：检查只走 checkWorkspacePrStatus（只读 gh pr view）
 * - Must#3/4：SQLite SoT + main 定时轮询；禁 renderer setInterval/gh
 * - tip A：默认 60s；失败退避至 5min 封顶
 * - tip B：命中 → persistMessage 助手短气泡（禁新通知中心）
 * - tip C：主挂切换 / detach → 停盯并清 SoT（不静默迁盯）
 * - 禁云 7×24 / 自动 merge / 静默开盯
 */
import { BrowserWindow } from "electron"
import type {
  PrBabysitWakeKind,
  PrBabysitWatchItem,
  WorkspacePrBabysitEvent,
  WorkspacePrBabysitStartResult,
  WorkspacePrBabysitStatusResult
} from "@enjoy-agents/ipc-contract"
import { persistMessage } from "./persist-session"
import { getSessionAttachedPrs } from "./session-attached-prs"
import {
  getSessionPrBabysit,
  listSessionPrBabysit,
  readBabysitPollCursor,
  removeSessionPrBabysit,
  updateSessionPrBabysitPoll,
  upsertSessionPrBabysit
} from "./session-pr-babysit"
import { checkWorkspacePrStatus, readGithubAuthStatus } from "./workspace-pr"
import { getWorkspace } from "./workspace"

/** tip A：默认 60s；失败退避上限 5min。 */
const POLL_MS = 60_000
const BACKOFF_CAP_MS = 5 * 60_000
const STUB_POLL_MS = 1_200

let pollTimer: ReturnType<typeof setTimeout> | null = null
let currentIntervalMs = POLL_MS
const wokenKeys = new Set<string>()
const failureStreak = new Map<string, number>()

function prStubEnabled(): boolean {
  return process.env.ENJOY_E2E_PR_STUB === "1"
}

function stubWakeOverride(): PrBabysitWakeKind | null {
  const raw = process.env.ENJOY_E2E_PR_BABYSIT_WAKE?.trim()
  if (raw === "checks" || raw === "checks-failed") return "checks-failed"
  if (raw === "comments" || raw === "new-comments") return "new-comments"
  if (raw === "conflict") return "conflict"
  return null
}

function wakeKey(sessionId: string, number: number, kind: PrBabysitWakeKind): string {
  return `${sessionId}:${number}:${kind}`
}

function itemKey(sessionId: string, number: number): string {
  return `${sessionId}:${number}`
}

function emitBabysitEvent(event: WorkspacePrBabysitEvent): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue
    window.webContents.send("workspace.prBabysit", event)
  }
}

function wakeCopy(kind: PrBabysitWakeKind, number: number): string {
  if (kind === "checks-failed") return `检查挂了 · PR #${number} · 我来看看`
  if (kind === "new-comments") return `有新评论 · PR #${number} · 要不要回`
  return `有冲突 · PR #${number} · 需要处理`
}

function scheduleNextPoll(): void {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
  if (listSessionPrBabysit().length === 0) {
    currentIntervalMs = POLL_MS
    return
  }
  const ms = prStubEnabled() ? STUB_POLL_MS : currentIntervalMs
  pollTimer = setTimeout(() => {
    void pollAllWatching().finally(() => scheduleNextPoll())
  }, ms)
  if (typeof pollTimer === "object" && pollTimer && "unref" in pollTimer) pollTimer.unref()
}

function ensurePollLoop(): void {
  if (pollTimer) return
  scheduleNextPoll()
}

function stopPollLoopIfIdle(): void {
  if (listSessionPrBabysit().length > 0) return
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
  currentIntervalMs = POLL_MS
}

export async function startPrBabysit(input: {
  sessionId: string
  workspaceId: string
  number: number
  url?: string
}): Promise<WorkspacePrBabysitStartResult> {
  const attached = getSessionAttachedPrs(input.sessionId)
  const primary = attached.primary ?? attached.items[0]?.number ?? null
  // Must#3：只盯本会话主挂
  if (primary == null || primary !== input.number) {
    return { ok: false, reason: "not-attached", message: "not-primary-attached" }
  }
  const hit = attached.items.find((item) => item.number === input.number)
  if (!hit) {
    return { ok: false, reason: "not-attached", message: "no attached pr" }
  }

  try {
    // e2e：仅开盯路径强制未登录（已挂 PR 之后测诚实卡）
    if (process.env.ENJOY_E2E_PR_BABYSIT_AUTH === "not-authed") {
      return { ok: false, reason: "not-authed", message: "not-authed" }
    }
    const ws = await getWorkspace(input.workspaceId)
    if (ws.kind === "ssh") {
      return { ok: false, reason: "not-git", message: "ssh-unsupported" }
    }
    const auth = await readGithubAuthStatus(ws.rootPath)
    if (!auth.authed) {
      return { ok: false, reason: "not-authed", message: "not-authed" }
    }

    const item = upsertSessionPrBabysit({
      sessionId: input.sessionId,
      workspaceId: input.workspaceId,
      number: input.number,
      url: input.url || hit.url
    })
    currentIntervalMs = POLL_MS
    ensurePollLoop()
    emitBabysitEvent({
      type: "status",
      sessionId: input.sessionId,
      number: input.number,
      watching: true,
      stub: prStubEnabled() || undefined
    })
    if (prStubEnabled() && stubWakeOverride()) {
      setTimeout(() => {
        void pollOne(item, { forceStubWake: true })
      }, 600)
    }
    return { ok: true, item, stub: prStubEnabled() || undefined }
  } catch (error) {
    return {
      ok: false,
      reason: "start-failed",
      message: error instanceof Error ? error.message : String(error)
    }
  }
}

export function stopPrBabysit(sessionId: string, number: number): WorkspacePrBabysitStatusResult {
  removeSessionPrBabysit(sessionId, number)
  for (const kind of ["checks-failed", "new-comments", "conflict"] as const) {
    wokenKeys.delete(wakeKey(sessionId, number, kind))
  }
  failureStreak.delete(itemKey(sessionId, number))
  emitBabysitEvent({
    type: "status",
    sessionId,
    number,
    watching: false,
    stub: prStubEnabled() || undefined
  })
  stopPollLoopIfIdle()
  return { watching: listSessionPrBabysit(sessionId) }
}

/** tip C：主挂切换 / detach → 该会话停盯并清 SoT（不静默迁盯）。 */
export function stopPrBabysitForSession(sessionId: string): void {
  const watching = listSessionPrBabysit(sessionId)
  for (const item of watching) {
    stopPrBabysit(sessionId, item.number)
  }
}

export function statusPrBabysit(sessionId: string): WorkspacePrBabysitStatusResult {
  return { watching: listSessionPrBabysit(sessionId) }
}

export function resumePrBabysitPollers(): void {
  if (listSessionPrBabysit().length === 0) return
  ensurePollLoop()
}

async function pollAllWatching(): Promise<void> {
  const items = listSessionPrBabysit()
  let anyFailure = false
  for (const item of items) {
    try {
      const ok = await pollOne(item)
      if (!ok) anyFailure = true
    } catch {
      anyFailure = true
    }
  }
  // tip A backoff
  if (anyFailure) {
    currentIntervalMs = Math.min(BACKOFF_CAP_MS, Math.max(POLL_MS, currentIntervalMs * 2))
  } else {
    currentIntervalMs = POLL_MS
  }
  stopPollLoopIfIdle()
}

async function pollOne(
  item: PrBabysitWatchItem,
  opts?: { forceStubWake?: boolean }
): Promise<boolean> {
  // Must#3：仍须是当前主挂
  const attached = getSessionAttachedPrs(item.sessionId)
  const primary = attached.primary ?? attached.items[0]?.number ?? null
  if (primary !== item.number) {
    stopPrBabysit(item.sessionId, item.number)
    return true
  }

  try {
    const ws = await getWorkspace(item.workspaceId)
    if (ws.kind === "ssh") return false
    const snapshot = await checkWorkspacePrStatus(ws.rootPath, item.number)
    if (!snapshot.ok) {
      const key = itemKey(item.sessionId, item.number)
      failureStreak.set(key, (failureStreak.get(key) ?? 0) + 1)
      return false
    }
    failureStreak.delete(itemKey(item.sessionId, item.number))
    await applySnapshot(
      item,
      {
        checksState: snapshot.checksState,
        commentCount: snapshot.commentCount,
        mergeable: snapshot.mergeable
      },
      Boolean(opts?.forceStubWake)
    )
    return true
  } catch {
    return false
  }
}

async function applySnapshot(
  item: PrBabysitWatchItem,
  snapshot: { checksState: string; commentCount: number; mergeable: string },
  forceWake = false
): Promise<void> {
  const cursor = readBabysitPollCursor(item.sessionId, item.number)
  let wakeKind: PrBabysitWakeKind | null = null

  if (snapshot.checksState === "failure") {
    if (forceWake || cursor.lastChecksState !== "failure") wakeKind = "checks-failed"
  } else if (cursor.lastCommentCount != null && snapshot.commentCount > cursor.lastCommentCount) {
    wakeKind = "new-comments"
  } else if (forceWake && snapshot.commentCount > 0) {
    wakeKind = "new-comments"
  } else if (snapshot.mergeable === "CONFLICTING" || snapshot.mergeable === "DIRTY") {
    if (forceWake || cursor.lastMergeable !== snapshot.mergeable) wakeKind = "conflict"
  }

  if (!wakeKind && forceWake) {
    wakeKind = stubWakeOverride()
  }

  updateSessionPrBabysitPoll(item.sessionId, item.number, {
    lastPolledAt: Date.now(),
    lastChecksState: snapshot.checksState,
    lastCommentCount: snapshot.commentCount,
    lastMergeable: snapshot.mergeable,
    lastWakeKind: wakeKind
  })

  if (!wakeKind) return
  const key = wakeKey(item.sessionId, item.number, wakeKind)
  if (wokenKeys.has(key) && !forceWake) return
  wokenKeys.add(key)

  // tip B：复用 persistMessage 注入助手短气泡
  try {
    persistMessage(item.sessionId, "assistant", wakeCopy(wakeKind, item.number))
  } catch (error) {
    console.warn("[pr-babysit] wake persist failed", error)
  }

  emitBabysitEvent({
    type: "wake",
    sessionId: item.sessionId,
    number: item.number,
    watching: true,
    wakeKind,
    stub: prStubEnabled() || undefined
  })
}

export function isWatchingPr(sessionId: string, number: number): boolean {
  return getSessionPrBabysit(sessionId, number) != null
}
