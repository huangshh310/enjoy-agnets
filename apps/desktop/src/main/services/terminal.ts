/**
 * 工作区交互 shell：node-pty，原始按键进 PTY，不做按行回车。
 */
import * as pty from "node-pty"
import type { IPty } from "node-pty"
import type { WebContents } from "electron"
import { TerminalDataEvent, TerminalExitEvent } from "@enjoy-agents/ipc-contract"
import { createId } from "./ids"
import { getWorkspace } from "./workspace"
import { disconnectedError } from "./ssh/ssh-errors.ts"
import { getSshPoolEntry } from "./ssh/ssh-pool.ts"
import { launchRemoteProcess } from "./ssh/ssh-launch.ts"
import { quoteRemote } from "./ssh/ssh-path.ts"

type LiveSession = {
  pty: IPty
  sender: WebContents
}

const sessions = new Map<string, LiveSession>()

export async function openWorkspaceTerminal(
  workspaceId: string,
  sender: WebContents,
  size?: { cols?: number; rows?: number }
) {
  const workspace = await getWorkspace(workspaceId)
  const sessionId = createId("term")
  const launched = terminalLaunch(workspace)
  const child = pty.spawn(launched.command, launched.args, {
    name: "xterm-256color",
    cols: size?.cols ?? 80,
    rows: size?.rows ?? 24,
    cwd: launched.cwd,
    env: { ...(process.env as Record<string, string>), ...launched.env }
  })
  child.onData((text) => {
    if (sender.isDestroyed()) return
    sender.send("terminal.data", TerminalDataEvent.parse({ sessionId, text }))
  })
  child.onExit(() => {
    launched.cleanup?.()
    sessions.delete(sessionId)
    if (!sender.isDestroyed()) sender.send("terminal.exit", TerminalExitEvent.parse({ sessionId }))
  })
  sessions.set(sessionId, { pty: child, sender })
  return { sessionId }
}

export function writeWorkspaceTerminal(sessionId: string, data: string) {
  const live = sessions.get(sessionId)
  if (!live) throw new Error("Terminal session is not running.")
  live.pty.write(data)
}

export function resizeWorkspaceTerminal(sessionId: string, cols: number, rows: number) {
  const live = sessions.get(sessionId)
  if (!live) return
  live.pty.resize(cols, rows)
}

export function closeWorkspaceTerminal(sessionId: string) {
  const live = sessions.get(sessionId)
  if (!live) return
  live.pty.kill()
  sessions.delete(sessionId)
}

function shellCommand() {
  if (process.platform === "win32") {
    return { command: "powershell.exe", args: ["-NoLogo"] }
  }
  return { command: process.env.SHELL || "/bin/bash", args: ["-l"] }
}

function terminalLaunch(workspace: Awaited<ReturnType<typeof getWorkspace>>): {
  command: string
  args: string[]
  cwd: string
  env?: Record<string, string>
  cleanup?: () => void
} {
  if (workspace.kind !== "ssh") {
    const local = shellCommand()
    return { ...local, cwd: workspace.rootPath }
  }
  const pooled = getSshPoolEntry(workspace.id)
  if (pooled?.status !== "connected") throw disconnectedError("terminal")
  const remote = `cd ${quoteRemote(workspace.remotePath || ".")} && exec $SHELL -l`
  const spec = pooled.spec
  return launchRemoteProcess(spec, remote, spec.transport !== "wsl")
}
