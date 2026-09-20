/**
 * ACP JSON-RPC 薄客户端：NDJSON，兼容 Content-Length。
 */
import type { ChildProcess } from "node:child_process"
import { completeAcpHandshake, toAcpRpcError } from "./auth.ts"
import { acpChildStillAlive } from "./acp-child-alive.ts"
import { forgetAcpChild } from "./acp-child-store.ts"
import type { AcpPermissionRequest } from "./permissions.ts"
import { acpExitMessage, asRecord } from "./acp-rpc-util.ts"
import { answerAcpPermission } from "./acp-permission-answer.ts"
import {
  filterAcpMcpServers,
  type AcpMcpServer
} from "./acp-mcp.ts"
import { parseSessionConfigOptions } from "./parse-session-config.ts"
import { AcpNdjsonReader } from "./acp-ndjson.ts"
import { fetchAcpSessionPages, type AcpListedSession } from "./acp-listed-session.ts"
import {
  EMPTY_SESSION_CAPS,
  parseAcpSessionCaps,
  type AcpSessionCaps
} from "./acp-session-caps.ts"
import type { SessionConfigOption } from "@enjoy-agents/ipc-contract"

const CLIENT_INFO = {
  name: "enjoy-agents",
  title: "Enjoy Agents",
  version: "0.1.8"
}
const SUPPORTED_PROTOCOL = 2

export type { AcpListedSession } from "./acp-listed-session.ts"
export type { AcpPermissionRequest } from "./permissions.ts"

type Pending = {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
}

export type AcpClientHooks = {
  onUpdate?: (update: unknown) => void
  onPermission?: (req: AcpPermissionRequest) => Promise<"allow" | "deny" | "allow_session">
}

export class AcpClient {
  private nextId = 1
  private pending = new Map<number, Pending>()
  private stderr = ""
  private reader: AcpNdjsonReader
  private hooks: AcpClientHooks
  private closed = false
  private killTimer: ReturnType<typeof setTimeout> | undefined
  private mcpCaps = { http: false, sse: false }
  private sessionCaps: AcpSessionCaps = EMPTY_SESSION_CAPS
  private mcpServers: AcpMcpServer[] = []
  private configOptions: SessionConfigOption[] = []

  constructor(
    private readonly child: ChildProcess,
    hooks: AcpClientHooks = {}
  ) {
    this.hooks = hooks
    this.reader = new AcpNdjsonReader((raw) => this.handleRaw(raw))
    child.stdout?.setEncoding("utf8")
    child.stdout?.on("data", (chunk: string) => this.reader.push(chunk))
    child.stderr?.setEncoding("utf8")
    child.stderr?.on("data", (chunk: string) => {
      this.stderr += chunk
      if (this.stderr.length > 4_000) this.stderr = this.stderr.slice(-4_000)
    })
    child.on("error", (error) => this.failAll(error))
    child.on("exit", (code) => {
      if (this.killTimer) clearTimeout(this.killTimer)
      forgetAcpChild(child.pid)
      if (!this.closed) this.failAll(new Error(acpExitMessage(code, this.stderr)))
    })
  }

  async initialize(): Promise<unknown> {
    let result: unknown
    try {
      result = await this.initializeWith(SUPPORTED_PROTOCOL)
    } catch {
      result = await this.initializeWith(1)
    }
    const caps = parseAcpSessionCaps(result)
    if (caps.protocolVersion > SUPPORTED_PROTOCOL) {
      throw new Error("This assistant uses a newer ACP version than Enjoy supports.")
    }
    this.sessionCaps = caps
    this.mcpCaps = caps.mcp
    await this.notify("initialized", {})
    return result
  }

  getSessionCaps(): AcpSessionCaps {
    return this.sessionCaps
  }

  async authenticate(methodId: string): Promise<void> {
    await this.request("authenticate", { methodId })
  }

  /** initialize → resume 或 new；遇到 auth_required 再走 agent 型 authenticate。 */
  async handshake(
    cwd: string,
    mcpServers: AcpMcpServer[] = [],
    resumeId?: string
  ): Promise<string> {
    this.mcpServers = mcpServers
    return completeAcpHandshake({
      initialize: () => this.initialize(),
      authenticate: (methodId) => this.authenticate(methodId),
      newSession: () => this.openSession(cwd, resumeId)
    })
  }

  stillAlive(): boolean {
    return !this.closed && acpChildStillAlive(this.child)
  }

  async newSession(cwd: string): Promise<string> {
    return this.requestSession("session/new", { cwd, mcpServers: this.filteredMcp() })
  }

  async resumeSession(sessionId: string, cwd: string): Promise<string> {
    const result = await this.request("session/resume", {
      sessionId,
      cwd,
      mcpServers: this.filteredMcp()
    })
    const rec = asRecord(result)
    const parsed = parseSessionConfigOptions(result)
    if (parsed.length > 0) this.configOptions = parsed
    return String(rec.sessionId ?? sessionId)
  }

