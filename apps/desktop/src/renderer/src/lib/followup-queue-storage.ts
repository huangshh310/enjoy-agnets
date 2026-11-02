/**
 * t3-b：followup 队列落盘桥。走 main（DB）；无桥时（单测）用 localStorage。
 * 启动 sync 回灌；入队/改/删/调序/暂停写穿。
 */
import type { FollowupItem } from "../hooks/runtime-interact/followup-queue.types"

type PauseReason = "stopped" | "engineSwitched" | "held" | "error" | "quota" | "midTurn"

const STORAGE_KEY = "enjoy-agents-followup-queue"

export type FollowupQueueSnapshot = {
  items: FollowupItem[]
  paused: Record<string, PauseReason>
}

type FollowupBridge = {
  loadSync: () => { items: unknown[]; paused: Record<string, string> }
  save: (input: { items: unknown[]; paused: Record<string, string> }) => void
}

function bridge(): FollowupBridge {
  const ide = (
    globalThis as {
      window?: { ide?: { session?: { followupQueue?: FollowupBridge } } }
    }
  ).window?.ide
  const fq = ide?.session?.followupQueue
  if (fq) return fq
  return {
    loadSync: () => {
      try {
        const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
        const parsed = raw ? (JSON.parse(raw) as unknown) : null
        if (!parsed || typeof parsed !== "object") return { items: [], paused: {} }
        const rec = parsed as { items?: unknown; paused?: unknown }
        return {
          items: Array.isArray(rec.items) ? rec.items : [],
          paused:
            rec.paused && typeof rec.paused === "object" ? (rec.paused as Record<string, string>) : {}
        }
      } catch {
        return { items: [], paused: {} }
      }
    },
    save: (input) => {
      try {
        globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(input))
      } catch {
        // 配额满等：只丢落盘
      }
    }
  }
}

const PAUSED = new Set<string>(["stopped", "engineSwitched", "held", "error", "quota", "midTurn"])

function cleanPaused(raw: Record<string, string>): Record<string, PauseReason> {
  const out: Record<string, PauseReason> = {}
  for (const [sid, reason] of Object.entries(raw)) {
    if (PAUSED.has(reason)) out[sid] = reason as PauseReason
  }
  return out
}

function cleanItem(raw: unknown): FollowupItem | null {
  if (!raw || typeof raw !== "object") return null
  const rec = raw as Record<string, unknown>
  if (typeof rec.id !== "string" || !rec.id) return null
  if (typeof rec.sessionId !== "string" || !rec.sessionId) return null
  const prompt =
    typeof rec.prompt === "string" ? rec.prompt : typeof rec.text === "string" ? rec.text : ""
  const text = typeof rec.text === "string" ? rec.text : prompt
  const assets = Array.isArray(rec.assets)
    ? rec.assets
        .filter((a): a is { id: string; name: string; mediaType?: string; size?: number } => {
          if (!a || typeof a !== "object") return false
          const row = a as Record<string, unknown>
          return typeof row.id === "string" && !!row.id
        })
        .map((a) => ({
          id: a.id,
          name: typeof a.name === "string" ? a.name : a.id,
          mediaType: typeof a.mediaType === "string" ? a.mediaType : undefined,
          size: typeof a.size === "number" ? a.size : undefined
        }))
    : []
  return {
    id: rec.id,
    sessionId: rec.sessionId,
    prompt,
    text,
    draft: typeof rec.draft === "string" ? rec.draft : undefined,
    quotedContexts: Array.isArray(rec.quotedContexts) ? (rec.quotedContexts as FollowupItem["quotedContexts"]) : undefined,
    skillChips: Array.isArray(rec.skillChips) ? (rec.skillChips as FollowupItem["skillChips"]) : undefined,
    assets,
    createdAt: typeof rec.createdAt === "number" ? rec.createdAt : Date.now(),
    status: rec.status === "elevated_to_steer" ? "elevated_to_steer" : "pending"
  }
}

/** 从 main / localStorage 读快照（不改内存队列）。 */
export function loadFollowupQueueSnapshot(): FollowupQueueSnapshot {
  try {
    const raw = bridge().loadSync()
    const items = (raw.items ?? []).map(cleanItem).filter((x): x is FollowupItem => Boolean(x))
    const paused = cleanPaused(raw.paused ?? {})
    for (const sid of Object.keys(paused)) {
      if (!items.some((item) => item.sessionId === sid)) delete paused[sid]
    }
    return { items, paused }
  } catch {
    return { items: [], paused: {} }
  }
}

/** 写穿 main（fire-and-forget）。 */
export function persistFollowupQueueSnapshot(snapshot: FollowupQueueSnapshot): void {
  try {
    const items = snapshot.items.map((item) => ({
      id: item.id,
      sessionId: item.sessionId,
      prompt: item.prompt,
      text: item.text,
      draft: item.draft,
      quotedContexts: item.quotedContexts,
      skillChips: item.skillChips,
      assets: item.assets.map((a) => ({
        id: a.id,
        name: a.name,
        mediaType: a.mediaType,
        size: a.size
        // 不存 blob: url——重启后无效；图本体在资产库按 id 取
      })),
      createdAt: item.createdAt,
      status: item.status
    }))
    const paused: Record<string, string> = { ...snapshot.paused }
    bridge().save({ items, paused })
  } catch {
    // 落盘失败只丢持久化
  }
}

/** 测试用：清 localStorage 回落。 */
export function resetFollowupQueueStorageForTest(): void {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
