/**
 * 工作区交互 shell：node-pty，原始按键进 PTY，不做按行回车。
 */
import * as pty from "node-pty"
import type { IPty } from "node-pty"
import type { WebContents } from "electron"
import { createId } from "./ids"
import { getWorkspace } from "./workspace"

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
  const { command, args } = shellCommand()
  const child = pty.spawn(command, args, {
    name: "xterm-256color",
    cols: size?.cols ?? 80,
    rows: size?.rows ?? 24,
    cwd: workspace.rootPath,
    env: process.env as Record<string, string>
  })
  child.onData((text) => {
    if (sender.isDestroyed()) return
    sender.send("terminal.data", { sessionId, text })
  })
  child.onExit(() => {
    sessions.delete(sessionId)
    if (!sender.isDestroyed()) sender.send("terminal.exit", { sessionId })
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
