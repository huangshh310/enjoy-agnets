/**
 * 检查点记账失败日志：git stderr 截到 ~2KB；同一工作区同一步骤 60s 内只记一次，
 * 免得每次写盘都刷一遍同样的身份 / 权限错误。key 不含 stderr：update-ref 的报错带时间戳 ref 名，每次都不同。
 */
export const CHECKPOINT_STDERR_CAP = 2048
export const CHECKPOINT_LOG_WINDOW_MS = 60_000
const MAX_KEYS = 200

const lastLogged = new Map<string, number>()

export function capCheckpointStderr(stderr: string): string {
  const text = stderr.trim()
  if (text.length <= CHECKPOINT_STDERR_CAP) return text
  return `${text.slice(0, CHECKPOINT_STDERR_CAP)}…[truncated ${text.length - CHECKPOINT_STDERR_CAP} chars]`
}

export type CheckpointFailure = {
  workspaceRoot: string
  step: string
  kind?: string
  sessionId?: string
  runId?: string
  stderr: string
}

/** 返回是否真的记了日志（被限流时 false）。 */
export function logCheckpointFailure(failure: CheckpointFailure, now = Date.now()): boolean {
  const stderr = capCheckpointStderr(failure.stderr)
  const key = `${failure.workspaceRoot}\0${failure.step}`
  const last = lastLogged.get(key)
  if (last !== undefined && now - last < CHECKPOINT_LOG_WINDOW_MS) return false
  if (lastLogged.size >= MAX_KEYS) lastLogged.clear()
  lastLogged.set(key, now)
  console.error("[checkpoint] record failed", { ...failure, stderr })
  return true
}

/** 仅测试用：清空限流表。 */
export function resetCheckpointFailureLog(): void {
  lastLogged.clear()
}
