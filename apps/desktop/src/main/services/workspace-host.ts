/**
 * 工作区 host：工具读写 / glob / grep / bash / git，路径锁在根内。
 */
import { promises as fs } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, extname, join } from "node:path"
import { assertSandboxCommand, type AgentWorkspaceHost } from "@enjoy-agents/agent-core"
import type { AskUserAnswers } from "@enjoy-agents/ipc-contract"
import { parseExecutableCommand, runExecutable, runGit } from "./command"
import { buildSeatbeltProfile, seatbeltWrap, shouldUseOsSandbox } from "./os-sandbox"
import { resolveInsideWorkspace, toWorkspaceRelative } from "./paths"
import { gitLogCommandArgs } from "./workspace-git-agent-log"
import { readPreferences } from "./preferences"
import { recordEnjoyCheckpoint } from "./workspace-git-checkpoint"
import { commitWorkspaceAll } from "./workspace-git"
import { createWorkspaceBranch } from "./workspace-git-branch"
import { pushWorkspace } from "./workspace-git-remote"

const IGNORED = new Set(["node_modules", ".git", "dist", "out", ".turbo", "coverage"])

type TouchKind = "file" | "directory"
type NoteTouched = (relativePath: string, kind: TouchKind) => void

export function createWorkspaceHost(
  workspaceRoot: string,
  extras?: {
    takeQuestionAnswers?: () => AskUserAnswers | undefined
    /** 模型工具碰到的路径。大纲 / glob / grep 不得走这条回调。 */
    onTouchedPath?: (relativePath: string, kind: TouchKind) => void
  }
): AgentWorkspaceHost {
  const note: NoteTouched = (relativePath, kind) => extras?.onTouchedPath?.(relativePath, kind)
  return {
    ...workspaceFileOps(workspaceRoot, note),
    glob: async (pattern) => collectFiles(workspaceRoot, pattern),
    grep: async (pattern, glob) => grepFiles(workspaceRoot, pattern, glob),
    bash: (command) => runWorkspaceBash(workspaceRoot, command),
    ...workspaceGitOps(workspaceRoot),
    takeQuestionAnswers: extras?.takeQuestionAnswers
  }
}

function workspaceFileOps(workspaceRoot: string, note: NoteTouched) {
  return {
    readFile: async (relativePath: string) => {
      const absolute = resolveInsideWorkspace(workspaceRoot, relativePath)
      note(toWorkspaceRelative(workspaceRoot, absolute), "file")
      return fs.readFile(absolute, "utf8")
    },
    writeFile: async (relativePath: string, content: string) => {
      const absolute = resolveInsideWorkspace(workspaceRoot, relativePath)
      note(toWorkspaceRelative(workspaceRoot, absolute), "file")
      await fs.mkdir(dirname(absolute), { recursive: true })
      await fs.writeFile(absolute, content, "utf8")
      await recordEnjoyCheckpoint(workspaceRoot)
      await triggerOnSaveForRoot(workspaceRoot)
    },
    editFile: async (relativePath: string, oldText: string, newText: string) => {
      const absolute = resolveInsideWorkspace(workspaceRoot, relativePath)
      note(toWorkspaceRelative(workspaceRoot, absolute), "file")
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
    listDir: async (relativePath: string, options?: { touch?: boolean }) => {
      const absolute = resolveInsideWorkspace(workspaceRoot, relativePath)
      if (options?.touch !== false) {
        note(toWorkspaceRelative(workspaceRoot, absolute), "directory")
      }
      const entries = await fs.readdir(absolute, { withFileTypes: true })
      return entries
        .filter((entry) => !IGNORED.has(entry.name))
        .map((entry) => ({
          name: entry.name,
          kind: entry.isDirectory() ? ("directory" as const) : ("file" as const)
        }))
    }
  }
}

async function runWorkspaceBash(workspaceRoot: string, command: string) {
  const prefs = readPreferences()
  assertSandboxCommand(command, { allowNetwork: prefs.sandboxNetwork })
  const parsed = parseExecutableCommand(command)
  const launched = shouldUseOsSandbox()
    ? seatbeltWrap(
        parsed.executable,
        parsed.args,
        buildSeatbeltProfile({
          workspaceRoot,
          tmpDir: tmpdir(),
          allowNetwork: prefs.sandboxNetwork
        })
      )
    : parsed
  return runExecutable(workspaceRoot, launched.executable, launched.args, prefs.toolTimeoutMs)
}

function workspaceGitOps(workspaceRoot: string) {
  return {
    gitStatus: async () => (await runGit(workspaceRoot, ["status", "--porcelain"])).stdout,
    gitDiff: async (filePath?: string) => {
      const args = filePath ? ["diff", "--", filePath] : ["diff"]
      return (await runGit(workspaceRoot, args)).stdout
    },
    gitLog: async (options?: { limit?: number; path?: string }) => {
      const raw = options?.path?.trim()
      const path = raw
        ? toWorkspaceRelative(workspaceRoot, resolveInsideWorkspace(workspaceRoot, raw))
        : undefined
      const result = await runGit(workspaceRoot, gitLogCommandArgs({ limit: options?.limit, path }))
      return result.stdout.trim() ? result.stdout : result.stderr
    },
    gitCommit: async (message: string, options?: { stageAll?: boolean }) => {
      const result = await commitWorkspaceAll(workspaceRoot, message, options?.stageAll === true)
      return result.output
    },
    gitBranch: async (name: string, checkout?: boolean) =>
      createWorkspaceBranch(workspaceRoot, name, checkout),
    gitPush: async () => (await pushWorkspace(workspaceRoot)).output
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
