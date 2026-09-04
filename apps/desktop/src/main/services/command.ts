import { execFile } from "node:child_process"
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
