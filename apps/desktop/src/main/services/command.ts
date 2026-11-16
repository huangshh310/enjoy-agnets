import { execFile, spawn } from "node:child_process"
import { basename } from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)

const BLOCKED_WRAPPERS = new Set([
  "cmd",
  "cmd.exe",
  "command.com",
  "powershell",
  "powershell.exe",
  "pwsh",
  "pwsh.exe",
  "bash",
  "sh",
  "zsh",
  "fish",
  "wsl",
  "wsl.exe"
])

export type CommandResult = {
  stdout: string
  stderr: string
  exitCode: number
}

export function tokenizeCommand(command: string): string[] {
  const tokens: string[] = []
  let current = ""
  let quote: "'" | '"' | null = null

  for (const character of command.trim()) {
    if (quote) {
      if (character === quote) {
        quote = null
      } else {
        current += character
      }
      continue
    }
    if (character === "'" || character === '"') {
      quote = character
      continue
    }
    if (/\s/.test(character)) {
      if (current.length > 0) {
        tokens.push(current)
        current = ""
      }
      continue
    }
    current += character
  }

  if (quote) {
    throw new Error("Unclosed quote in command.")
  }
  if (current.length > 0) {
    tokens.push(current)
  }
  return tokens
}

export function parseExecutableCommand(command: string): {
  executable: string
  args: string[]
} {
  const tokens = tokenizeCommand(command)
  const executable = tokens[0]
  if (!executable) {
    throw new Error("Command is empty.")
  }
  const binaryName = basename(executable).toLowerCase()
  if (BLOCKED_WRAPPERS.has(binaryName)) {
    throw new Error("Shell wrappers are not allowed. Pass a program and its arguments.")
  }
  if (executable.includes("..")) {
    throw new Error("Command executable must not contain parent-directory segments.")
  }
  return { executable, args: tokens.slice(1) }
}

export async function runExecutable(
  cwd: string,
  executable: string,
  args: string[],
  timeoutMs = 30_000,
  extraEnv?: NodeJS.ProcessEnv
): Promise<CommandResult> {
  try {
    const result = await execFileAsync(executable, args, {
      cwd,
      timeout: timeoutMs,
      maxBuffer: 2_000_000,
      windowsHide: true,
      shell: false,
      env: extraEnv ? { ...process.env, ...extraEnv } : undefined
    })
    return {
      stdout: result.stdout.toString(),
      stderr: result.stderr.toString(),
      exitCode: 0
    }
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; code?: number }
    return {
      stdout: failure.stdout?.toString() ?? "",
      stderr: failure.stderr?.toString() ?? String(error),
      exitCode: typeof failure.code === "number" ? failure.code : 1
    }
  }
}

export async function runGit(cwd: string, args: string[], timeoutMs = 30_000): Promise<CommandResult> {
  return runExecutable(cwd, "git", args, timeoutMs)
}

/** SIGTERM 后升级 SIGKILL 的间隔。与 probe.ts 及 leo arch §2.2 对齐。 */
export const TREE_KILL_TERM_MS = 1_500
/** 连根杀掉的正常 SLA。 */
export const TREE_KILL_SLA_MS = 2_000
/** 进程组探活间隔。 */
export const TREE_PROBE_MS = 50

const MAX_OUTPUT = 2_000_000

export type RunExecutableTreeOptions = {
  timeoutMs?: number
  signal?: AbortSignal
  onSpawn?: (pid: number) => void
  onChildExit?: (pid: number) => void
  extraEnv?: NodeJS.ProcessEnv
}

export type ExecutableTreeResult = CommandResult & {
  pid?: number
  tree: "confirmed" | "best_effort"
  processExit: "exited" | "killed" | "unconfirmed"
}

export function isWindowsPlatform(platform = process.platform): boolean {
  return platform === "win32"
}

/** 夹具 / 单测从最底层注入「是否仍存活」，走同一套探活 / rekill / 上限代码。 */
const livenessOverrides = new Map<number, boolean>()
let livenessProbe: ((pid: number) => boolean | undefined) | undefined

