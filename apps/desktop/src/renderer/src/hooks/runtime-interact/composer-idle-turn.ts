/**
 * 排队首发撞上 running：限时等 running 落下再占位。
 * 一次通知会同时叫醒所有等待者，所以醒来必须重查 running，并在同一段同步代码里占位（onIdle），
 * 否则两条排队发送会一起开跑。
 */
export type ComposerIdleDeps = {
  isRunning: () => boolean
  subscribe: (listener: () => void) => () => void
  now?: () => number
}

export async function runWhenComposerIdle(
  deps: ComposerIdleDeps,
  timeoutMs: number,
  onIdle: () => void
): Promise<boolean> {
  const now = deps.now ?? Date.now
  const deadline = now() + timeoutMs
  while (deps.isRunning()) {
    const left = deadline - now()
    if (left <= 0 || !(await waitOnce(deps, left))) return false
  }
  onIdle()
  return true
}

function waitOnce(deps: ComposerIdleDeps, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false
    const finish = (ok: boolean) => {
      if (done) return
      done = true
      clearTimeout(timer)
      unsubscribe()
      resolve(ok)
    }
    const timer = setTimeout(() => finish(false), timeoutMs)
    const unsubscribe = deps.subscribe(() => {
      if (!deps.isRunning()) finish(true)
    })
  })
}
