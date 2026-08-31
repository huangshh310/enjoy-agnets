/**
 * 工作区 host：工具读写 / glob / grep / bash / git，路径锁在根内。
 */
import { promises as fs } from "node:fs"
import { dirname, extname, join } from "node:path"
import { assertSandboxCommand, type AgentWorkspaceHost } from "@enjoy-agents/agent-core"
import { parseExecutableCommand, runExecutable, runGit } from "./command"
import { resolveInsideWorkspace, toWorkspaceRelative } from "./paths"
import { readPreferences } from "./preferences"

const IGNORED = new Set(["node_modules", ".git", "dist", "out", ".turbo", "coverage"])

export function createWorkspaceHost(workspaceRoot: string): AgentWorkspaceHost {
  return {
    readFile: async (relativePath) => {
      const absolute = resolveInsideWorkspace(workspaceRoot, relativePath)
      return fs.readFile(absolute, "utf8")
    },
    writeFile: async (relativePath, content) => {
      const absolute = resolveInsideWorkspace(workspaceRoot, relativePath)
      await fs.mkdir(dirname(absolute), { recursive: true })
      await fs.writeFile(absolute, content, "utf8")
    },
    editFile: async (relativePath, oldText, newText) => {
      const absolute = resolveInsideWorkspace(workspaceRoot, relativePath)
      const current = await fs.readFile(absolute, "utf8")
      if (!current.includes(oldText)) {
        throw new Error(`oldText not found in ${relativePath}`)
      }
      const next = current.replace(oldText, newText)
      await fs.writeFile(absolute, next, "utf8")
      return next
    },
    listDir: async (relativePath) => {
      const absolute = resolveInsideWorkspace(workspaceRoot, relativePath)
      const entries = await fs.readdir(absolute, { withFileTypes: true })
      return entries
        .filter((entry) => !IGNORED.has(entry.name))
        .map((entry) => ({
          name: entry.name,
          kind: entry.isDirectory() ? ("directory" as const) : ("file" as const)
        }))
    },
    glob: async (pattern) => collectFiles(workspaceRoot, pattern),
    grep: async (pattern, glob) => grepFiles(workspaceRoot, pattern, glob),
    bash: async (command) => {
      assertSandboxCommand(command, { allowNetwork: readPreferences().sandboxNetwork })
      const parsed = parseExecutableCommand(command)
      return runExecutable(
        workspaceRoot,
        parsed.executable,
        parsed.args,
        readPreferences().toolTimeoutMs
      )
    },
    gitStatus: async () => (await runGit(workspaceRoot, ["status", "--porcelain"])).stdout,
    gitDiff: async (filePath) => {
      const args = filePath ? ["diff", "--", filePath] : ["diff"]
      return (await runGit(workspaceRoot, args)).stdout
    },
    gitCommit: async (message) => commitAll(workspaceRoot, message)
  }
}

async function commitAll(workspaceRoot: string, message: string): Promise<string> {
  const staged = await runGit(workspaceRoot, ["add", "-A"])
  if (staged.exitCode !== 0) {
    throw new Error(staged.stderr || "git add failed")
  }
  const committed = await runGit(workspaceRoot, ["commit", "-m", message])
  if (committed.exitCode !== 0) {
    throw new Error(committed.stderr || "git commit failed")
  }
  return committed.stdout
}

async function collectFiles(workspaceRoot: string, pattern: string): Promise<string[]> {
  const matcher = globToRegExp(pattern)
  const files: string[] = []
  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      if (IGNORED.has(entry.name)) continue
      const absolute = join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(absolute)
        continue
      }
      const relativePath = toWorkspaceRelative(workspaceRoot, absolute)
      if (matcher.test(relativePath)) files.push(relativePath)
    }
  }
  await walk(workspaceRoot)
  return files
}

async function grepFiles(workspaceRoot: string, pattern: string, glob?: string) {
  const expression = new RegExp(pattern, "m")
  const files = await collectFiles(workspaceRoot, glob ?? "**/*")
  const matches: Array<{ path: string; line: number; text: string }> = []
  for (const filePath of files) {
    if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".exe"].includes(extname(filePath))) {
      continue
    }
    const absolute = resolveInsideWorkspace(workspaceRoot, filePath)
    let content = ""
    try {
      content = await fs.readFile(absolute, "utf8")
    } catch {
      continue
    }
    content.split(/\r?\n/).forEach((text, index) => {
      if (expression.test(text)) {
        matches.push({ path: filePath, line: index + 1, text })
      }
    })
  }
  return matches
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^$(){}|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, ":::DOUBLE:::")
    .replace(/\*/g, "[^/]*")
    .replace(/:::DOUBLE:::/g, ".*")
    .replace(/\?/g, "[^/]")
  return new RegExp(`^${escaped}$`)
}
