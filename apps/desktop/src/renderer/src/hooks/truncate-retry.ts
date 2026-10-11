/**
 * regenerate / edit-and-resend / rewind 截断被 main 以 TRUNCATE_STALE_SNAPSHOT 拒后的重试决策（leo MF-A / MF-B）。
 *
 * 规则：刷新后库里保留点之后的尾巴必须与最初交给 main 的 expectedTailIds **完全相同**才自动重试一次；
 * 否则不重试、刷新视图并提示「有新内容，请确认后再点一次」，让用户自己再点。绝不拿刷新后的整段库尾当新名单
 * （那会删掉用户从没看见的后台行，例如心跳 hb_u / hb_a）。
 * 重试时保留点那条用原请求里的内容（编辑重发是新内容），不能回落库里的旧内容。
 */
import { TRUNCATE_STALE_SNAPSHOT } from "@enjoy-agents/ipc-contract/session-truncate"

/** renderer 专用：尾巴变了，不自动重试。不经 IPC。 */
export const TRUNCATE_TAIL_CHANGED = "TRUNCATE_TAIL_CHANGED"

export type TruncateRetryMode = "after" | "from"

export type TruncateRetryDecision =
  | { retry: true; expectedTailIds: string[] }
  | { retry: false; code: typeof TRUNCATE_TAIL_CHANGED }

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index])
}

/**
 * 纯函数。`after`：保留 anchor，尾巴是 anchor 之后；`from`：从 anchor（含）起删。
 * anchor 不见了、或尾巴与原名单不完全相同：不重试。
 */
export function decideTruncateRetry(input: {
  mode: TruncateRetryMode
  anchorId: string
  expectedTailIds: readonly string[]
  refreshedIds: readonly string[]
}): TruncateRetryDecision {
  const index = input.refreshedIds.indexOf(input.anchorId)
  if (index < 0) return { retry: false, code: TRUNCATE_TAIL_CHANGED }
  const tail = input.refreshedIds.slice(input.mode === "after" ? index + 1 : index)
  if (!sameIds(tail, input.expectedTailIds)) return { retry: false, code: TRUNCATE_TAIL_CHANGED }
  return { retry: true, expectedTailIds: [...input.expectedTailIds] }
}

export type RetryHistoryEntry = {
  id?: string
  role: string
  content: string
  reasoning?: string
}

/**
 * 重试用的 history：保留点之前取刷新后的库，保留点本身用原请求那条（编辑重发的新内容）。
 * main 的 persistUser 取 history 最后一条用户句，所以最后一条必须是新内容。
 */
export function buildRetryHistory<T extends RetryHistoryEntry>(input: {
  keepId: string
  keepEntry: T
  refreshed: ReadonlyArray<T>
}): T[] | null {
  const index = input.refreshed.findIndex((message) => message.id === input.keepId)
  if (index < 0) return null
  return [...input.refreshed.slice(0, index), { ...input.keepEntry, id: input.keepId }]
}

export type TruncateStartDeps<R, M extends RetryHistoryEntry> = {
  /** 打 agent.run（或 ai.generate）。 */
  start: (history: M[], expectedTailIds: string[]) => Promise<R>
  blockedCode: (result: R) => string | null
  /** 撤回乐观截断：放回原消息、停 running、从库刷新。 */
  restoreView: () => Promise<void>
  /** 刷新后的当前消息。 */
  readMessages: () => ReadonlyArray<M>
  /** 重试前把乐观截断视图重新摆上（保留点用原请求内容）。 */
  reapplyOptimistic?: (history: M[]) => void
  /** 给人看的提示（稳定码 → 文案由调用方翻）。 */
  notice: (code: string) => void
}

export type TruncateStartResult<R> = R | { ok: false; code: string }

/**
 * regenerate / edit-and-resend 的截断 + 起跑：
 * - 成功：原样返回；
 * - 非可重试失败（TRUNCATE_RUN_ACTIVE 等）：撤回乐观截断并提示（soft 3）；
 * - STALE：刷新；尾巴完全相同才带原名单 + 原保留点内容重试一次；否则提示 TRUNCATE_TAIL_CHANGED，不重试。
 */
export async function startWithTruncateRetry<R, M extends RetryHistoryEntry>(
  deps: TruncateStartDeps<R, M>,
  input: { keepId: string; expectedTailIds: string[]; history: M[] }
): Promise<TruncateStartResult<R>> {
  const first = await deps.start(input.history, input.expectedTailIds)
  const firstCode = deps.blockedCode(first)
  if (!firstCode) return first
  await deps.restoreView()
  if (firstCode !== TRUNCATE_STALE_SNAPSHOT) {
    deps.notice(firstCode)
    return first
  }
  const refreshed = deps.readMessages()
  const decision = decideTruncateRetry({
    mode: "after",
    anchorId: input.keepId,
    expectedTailIds: input.expectedTailIds,
    refreshedIds: refreshed.map((message) => message.id ?? "")
  })
  const keepEntry = input.history[input.history.length - 1]
  const history =
    decision.retry && keepEntry
      ? buildRetryHistory({ keepId: input.keepId, keepEntry, refreshed })
      : null
  if (!decision.retry || !history) {
    deps.notice(TRUNCATE_TAIL_CHANGED)
    return { ok: false, code: TRUNCATE_TAIL_CHANGED }
  }
  deps.reapplyOptimistic?.(history)
  const retried = await deps.start(history, decision.expectedTailIds)
  const retryCode = deps.blockedCode(retried)
  if (retryCode) {
    await deps.restoreView()
    deps.notice(retryCode)
  }
  return retried
}

/** 被闸（含 renderer 自己的 TRUNCATE_TAIL_CHANGED）：调用方不要再去认 runId。 */
export function isBlockedStart(result: unknown): boolean {
  return Boolean(
    result && typeof result === "object" && "ok" in result && (result as { ok?: unknown }).ok === false
  )
}