type TreeClock = {
  now: () => number
  setTimeout: typeof setTimeout
  setInterval: typeof setInterval
  clearTimeout: typeof clearTimeout
  clearInterval: typeof clearInterval
}

const realTreeClock: TreeClock = {
  now: () => Date.now(),
  setTimeout,
  setInterval,
  clearTimeout,
  clearInterval
}

let treeClock: TreeClock = realTreeClock

export function setTreeLivenessOverride(pid: number, alive: boolean): void {
  livenessOverrides.set(pid, alive)
}

export function clearTreeLivenessOverride(pid?: number): void {
  if (typeof pid === "number") livenessOverrides.delete(pid)
  else livenessOverrides.clear()
}

export function setTreeLivenessProbeForTest(probe?: (pid: number) => boolean | undefined): void {
  livenessProbe = probe
}

export function setTreeClockForTest(clock?: TreeClock): void {
  treeClock = clock ?? realTreeClock
}

/** 只影响探活与 rekill 是否按 Windows 子进程退出即结束，不改变真实杀进程路径。 */
let livenessPlatform: NodeJS.Platform | undefined

export function setTreeLivenessPlatformForTest(platform?: NodeJS.Platform): void {
  livenessPlatform = platform
}

export function isWindowsLivenessPlatform(platform = process.platform): boolean {
  return isWindowsPlatform(livenessPlatform ?? platform)
}

const treeWaits = new Map<number, () => void>()

/** 硬上限落定时放弃仍在探活的 runExecutableTree，避免句柄泄漏。 */
export function abandonTreeWait(pid: number): void {
  const stop = treeWaits.get(pid)
  if (stop) stop()
}

export function resetTreeLivenessForTest(): void {
  livenessOverrides.clear()
  livenessProbe = undefined
  treeClock = realTreeClock
  livenessPlatform = undefined
  for (const stop of treeWaits.values()) {
    try {
      stop()
    } catch {
      // test reset
    }
  }
  treeWaits.clear()
}

function overriddenAlive(pid: number): boolean | undefined {
  const pinned = treeLivenessOverride(pid)
  if (typeof pinned === "boolean") return pinned
  return livenessProbe?.(pid)
}

/** 仅 pid 级夹具覆盖（不含全局 probe）。STUCK 钉死后，Windows 也不能因 childExited 提前结束。 */
export function treeLivenessOverride(pid: number): boolean | undefined {
  return livenessOverrides.has(pid) ? livenessOverrides.get(pid) : undefined
}

/** 单进程探活：kill(pid, 0) 抛错即不存在。夹具可覆盖。 */
export function processAlive(pid: number): boolean {
  const over = overriddenAlive(pid)
  if (typeof over === "boolean") return over
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return processAliveFromSignalError(error)
  }
}

/** Windows / POSIX 一致：EPERM 视为仍存活（无权限探，不等于进程已死）。 */
export function processAliveFromSignalError(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === "EPERM"
}

/**
 * POSIX：kill(-pgid, 0) 抛 ESRCH 才算整组已死。
 * Windows：只能探直接子进程，结论须标 best_effort。
 */
export function processGroupAlive(pgid: number, platform = process.platform): boolean {
  const over = overriddenAlive(pgid)
  if (typeof over === "boolean") return over
  if (isWindowsPlatform(platform)) return processAlive(pgid)
  try {
    process.kill(-pgid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH"
  }
}

export function isTreeAlive(pid: number, platform = process.platform): boolean {
  return isWindowsPlatform(platform) ? processAlive(pid) : processGroupAlive(pid, platform)
}

export async function taskkillTree(pid: number): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("taskkill", ["/PID", String(pid), "/T", "/F"], {
      windowsHide: true,
      shell: false,
      stdio: "ignore"
    })
    let ok = true
    child.on("error", () => {
      ok = false
      resolve(false)
    })
    child.on("exit", (code) => {
      resolve(ok && (code === 0 || code === 128 || code === 1))
    })
  })
}

