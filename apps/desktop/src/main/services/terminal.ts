/**
 * 工作区交互 shell：每个会话一个子进程，stdout/stderr 推回窗口。
 * 先用 spawn，不绑 node-pty，避免 Windows 原生编译。
 */
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import type { WebContents } from "electron"
import { createId } from "./ids"
import { getWorkspace } from "./workspace"

type LiveSession = {
  child: ChildProcessWithoutNullStreams
  sender: WebContents
}

const sessions = new Map<string, LiveSession>()

export async function openWorkspaceTerminal(workspaceId: string, sender: WebContents) {
  const workspace = await getWorkspace(workspaceId)
  const sessionId = createId("term")
  const { command, args } = shellCommand()
  const child = spawn(command, args, {
    cwd: workspace.rootPath,
    env: process.env,
    windowsHide: true
  })
  child.stdout.on("data", (chunk: Buffer) => pushData(sender, sessionId, chunk))
  child.stderr.on("data", (chunk: Buffer) => pushData(sender, sessionId, chunk))
  child.on("exit", () => {
    sessions.delete(sessionId)
    if (!sender.isDestroyed()) sender.send("terminal.exit", { sessionId })
  })
  sessions.set(sessionId, { child, sender })
  return { sessionId }
}

export function writeWorkspaceTerminal(sessionId: string, data: string) {
  const live = sessions.get(sessionId)
  if (!live) throw new Error("Terminal session is not running.")
  const payload = data.endsWith("\n") ? data : `${data}\n`
  live.child.stdin.write(process.platform === "win32" ? payload.replace(/\n/g, "\r\n") : payload)
}

export function closeWorkspaceTerminal(sessionId: string) {
  const live = sessions.get(sessionId)
  if (!live) return
  live.child.kill()
  sessions.delete(sessionId)
}

function pushData(sender: WebContents, sessionId: string, chunk: Buffer) {
  if (sender.isDestroyed()) return
  sender.send("terminal.data", { sessionId, text: chunk.toString() })
}

function shellCommand() {
  if (process.platform === "win32") {
    return { command: "powershell.exe", args: ["-NoLogo", "-NoExit"] }
  }
  return { command: process.env.SHELL || "/bin/bash", args: ["-l"] }
}
