/**
 * 新对话创建窗。发送只能等这里结束，避免 sessionId 还没到就清输入。
 */
const CREATE_TIMEOUT_MS = 15_000

type PendingCreate = {
  token: number
  promise: Promise<string>
  resolve: (sessionId: string) => void
  reject: (error: unknown) => void
}

let seq = 0
let pending: PendingCreate | null = null

export function isNewSessionCreatePending(): boolean {
  return pending !== null
}

export function beginNewSessionCreate(): { token: number; promise: Promise<string> } {
  if (pending) pending.reject(new Error("SESSION_CREATE_SUPERSEDED"))
  const token = ++seq
  let resolve!: (sessionId: string) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<string>((res, rej) => {
    resolve = res
    reject = rej
  })
  // 连点「新对话」会 SUPERSEDED 上一次；没人 wait 时不能变成未处理拒绝。
  void promise.catch(() => undefined)
  pending = { token, promise, resolve, reject }
  return { token, promise }
}

export function finishNewSessionCreate(token: number, sessionId: string): void {
  if (!pending || pending.token !== token) return
  pending.resolve(sessionId)
  pending = null
}

export function failNewSessionCreate(token: number, error: unknown): void {
  if (!pending || pending.token !== token) return
  pending.reject(error)
  pending = null
}

export async function waitForNewSessionCreate(timeoutMs = CREATE_TIMEOUT_MS): Promise<string> {
  if (!pending) throw new Error("NO_PENDING_SESSION_CREATE")
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      pending.promise,
      new Promise<string>((_, reject) => {
        timer = setTimeout(() => reject(new Error("SESSION_CREATE_TIMEOUT")), timeoutMs)
      })
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export function resetNewSessionCreateForTest(): void {
  if (pending) pending.reject(new Error("SESSION_CREATE_RESET"))
  pending = null
  seq = 0
}

export function shouldQueueComposerSend(sessionId: string | null, createPending: boolean): boolean {
  return createPending || !sessionId
}
