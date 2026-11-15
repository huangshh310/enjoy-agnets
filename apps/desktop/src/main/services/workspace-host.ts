/**
 * 工作区 host：工具读写 / glob / grep / bash / git，路径锁在根内。
 */
import { promises as fs } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, extname, join } from "node:path"
import type { AgentWorkspaceHost, WorkspaceHostCallOpts } from "@enjoy-agents/agent-core"
import { assertSandboxCommand } from "../../../../../packages/agent-core/src/policies/sandbox.ts"
import { parseExecutableCommand, runExecutableTree, runGit, toAbortError } from "./command"
import { buildSeatbeltProfile, seatbeltWrap, shouldUseOsSandbox } from "./os-sandbox"
import { resolveInsideWorkspace, toWorkspaceRelative } from "./paths"
import { gitLogCommandArgs } from "./workspace-git-agent-log"
import { readPreferences } from "./preferences"
import { effectiveToolTimeoutMs } from "./e2e-stub-gate"
import { recordEnjoyCheckpoint } from "./workspace-git-checkpoint"
import { commitWorkspaceAll } from "./workspace-git"
import { createWorkspaceBranch } from "./workspace-git-branch"
import { pushWorkspace } from "./workspace-git-remote"
import type { HostExtras } from "./workspace-host-factory"
import {
  begin as beginSideEffect,
  blocked as blockSideEffect,
  settle as settleSideEffect,
  settleOrBlock,
  spawned as spawnedSideEffect,
  type SideEffectOp
} from "./run-side-effects"

const IGNORED = new Set(["node_modules", ".git", "dist", "out", ".turbo", "coverage"])

type TouchKind = "file" | "directory"
type NoteTouched = (relativePath: string, kind: TouchKind) => void

type BoundHost = {
  runId?: string
  sessionId?: string
  signal?: AbortSignal
  toolTimeoutMs?: number
}

const LEDGER_OPS = new Set<SideEffectOp>([
  "write_file",
  "edit_file",
  "code_mode_script",
  "bash",
  "git_commit",
  "git_branch",
  "git_push",
  "mcp",
  "stub_write"
])

export function mergeHostSignals(bound?: AbortSignal, perCall?: AbortSignal): AbortSignal | undefined {
  if (bound && perCall) return AbortSignal.any([bound, perCall])
  return bound ?? perCall
}

function ledgerOp(raw: string | undefined, fallback: SideEffectOp): SideEffectOp {
  if (raw && LEDGER_OPS.has(raw as SideEffectOp)) return raw as SideEffectOp
  return fallback
}

function timeoutMs(bound?: BoundHost): number {
  return effectiveToolTimeoutMs(bound?.toolTimeoutMs ?? readPreferences().toolTimeoutMs)
}

function gateOrBegin(
  op: SideEffectOp,
  bound: BoundHost | undefined,
  opts: WorkspaceHostCallOpts | undefined,
  signal: AbortSignal | undefined
): { entryId?: string } {
  const runId = bound?.runId
  if (!runId) {
    if (signal?.aborted) throw toAbortError(signal)
    return {}
  }
  const ctx = { runId, toolCallId: opts?.toolCallId, toolTimeoutMs: timeoutMs(bound) }
  if (signal?.aborted) {
    blockSideEffect(op, ctx)
    throw toAbortError(signal)
  }
  return { entryId: beginSideEffect(op, ctx).id }
}

export function createWorkspaceHost(workspaceRoot: string, extras?: HostExtras): AgentWorkspaceHost {
  const note: NoteTouched = (relativePath, kind) => extras?.onTouchedPath?.(relativePath, kind)
  const bound: BoundHost = {
    runId: extras?.runId,
    sessionId: extras?.sessionId,
    signal: extras?.signal,
    toolTimeoutMs: extras?.toolTimeoutMs
  }
  return {
    ...workspaceFileOps(workspaceRoot, note, bound),
    glob: async (pattern) => collectFiles(workspaceRoot, pattern),
    grep: async (pattern, glob) => grepFiles(workspaceRoot, pattern, glob),
    bash: (command, opts) => runWorkspaceBash(workspaceRoot, command, bound, opts),
    ...workspaceGitOps(workspaceRoot, bound),
    takeQuestionAnswers: extras?.takeQuestionAnswers
  }
}

