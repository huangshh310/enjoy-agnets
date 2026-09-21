/**
 * 会话上次发送时所在分支。不落 SQLite；localStorage 仅作重启记忆。
 */
const STORAGE_KEY = "enjoy-session-cwd-branch"

const memory = new Map<string, string>()
let lastSeenCurrent = ""

/** Composer 横幅记下当前 checkout，发送时用来更新记录。 */
export function noteCurrentBranch(branch: string): void {
  lastSeenCurrent = branch.trim()
}

export function lastSeenCurrentBranch(): string {
  return lastSeenCurrent
}

export function recordedSessionBranch(sessionId: string | null | undefined): string {
  if (!sessionId) return ""
  return memory.get(sessionId) ?? ""
}

/** 打开会话时若还没有记录，记下当前分支，不弹横幅。 */
export function seedSessionBranch(sessionId: string | undefined, currentBranch: string): void {
  const id = sessionId?.trim()
  const branch = currentBranch.trim()
  if (!id || !branch) return
  if (recordedSessionBranch(id)) return
  rememberSessionBranch(id, branch)
}

/** 发送成功或首次记录时更新。 */
export function rememberSessionBranch(sessionId: string | undefined, currentBranch: string): void {
  const id = sessionId?.trim()
  const branch = currentBranch.trim()
  if (!id || !branch) return
  memory.set(id, branch)
  persist()
}

export type BranchMismatch = {
  recorded: string
  current: string
}

/** 有用户轮、且记录分支与当前 checkout 不同才提示。 */
export function branchMismatchOf(input: {
  sessionId?: string | null
  currentBranch?: string | null
  hasUserTurns: boolean
}): BranchMismatch | null {
  const current = input.currentBranch?.trim() ?? ""
  const recorded = recordedSessionBranch(input.sessionId)
  if (!input.hasUserTurns || !current || !recorded) return null
  if (recorded === current) return null
  return { recorded, current }
}

export function loadSessionBranches(): void {
  memory.clear()
  const raw = readStorage()
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === "string" && value.trim()) memory.set(id, value.trim())
    }
  } catch {
    // 坏 JSON 丢掉
  }
}

export function resetSessionBranchesForTests(): void {
  memory.clear()
}

function persist() {
  if (typeof localStorage === "undefined") return
  const payload: Record<string, string> = {}
  for (const [id, branch] of memory) payload[id] = branch
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // 配额满则只留内存
  }
}

function readStorage(): string | null {
  if (typeof localStorage === "undefined") return null
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}
