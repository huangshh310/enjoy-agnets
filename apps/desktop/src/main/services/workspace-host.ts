/**
 * 工作区 host：工具读写 / glob / grep / bash / git，路径锁在根内。
 */
import { promises as fs } from "node:fs"
import { dirname, extname, join } from "node:path"
import { assertSandboxCommand, type AgentWorkspaceHost } from "@enjoy-agents/agent-core"
import type { AskUserAnswers } from "@enjoy-agents/ipc-contract"
import { parseExecutableCommand, runExecutable, runGit } from "./command"
import { resolveInsideWorkspace, toWorkspaceRelative } from "./paths"
import { gitLogCommandArgs } from "./workspace-git-agent-log"
import { readPreferences } from "./preferences"
import { recordEnjoyCheckpoint } from "./workspace-git-checkpoint"
import { commitWorkspaceAll } from "./workspace-git"
import { pushWorkspace } from "./workspace-git-remote"

const IGNORED = new Set(["node_modules", ".git", "dist", "out", ".turbo", "coverage"])

export function createWorkspaceHost(
  workspaceRoot: string,
  extras?: { takeQuestionAnswers?: () => AskUserAnswers | undefined }
): AgentWorkspaceHost {
  return {
    readFile: async (relativePath) => {
      const absolute = resolveInsideWorkspace(workspaceRoot, relativePath)
      return fs.readFile(absolute, "utf8")
    },
    writeFile: async (relativePath, content) => {
      const absolute = resolveInsideWorkspace(workspaceRoot, relativePath)
      await fs.mkdir(dirname(absolute), { recursive: true })
      await fs.writeFile(absolute, content, "utf8")
      await recordEnjoyCheckpoint(workspaceRoot)
      await triggerOnSaveForRoot(workspaceRoot)
    },
    editFile: async (relativePath, oldText, newText) => {
      const absolute = resolveInsideWorkspace(workspaceRoot, relativePath)
      const current = await fs.readFile(absolute, "utf8")
      if (!current.includes(oldText)) {
        throw new Error(`oldText not found in ${relativePath}`)
      }
      const next = current.replace(oldText, newText)
      await fs.writeFile(absolute, next, "utf8")
      await recordEnjoyCheckpoint(workspaceRoot)
      await triggerOnSaveForRoot(workspaceRoot)
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
    gitLog: async (options) => {
      const raw = options?.path?.trim()
      const path = raw
        ? toWorkspaceRelative(workspaceRoot, resolveInsideWorkspace(workspaceRoot, raw))
        : undefined
      const result = await runGit(workspaceRoot, gitLogCommandArgs({ limit: options?.limit, path }))
      return result.stdout.trim() ? result.stdout : result.stderr
    },
    gitCommit: async (message) => {
      const result = await commitWorkspaceAll(workspaceRoot, message)
      return result.output
    },
    gitPush: async () => {
      const result = await pushWorkspace(workspaceRoot)
      return result.output
    },
    takeQuestionAnswers: extras?.takeQuestionAnswers
  }
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

async function triggerOnSaveForRoot(workspaceRoot: string): Promise<void> {
  const { listActiveRuns } = await import("./agent-run-state")
  const { fireOnSaveAutomations } = await import("./automations-run")
  const active = listActiveRuns().find((item) => item.run.workspaceRoot === workspaceRoot)
  if (!active) return
  await fireOnSaveAutomations(
    active.run.window,
    active.run.input.workspaceId,
    active.run.input.sessionId
  )
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