function workspaceFileOps(workspaceRoot: string, note: NoteTouched, bound: BoundHost) {
  return {
    readFile: async (relativePath: string) => {
      const absolute = resolveInsideWorkspace(workspaceRoot, relativePath)
      note(toWorkspaceRelative(workspaceRoot, absolute), "file")
      return fs.readFile(absolute, "utf8")
    },
    writeFile: async (relativePath: string, content: string, opts?: WorkspaceHostCallOpts) => {
      const signal = mergeHostSignals(bound.signal, opts?.signal)
      const op = ledgerOp(opts?.op, "write_file")
      const absolute = resolveInsideWorkspace(workspaceRoot, relativePath)
      note(toWorkspaceRelative(workspaceRoot, absolute), "file")
      const { entryId } = gateOrBegin(op, bound, opts, signal)
      try {
        await fs.mkdir(dirname(absolute), { recursive: true })
        await fs.writeFile(absolute, content, "utf8")
        if (entryId) settleSideEffect(entryId, "ok")
      } catch (error) {
        if (entryId) settleOrBlock(entryId, "error")
        throw error
      }
      await recordEnjoyCheckpoint(workspaceRoot, await turnCheckpointMeta(workspaceRoot, bound))
      if (!signal?.aborted) await triggerOnSaveForRoot(workspaceRoot, bound)
    },
    editFile: async (relativePath: string, oldText: string, newText: string, opts?: WorkspaceHostCallOpts) => {
      const signal = mergeHostSignals(bound.signal, opts?.signal)
      const absolute = resolveInsideWorkspace(workspaceRoot, relativePath)
      note(toWorkspaceRelative(workspaceRoot, absolute), "file")
      const current = await fs.readFile(absolute, "utf8")
      if (!current.includes(oldText)) {
        throw new Error(`oldText not found in ${relativePath}`)
      }
      const { entryId } = gateOrBegin("edit_file", bound, opts, signal)
      const next = current.replace(oldText, newText)
      try {
        await fs.writeFile(absolute, next, "utf8")
        if (entryId) settleSideEffect(entryId, "ok")
      } catch (error) {
        if (entryId) settleOrBlock(entryId, "error")
        throw error
      }
      await recordEnjoyCheckpoint(workspaceRoot, await turnCheckpointMeta(workspaceRoot, bound))
      if (!signal?.aborted) await triggerOnSaveForRoot(workspaceRoot, bound)
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

async function runWorkspaceBash(
  workspaceRoot: string,
  command: string,
  bound: BoundHost,
  opts?: WorkspaceHostCallOpts
) {
  const prefs = readPreferences()
  const signal = mergeHostSignals(bound.signal, opts?.signal)
  assertSandboxCommand(command, { allowNetwork: prefs.sandboxNetwork })
  const parsed = parseExecutableCommand(command)
  const { entryId } = gateOrBegin("bash", bound, opts, signal)
  try {
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
    const result = await runExecutableTree(workspaceRoot, launched.executable, launched.args, {
      timeoutMs: timeoutMs(bound),
      signal,
      onSpawn: (pid) => {
        if (entryId) spawnedSideEffect(entryId, pid)
      }
    })
    if (entryId) {
      const outcome = result.processExit === "exited" && !signal?.aborted ? "exited" : result.processExit
      settleSideEffect(entryId, outcome === "exited" || outcome === "killed" || outcome === "unconfirmed" ? outcome : "exited", {
        tree: result.tree
      })
    }
    return { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode }
  } catch (error) {
    if (entryId) settleOrBlock(entryId, "error")
    throw error
  }
}

export async function saveHostHeartbeat(input: import("@enjoy-agents/agent-core").SessionHeartbeatRequest) {
  const { putHeartbeat } = await import("./session-heartbeat-store")
  try {
    const saved = putHeartbeat({
      sessionId: input.sessionId,
      cronExpr: input.cadence,
      prompt: input.prompt,
      maxRuns: input.maxRuns
    })
    return { ok: true as const, cronExpr: saved.cronExpr }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false as const, error: message }
  }
}

function gitPathArgs(workspaceRoot: string, filePath?: string): string[] {
  const raw = filePath?.trim()
  if (!raw) return []
  const rel = toWorkspaceRelative(workspaceRoot, resolveInsideWorkspace(workspaceRoot, raw))
  return ["--", rel]
}

function workspaceGitOps(workspaceRoot: string, bound: BoundHost) {
  return {
    gitStatus: async () => (await runGit(workspaceRoot, ["status", "--porcelain"])).stdout,
    gitDiff: async (filePath?: string) => {
      const args = ["diff", ...gitPathArgs(workspaceRoot, filePath)]
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
    gitCommit: async (message: string, options?: { stageAll?: boolean } & WorkspaceHostCallOpts) => {
      const signal = mergeHostSignals(bound.signal, options?.signal)
      const { entryId } = gateOrBegin("git_commit", bound, options, signal)
      try {
        const result = await commitWorkspaceAll(workspaceRoot, message, options?.stageAll === true)
        if (entryId) settleSideEffect(entryId, "ok")
        return result.output
      } catch (error) {
        if (entryId) settleOrBlock(entryId, "error")
        throw error
      }
    },
    gitBranch: async (name: string, checkout?: boolean, opts?: WorkspaceHostCallOpts) => {
      const signal = mergeHostSignals(bound.signal, opts?.signal)
      const { entryId } = gateOrBegin("git_branch", bound, opts, signal)
      try {
        const result = await createWorkspaceBranch(workspaceRoot, name, checkout)
        if (entryId) settleSideEffect(entryId, "ok")
        return result
      } catch (error) {
        if (entryId) settleOrBlock(entryId, "error")
        throw error
      }
    },
    gitPush: async (opts?: WorkspaceHostCallOpts) => {
      const signal = mergeHostSignals(bound.signal, opts?.signal)
      const { entryId } = gateOrBegin("git_push", bound, opts, signal)
      try {
        const result = await pushWorkspace(workspaceRoot, {
          signal,
          timeoutMs: timeoutMs(bound),
          onSpawn: (pid) => {
            if (entryId) spawnedSideEffect(entryId, pid)
          }
        })
        if (entryId) settleSideEffect(entryId, signal?.aborted ? "killed" : "ok")
        return result.output
      } catch (error) {
        if (entryId) settleOrBlock(entryId, signal?.aborted ? "killed" : "error")
        throw error
      }
    }
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

/** grep 单文件上限：超限跳过，防大产物 / 日志把整轮 grep 拖死。 */
const GREP_MAX_FILE_BYTES = 2 * 1024 * 1024
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".exe", ".dll", ".dylib", ".so",
  ".pdf", ".zip", ".gz", ".tar", ".br", ".woff", ".woff2", ".ttf", ".otf", ".mp4", ".mp3",
  ".sqlite", ".db", ".icns", ".wasm", ".node"
])

async function grepFiles(workspaceRoot: string, pattern: string, glob?: string) {
  const expression = new RegExp(pattern, "m")
  const files = await collectFiles(workspaceRoot, glob ?? "**/*")
  const matches: Array<{ path: string; line: number; text: string }> = []
  for (const filePath of files) {
    if (BINARY_EXTENSIONS.has(extname(filePath))) {
      continue
    }
    const absolute = resolveInsideWorkspace(workspaceRoot, filePath)
    let content = ""
    try {
      const stat = await fs.stat(absolute)
      if (stat.size > GREP_MAX_FILE_BYTES) continue
      content = await fs.readFile(absolute, "utf8")
    } catch {
      continue
    }
    // 二进制误入（无扩展名）通常表现为 NUL 字节；截断到首段可读内容。
    const nul = content.indexOf("\0")
    if (nul !== -1) content = content.slice(0, nul)
    content.split(/\r?\n/).forEach((text, index) => {
      if (expression.test(text)) {
        matches.push({ path: filePath, line: index + 1, text })
      }
    })
  }
  return matches
}

async function triggerOnSaveForRoot(workspaceRoot: string, bound?: BoundHost): Promise<void> {
  if (bound?.signal?.aborted) return
  const { getActiveRun, listActiveRuns } = await import("./agent-run-state")
  const active = bound?.runId
    ? (() => {
        const run = getActiveRun(bound.runId!)
        return run ? { runId: bound.runId as string, run } : undefined
      })()
    : listActiveRuns().find((item) => item.run.workspaceRoot === workspaceRoot)
  if (!active) return
  const { fireOnSaveAutomations } = await import("./automations-run")
  if (bound?.signal?.aborted) return
  if (bound?.runId && active.runId !== bound.runId) return
  await fireOnSaveAutomations(
    active.run.window,
    active.run.input.workspaceId,
    active.run.input.sessionId
  )
}

async function turnCheckpointMeta(workspaceRoot: string, bound?: BoundHost) {
  if (bound?.runId) {
    const sessionId = bound.sessionId ?? (await activeRunForRoot(workspaceRoot))?.run.input.sessionId
    if (!sessionId) return { sessionId: bound.runId, runId: bound.runId, kind: "turn" as const }
    return { sessionId, runId: bound.runId, kind: "turn" as const }
  }
  const active = await activeRunForRoot(workspaceRoot)
  if (!active) return undefined
  return {
    sessionId: active.run.input.sessionId,
    runId: active.runId,
    kind: "turn" as const
  }
}

async function activeRunForRoot(workspaceRoot: string) {
  const { listActiveRuns } = await import("./agent-run-state")
  return listActiveRuns().find((item) => item.run.workspaceRoot === workspaceRoot)
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
