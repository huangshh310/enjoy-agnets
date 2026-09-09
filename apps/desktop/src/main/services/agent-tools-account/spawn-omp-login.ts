/**
 * OMP 登录：pipe stdin（官方会先 readline 提问），读 stdout 的授权 URL 并 openExternal。
 * 打开页面只通知 UI；进程不 detach，等 Credentials saved / callback 才结束。
 */
import { spawn, type ChildProcess } from "node:child_process"
import { BrowserWindow, app, shell } from "electron"
import { decideOmpLogin, planOmpLogin } from "./omp-login-plan.ts"

const WAIT_MS = 20_000
const LIVE_MS = 8 * 60_000
const OUT_CAP = 16_000
const live = new Map<string, ChildProcess>()

export type OmpLoginHooks = {
  /** 授权页已打开（或已拿到设备码）。此时还不能当成已登录。 */
  onOpened?: (result: { ok: boolean; message: string }) => void
}

export async function spawnOmpLogin(
  command: string,
  args: string[],
  cwd: string,
  hooks?: OmpLoginHooks
): Promise<{ ok: boolean; message: string }> {
  const key = `${command} ${args.join(" ")}`
  live.get(key)?.kill("SIGTERM")
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    })
    live.set(key, child)
    const session = emptySession()
    const finish = (result: { ok: boolean; message: string }) => {
      if (session.settled) return
      session.settled = true
      live.delete(key)
      if (result.message === "logged_in") focusEnjoyWindow()
      child.kill("SIGTERM")
      resolve(result)
    }
    const take = (chunk: Buffer | string) => {
      session.out += String(chunk)
      if (session.out.length > OUT_CAP) session.out = session.out.slice(-OUT_CAP)
      applyDecision(child, session, hooks, finish, false)
    }
    child.stdout?.on("data", take)
    child.stderr?.on("data", take)
    child.on("error", () => finish({ ok: false, message: "failed" }))
    child.on("exit", () => {
      live.delete(key)
      if (session.settled) return
      applyDecision(child, session, hooks, finish, true)
      // exit 0 ≠ 已登录：只有 Credentials saved 才会在 applyDecision 里 settle。
      if (!session.settled) finish({ ok: false, message: "failed" })
    })
    setTimeout(() => onWaitExpired(child, session, hooks, finish), WAIT_MS).unref?.()
    setTimeout(() => onLiveExpired(session, finish), LIVE_MS).unref?.()
  })
}

type LoginSession = {
  out: string
  settled: boolean
  answered: boolean
  opened: boolean
  notified: boolean
}

function emptySession(): LoginSession {
  return { out: "", settled: false, answered: false, opened: false, notified: false }
}

function applyDecision(
  child: ChildProcess,
  session: LoginSession,
  hooks: OmpLoginHooks | undefined,
  finish: (result: { ok: boolean; message: string }) => void,
  flush: boolean
): void {
  const decision = decideOmpLogin(
    planOmpLogin(session.out),
    { answered: session.answered, opened: session.opened },
    flush
  )
  if (decision.writeEmpty) {
    session.answered = true
    child.stdin?.write("\n")
  }
  if (decision.openUrl) {
    session.opened = true
    void shell.openExternal(decision.openUrl)
  }
  if (decision.notice && !session.notified) {
    session.notified = true
    hooks?.onOpened?.(decision.notice)
  }
  if (decision.settle) finish(decision.settle)
}

/** 20s 只约束「等到 URL」；已经打开授权页就继续等 callback。 */
function onWaitExpired(
  child: ChildProcess,
  session: LoginSession,
  hooks: OmpLoginHooks | undefined,
  finish: (result: { ok: boolean; message: string }) => void
): void {
  if (session.settled) return
  if (session.opened) {
    applyDecision(child, session, hooks, finish, true)
    return
  }
  const plan = planOmpLogin(session.out)
  finish({ ok: false, message: plan.action === "needs_tui" ? "needs_tui" : "failed" })
}

function onLiveExpired(
  session: LoginSession,
  finish: (result: { ok: boolean; message: string }) => void
): void {
  if (session.settled) return
  finish({ ok: false, message: session.opened ? "callback_timeout" : "failed" })
}

function focusEnjoyWindow(): void {
  const win = BrowserWindow.getAllWindows().find((item) => !item.isDestroyed())
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
  app.focus({ steal: true })
}
