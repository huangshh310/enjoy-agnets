/**
 * SSH AgentWorkspaceHost：文件 / bash / git 经连接层，路径 jail 在 remote_path。
 * bash 先在本机拆成 argv 再 quote，禁止把用户字符串直接拼进远端 shell。
 */
import type { AgentWorkspaceHost } from "@enjoy-agents/agent-core"
import { parseExecutableCommand } from "../command.ts"
import { quoteRemote, resolveRemoteJail, toRemoteRelative } from "./ssh-path.ts"
import { disconnectedError } from "./ssh-errors.ts"
import type { SshConnectionLayer } from "./ssh.types.ts"

const IGNORED = new Set(["node_modules", ".git", "dist", "out", ".turbo", "coverage"])

type HostCtx = {
  conn: SshConnectionLayer
  remotePath: string
  jail: (relativePath: string) => string
  requireLive: () => void
}

export function createSshWorkspaceHost(conn: SshConnectionLayer, remotePath: string): AgentWorkspaceHost {
  const ctx: HostCtx = {
    conn,
    remotePath,
    jail: (relativePath) => resolveRemoteJail(remotePath, relativePath),
    requireLive: () => {
      if (conn.status !== "connected") throw disconnectedError("io")
    }
  }
  return { ...fileOps(ctx), ...searchOps(ctx), ...gitOps(ctx) }
}

function fileOps(ctx: HostCtx): Pick<AgentWorkspaceHost, "readFile" | "writeFile" | "editFile" | "listDir" | "bash"> {
  return {
    readFile: async (relativePath) => {
      ctx.requireLive()
      return ctx.conn.readFile(ctx.jail(relativePath))
    },
    writeFile: async (relativePath, content) => {
      ctx.requireLive()
      await ctx.conn.writeFile(ctx.jail(relativePath), content)
    },
    editFile: async (relativePath, oldText, newText) => {
      ctx.requireLive()
      const abs = ctx.jail(relativePath)
      const current = await ctx.conn.readFile(abs)
      if (!current.includes(oldText)) throw new Error(`oldText not found in ${relativePath}`)
      const next = current.replace(oldText, newText)
      await ctx.conn.writeFile(abs, next)
      return next
    },
    listDir: async (relativePath) => {
      ctx.requireLive()
      return (await ctx.conn.listDir(ctx.jail(relativePath))).filter((entry) => !IGNORED.has(entry.name))
    },
    bash: async (command) => {
      ctx.requireLive()
      const result = await ctx.conn.exec(remoteArgvCommand(ctx.remotePath, command))
      return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode }
    }
  }
}

/** grep 自己 glob，禁止再 new 一层 host。 */
function searchOps(ctx: HostCtx): Pick<AgentWorkspaceHost, "glob" | "grep"> {
  async function glob(pattern: string) {
    ctx.requireLive()
    const result = await ctx.conn.exec(`find ${quoteRemote(ctx.remotePath)} -type f`)
    const matcher = globToRegExp(pattern)
    return result.stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((abs) => toRemoteRelative(ctx.remotePath, abs))
      .filter((rel) => matcher.test(rel))
  }
  return {
    glob,
    grep: async (pattern, globPattern) => {
      ctx.requireLive()
      const files = await glob(globPattern ?? "**/*")
      return grepFiles(ctx, files, pattern)
    }
  }
}

async function grepFiles(ctx: HostCtx, files: string[], pattern: string) {
  const expression = new RegExp(pattern, "m")
  const matches: Array<{ path: string; line: number; text: string }> = []
  for (const filePath of files) {
    let content = ""
    try {
      content = await ctx.conn.readFile(ctx.jail(filePath))
    } catch {
      continue
    }
    content.split(/\r?\n/).forEach((text, index) => {
      if (expression.test(text)) matches.push({ path: filePath, line: index + 1, text })
    })
  }
  return matches
}

function gitOps(ctx: HostCtx): Pick<AgentWorkspaceHost, "gitStatus" | "gitDiff" | "gitLog" | "gitCommit" | "gitPush" | "gitBranch"> {
  const run = (args: string[]) => git(ctx.conn, ctx.remotePath, args)
  return {
    gitStatus: async () => {
      ctx.requireLive()
      return (await run(["status", "--porcelain"])).stdout
    },
    gitDiff: async (filePath) => {
      ctx.requireLive()
      return (await run(remoteGitDiffArgs(ctx, filePath))).stdout
    },
    gitLog: async (options) => {
      ctx.requireLive()
      const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100)
      const args = ["log", `-${limit}`, "--oneline", ...remoteGitPathArgs(ctx, options?.path)]
      return (await run(args)).stdout
    },
    gitCommit: async (message, options) => {
      ctx.requireLive()
      if (options?.stageAll) await run(["add", "-A"])
      const result = await run(["commit", "-m", message])
      if (result.exitCode !== 0) throw disconnectedOrGit(result.stderr)
      return result.stdout || result.stderr
    },
    gitPush: async () => {
      ctx.requireLive()
      const result = await run(["push"])
      if (result.exitCode !== 0) throw disconnectedOrGit(result.stderr)
      return result.stdout || result.stderr
    },
    gitBranch: async (name, checkout) => {
      ctx.requireLive()
      const result = await run(checkout ? ["checkout", "-b", name] : ["branch", name])
      if (result.exitCode !== 0) throw disconnectedOrGit(result.stderr)
      return result.stdout || result.stderr
    }
  }
}

async function git(conn: SshConnectionLayer, remotePath: string, args: string[]) {
  const quoted = args.map((part) => quoteRemote(part)).join(" ")
  return conn.exec(`git -C ${quoteRemote(remotePath)} ${quoted}`)
}

function remoteArgvCommand(remotePath: string, command: string): string {
  const parsed = parseExecutableCommand(command)
  const argv = [parsed.executable, ...parsed.args].map((part) => quoteRemote(part)).join(" ")
  return `cd ${quoteRemote(remotePath)} && exec ${argv}`
}

function remoteGitDiffArgs(ctx: HostCtx, filePath?: string): string[] {
  return ["diff", ...remoteGitPathArgs(ctx, filePath)]
}

function remoteGitPathArgs(ctx: HostCtx, filePath?: string): string[] {
  const raw = filePath?.trim()
  if (!raw) return []
  return ["--", toRemoteRelative(ctx.remotePath, ctx.jail(raw))]
}

function disconnectedOrGit(stderr: string): Error {
  const lower = stderr.toLowerCase()
  if (lower.includes("connection") || lower.includes("disconnected")) return disconnectedError("git")
  return new Error(stderr.trim() || "git failed")
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replaceAll("**", ":::").replaceAll("*", "[^/]*").replaceAll(":::", ".*")
  return new RegExp(`^${escaped}$`)
}