  async closeSession(sessionId: string): Promise<void> {
    if (!this.sessionCaps.close) return
    await this.request("session/close", { sessionId }).catch(() => undefined)
  }

  async deleteRemoteSession(sessionId: string): Promise<void> {
    if (!this.sessionCaps.delete) return
    await this.request("session/delete", { sessionId }).catch(() => undefined)
  }

  async listRemoteSessions(cwd: string): Promise<AcpListedSession[]> {
    if (!this.sessionCaps.list) return []
    return fetchAcpSessionPages((method, params) => this.request(method, params), cwd)
  }

  getConfigOptions(): SessionConfigOption[] {
    return this.configOptions
  }

  async setConfigOption(
    sessionId: string,
    configId: string,
    value: string
  ): Promise<SessionConfigOption[]> {
    const result = await this.request("session/set_config_option", {
      sessionId,
      configId,
      value
    })
    const parsed = parseSessionConfigOptions(result)
    if (parsed.length > 0) this.configOptions = parsed
    return this.configOptions
  }

  async prompt(sessionId: string, text: string): Promise<unknown> {
    return this.request("session/prompt", {
      sessionId,
      prompt: [{ type: "text", text }]
    })
  }

  async cancel(sessionId: string): Promise<void> {
    await this.notify("session/cancel", { sessionId }).catch(() => undefined)
  }

  /** term：先 SIGTERM，2s 后 SIGKILL。kill：退出时立刻 SIGKILL。 */
  dispose(mode: "term" | "kill" = "term") {
    this.closed = true
    this.failAll(new Error("ACP client disposed."))
    forgetAcpChild(this.child.pid)
    if (!acpChildStillAlive(this.child)) return
    if (mode === "kill") {
      this.child.kill("SIGKILL")
      return
    }
    this.child.kill("SIGTERM")
    this.killTimer = setTimeout(() => {
      if (acpChildStillAlive(this.child)) this.child.kill("SIGKILL")
    }, 2000)
  }

  private async initializeWith(protocolVersion: number): Promise<unknown> {
    return this.request("initialize", {
      protocolVersion,
      clientInfo: { name: CLIENT_INFO.name, version: CLIENT_INFO.version },
      info: CLIENT_INFO,
      clientCapabilities: {
        fs: { readTextFile: false, writeTextFile: false },
        session: { configOptions: { boolean: {} } }
      },
      capabilities: {
        fs: { readTextFile: false, writeTextFile: false },
        session: { configOptions: { boolean: {} } }
      }
    })
  }

  private async openSession(cwd: string, resumeId?: string): Promise<string> {
    const id = resumeId?.trim()
    if (id && this.sessionCaps.resume) {
      try {
        return await this.resumeSession(id, cwd)
      } catch {
        /* 未知 / 已删：开新会话 */
      }
    }
    return this.newSession(cwd)
  }

  private filteredMcp(): AcpMcpServer[] {
    return filterAcpMcpServers(this.mcpServers, this.mcpCaps)
  }

  private async requestSession(method: string, params: unknown): Promise<string> {
    const result = asRecord(await this.request(method, params))
    const id = String(result.sessionId ?? "")
    if (!id) throw new Error(`${method} did not return sessionId.`)
    this.configOptions = parseSessionConfigOptions(result)
    return id
  }

  private request(method: string, params: unknown): Promise<unknown> {
    const id = this.nextId++
    this.write({ jsonrpc: "2.0", id, method, params })
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
    })
  }

  private notify(method: string, params: unknown): Promise<void> {
    this.write({ jsonrpc: "2.0", method, params })
    return Promise.resolve()
  }

  private write(message: Record<string, unknown>) {
    if (!this.child.stdin || this.child.stdin.destroyed) {
      throw new Error("ACP stdin is closed.")
    }
    this.child.stdin.write(`${JSON.stringify(message)}\n`)
  }

  private handleRaw(raw: string) {
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return
    }
    const rec = asRecord(parsed)
    if (typeof rec.id === "number" && rec.method) {
      void this.answerServerRequest(rec.id, String(rec.method), rec.params)
      return
    }
    if (typeof rec.id === "number" && this.pending.has(rec.id)) {
      const pending = this.pending.get(rec.id)
      this.pending.delete(rec.id)
      if (rec.error) pending?.reject(toAcpRpcError(rec.error))
      else pending?.resolve(rec.result)
      return
    }
    if (rec.method === "session/update") {
      const params = asRecord(rec.params)
      this.hooks.onUpdate?.(params.update ?? params)
    }
  }

  private async answerServerRequest(id: number, method: string, params: unknown) {
    await answerAcpPermission((message) => this.write(message), this.hooks.onPermission, id, method, params)
  }

  private failAll(error: Error) {
    for (const pending of this.pending.values()) pending.reject(error)
    this.pending.clear()
  }
}


