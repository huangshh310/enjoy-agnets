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

/** 单进程探活：kill(pid, 0) 抛错即不存在。 */
export function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/**
 * POSIX：kill(-pgid, 0) 抛 ESRCH 才算整组已死。
 * Windows：只能探直接子进程，结论须标 best_effort。
 */
export function processGroupAlive(pgid: number, platform = process.platform): boolean {
  if (isWindowsPlatform(platform)) return processAlive(pgid)
  try {
    process.kill(-pgid, 0)
    return true
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH"
  }
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
    const timers: { unref?: () => void; refresh?: () => void }[] = []

    const child = spawn(executable, args, {
      cwd,
      shell: false,
      windowsHide: true,
      detached: !windows,
      stdio: ["ignore", "pipe", "pipe"],
      env: options.extraEnv ? { ...process.env, ...options.extraEnv } : undefined
    })

    const pid = child.pid
    if (typeof pid === "number") options.onSpawn?.(pid)

    const clearTimers = () => {
      for (const timer of timers) clearTimeout(timer as ReturnType<typeof setTimeout>)
      timers.length = 0
    }

    const finish = (result: ExecutableTreeResult) => {
      if (settled) return
      settled = true
      clearTimers()
      signal?.removeEventListener("abort", onAbort)
      resolve(result)
    }

    const treeDead = (): boolean => {
      if (typeof pid !== "number") return childExited
      if (windows) return childExited && !processAlive(pid)
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
      const probe = setInterval(() => {
        if (settled) {
          clearInterval(probe)
          return
        }
        if (treeDead()) {
          clearInterval(probe)
          processExit = "killed"
          finish(snapshot("killed"))
          return
        }
        if (Date.now() - t0 >= TREE_KILL_SLA_MS) {
          clearInterval(probe)
          processExit = "unconfirmed"
          if (typeof pid === "number" && (windows ? processAlive(pid) : processGroupAlive(pid, platform))) {
            console.error("[stop] process tree still alive after kill SLA", { pid, platform })
          }
          finish(snapshot("unconfirmed"))
        }
      }, TREE_PROBE_MS)
      probe.unref?.()
    }

    const startKill = () => {
      if (settled || killing) return
      killing = true
      processExit = "killed"
      const t0 = Date.now()
      const upgrade = setTimeout(() => {
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
      upgrade.unref?.()
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

    child.on("error", (error) => {
      if (settled) return
      stderr = appendCapped(stderr, error.message)
      exitCode = 1
      childExited = true
      if (killing) return
      finish(snapshot("exited"))
    })

    child.on("exit", (code, killSignal) => {
      childExited = true
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

    const timeout = setTimeout(() => startKill(), timeoutMs)
    timeout.unref?.()
    timers.push(timeout)
  })
}

export async function runGitTree(
  cwd: string,
  args: string[],
  options: RunExecutableTreeOptions = {}
): Promise<ExecutableTreeResult> {
  return runExecutableTree(cwd, "git", args, options)
}