/** 「再停一次」：POSIX 直接 SIGKILL 进程组，Windows 直接 taskkill /T /F。 */
export async function forceKillTree(pid: number, platform = process.platform): Promise<void> {
  if (isWindowsPlatform(platform)) {
    await taskkillTree(pid)
    try {
      process.kill(pid)
    } catch {
      // ESRCH：已经不在了
    }
    return
  }
  try {
    process.kill(-pid, "SIGKILL")
  } catch {
    // ESRCH
  }
}

function appendCapped(current: string, chunk: Buffer | string): string {
  if (current.length >= MAX_OUTPUT) return current
  const next = current + String(chunk)
  return next.length > MAX_OUTPUT ? next.slice(0, MAX_OUTPUT) : next
}

function treeCertainty(platform = process.platform): "confirmed" | "best_effort" {
  return isWindowsPlatform(platform) ? "best_effort" : "confirmed"
}

export function toAbortError(signal?: AbortSignal): Error {
  if (signal?.reason instanceof Error) return signal.reason
  const error = new Error("The operation was aborted")
  error.name = "AbortError"
  return error
}

/**
 * 带进程组查杀的 spawn。POSIX 用 detached 新进程组 + kill(-pgid)；
 * Windows 用 taskkill /T /F 并重试一次。runExecutable 保留不删。
 */
export function runExecutableTree(
  cwd: string,
  executable: string,
  args: string[],
  options: RunExecutableTreeOptions = {}
): Promise<ExecutableTreeResult> {
  const timeoutMs = options.timeoutMs ?? 30_000
  const signal = options.signal
  const platform = process.platform
  const certainty = treeCertainty(platform)
  const windows = isWindowsPlatform(platform)

  if (signal?.aborted) {
    return Promise.reject(toAbortError(signal))
  }

  return new Promise((resolve) => {
    let stdout = ""
    let stderr = ""
    let settled = false
    let killing = false
    let processExit: ExecutableTreeResult["processExit"] = "exited"
    let childExited = false
    let exitCode = 1
    const timers: Array<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>> = []

    const child = spawn(executable, args, {
      cwd,
      shell: false,
      windowsHide: true,
      detached: !windows,
      stdio: ["ignore", "pipe", "pipe"],
      env: options.extraEnv ? { ...process.env, ...options.extraEnv } : undefined
    })

    const pid = child.pid
    if (typeof pid === "number") {
      options.onSpawn?.(pid)
      treeWaits.set(pid, () => {
        if (settled) return
        processExit = "unconfirmed"
        finish(snapshot("unconfirmed"))
      })
    }

    const clearTimers = () => {
      for (const timer of timers) {
        treeClock.clearTimeout(timer as ReturnType<typeof setTimeout>)
        treeClock.clearInterval(timer as ReturnType<typeof setInterval>)
      }
      timers.length = 0
    }

    const finish = (result: ExecutableTreeResult) => {
      if (settled) return
      settled = true
      if (typeof pid === "number") treeWaits.delete(pid)
      clearTimers()
      signal?.removeEventListener("abort", onAbort)
      resolve(result)
    }

    const treeDead = (): boolean => {
      if (typeof pid !== "number") return childExited
      // pid 级夹具覆盖优先（STUCK 钉活）：全局 probe 仍视为「pid 探活」，不能压过 childExited。
      if (typeof pid === "number") {
        const pinned = treeLivenessOverride(pid)
        if (typeof pinned === "boolean") return !pinned
      }
      // Windows：子进程一退出就判树已结束（best_effort），避免 pid 复用误判仍存活。
      if (isWindowsLivenessPlatform(platform)) return childExited
      return childExited && !processGroupAlive(pid, platform)
    }

    const snapshot = (forced?: ExecutableTreeResult["processExit"]): ExecutableTreeResult => ({
      stdout,
      stderr,
      exitCode,
      pid,
      tree: certainty,
      processExit: forced ?? processExit
    })

    const probeUntilDeadOrSla = (t0: number) => {
      let loggedSla = false
      const probe = treeClock.setInterval(() => {
        if (settled) {
          treeClock.clearInterval(probe)
          return
        }
        if (treeDead()) {
          treeClock.clearInterval(probe)
          processExit = "killed"
          finish(snapshot("killed"))
          return
        }
        // 满 2s 仍存活：只记日志，继续探活，不落 unconfirmed / maybe_partial。
        if (!loggedSla && treeClock.now() - t0 >= TREE_KILL_SLA_MS) {
          loggedSla = true
          if (typeof pid === "number" && isTreeAlive(pid, platform)) {
            console.error("[stop] process tree still alive after kill SLA, keep probing", { pid, platform })
          }
        }
      }, TREE_PROBE_MS)
      // 进入查杀后计时器不得 unref，否则 Linux CI 会在探活未完成时被 cancelled。
      timers.push(probe)
    }

    const startKill = () => {
      if (settled || killing) return
      killing = true
      processExit = "killed"
      const t0 = treeClock.now()
      const upgrade = treeClock.setTimeout(() => {
        if (settled || treeDead()) return
        if (windows) {
          if (typeof pid === "number") {
            void taskkillTree(pid).finally(() => {
              try {
                child.kill()
              } catch {
                // already gone
              }
            })
          } else {
            try {
              child.kill()
            } catch {
              // ignore
            }
          }
          return
        }
        if (typeof pid === "number") {
          try {
            process.kill(-pid, "SIGKILL")
          } catch {
            // ESRCH
          }
        }
      }, TREE_KILL_TERM_MS)
      timers.push(upgrade)
      if (windows) {
        if (typeof pid === "number") void taskkillTree(pid)
        else {
          try {
            child.kill()
          } catch {
            // ignore
          }
        }
      } else if (typeof pid === "number") {
        try {
          process.kill(-pid, "SIGTERM")
        } catch {
          // ESRCH
        }
      }
      probeUntilDeadOrSla(t0)
    }

    const onAbort = () => startKill()

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout = appendCapped(stdout, chunk)
    })
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr = appendCapped(stderr, chunk)
    })

    const noteChildExit = () => {
      if (typeof pid === "number") options.onChildExit?.(pid)
    }

    child.on("error", (error) => {
      if (settled) return
      stderr = appendCapped(stderr, error.message)
      exitCode = 1
      childExited = true
      noteChildExit()
      if (killing) return
      finish(snapshot("exited"))
    })

    child.on("exit", (code, killSignal) => {
      childExited = true
      noteChildExit()
      exitCode = typeof code === "number" ? code : killSignal ? 1 : 0
      if (settled) return
      if (killing) {
        if (treeDead()) {
          processExit = "killed"
          finish(snapshot("killed"))
        }
        return
      }
      processExit = "exited"
      finish(snapshot("exited"))
    })

    if (signal) signal.addEventListener("abort", onAbort, { once: true })
    if (signal?.aborted) startKill()

    const timeout = treeClock.setTimeout(() => startKill(), timeoutMs)
    timeout.unref?.()
    timers.push(timeout)

    // 超时路径（未点停止）也必须有上限：起进程 + timeoutMs + 2s，到点按 unconfirmed 结束。
    const cap = treeClock.setTimeout(() => {
      if (settled) return
      processExit = "unconfirmed"
      if (typeof pid === "number" && !treeDead()) {
        console.error("[stop] process tree still alive after wait cap", { pid, platform })
      }
      finish(snapshot("unconfirmed"))
    }, timeoutMs + TREE_KILL_SLA_MS)
    timers.push(cap)
  })
}

export async function runGitTree(
  cwd: string,
  args: string[],
  options: RunExecutableTreeOptions = {}
): Promise<ExecutableTreeResult> {
  return runExecutableTree(cwd, "git", args, options)
}
