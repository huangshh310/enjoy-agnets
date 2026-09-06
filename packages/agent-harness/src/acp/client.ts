/**
 * ACP JSON-RPC 薄客户端：NDJSON，兼容 Content-Length。
 */
import type { ChildProcess } from "node:child_process"
import { pickAcpPermissionOption, type AcpPermissionOption } from "./permissions.ts"

export type AcpPermissionRequest = {
  sessionId: string
  toolCallId: string
  name: string
  args: unknown
  options: AcpPermissionOption[]
}

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
  private buffer = ""
  private contentLength: number | null = null
  private hooks: AcpClientHooks
  private closed = false
  private killTimer: ReturnType<typeof setTimeout> | undefined

  constructor(
    private readonly child: ChildProcess,
    hooks: AcpClientHooks = {}
  ) {
    this.hooks = hooks
    child.stdout?.setEncoding("utf8")
    child.stdout?.on("data", (chunk: string) => this.push(chunk))
    child.stderr?.setEncoding("utf8")
    child.on("error", (error) => this.failAll(error))
    child.on("exit", (code) => {
      if (this.killTimer) clearTimeout(this.killTimer)
      if (!this.closed) this.failAll(new Error(`ACP process exited with ${code ?? "null"}`))
    })
  }

  async initialize(): Promise<void> {
    await this.request("initialize", {
      protocolVersion: 1,
      clientInfo: { name: "enjoy-agents", version: "0.1.0" },
      clientCapabilities: { fs: { readTextFile: false, writeTextFile: false } }
    })
    await this.notify("initialized", {})
  }

  async newSession(cwd: string): Promise<string> {
    const result = asRecord(
      await this.request("session/new", { cwd, mcpServers: [] })
    )
    const id = String(result.sessionId ?? "")
    if (!id) throw new Error("ACP session/new did not return sessionId.")
    return id
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
    if (this.child.killed) return
    if (mode === "kill") {
      this.child.kill("SIGKILL")
      return
    }
    this.child.kill("SIGTERM")
    this.killTimer = setTimeout(() => {
      if (!this.child.killed) this.child.kill("SIGKILL")
    }, 2000)
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

  private push(chunk: string) {
    this.buffer += chunk
    this.drain()
  }

  private drain() {
    while (this.buffer.length > 0) {
      if (this.contentLength == null && this.buffer.startsWith("Content-Length:")) {
        const match = this.buffer.match(/^Content-Length:\s*(\d+)\r?\n\r?\n/)
        if (!match) return
        this.contentLength = Number(match[1])
        this.buffer = this.buffer.slice(match[0].length)
        continue
      }
      if (this.contentLength != null) {
        if (this.buffer.length < this.contentLength) return
        const raw = this.buffer.slice(0, this.contentLength)
        this.buffer = this.buffer.slice(this.contentLength)
        this.contentLength = null
        this.handleRaw(raw)
        continue
      }
      const nl = this.buffer.indexOf("\n")
      if (nl < 0) return
      const line = this.buffer.slice(0, nl).trim()
      this.buffer = this.buffer.slice(nl + 1)
      if (line) this.handleRaw(line)
    }
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
      if (rec.error) pending?.reject(new Error(jsonError(rec.error)))
      else pending?.resolve(rec.result)
      return
    }
    if (rec.method === "session/update") {
      const params = asRecord(rec.params)
      this.hooks.onUpdate?.(params.update ?? params)
    }
  }

  private async answerServerRequest(id: number, method: string, params: unknown) {
    if (method !== "session/request_permission") {
      this.write({ jsonrpc: "2.0", id, error: { code: -32601, message: `Unknown method ${method}` } })
      return
    }
    const rec = asRecord(params)
    const tool = asRecord(rec.toolCall)
    const options = Array.isArray(rec.options) ? rec.options.map(asOption) : []
    const decision = (await this.hooks.onPermission?.({
      sessionId: String(rec.sessionId ?? ""),
      toolCallId: String(tool.toolCallId ?? tool.id ?? "tool"),
      name: String(tool.title ?? tool.kind ?? tool.name ?? "tool"),
      args: tool.rawInput ?? tool.input ?? rec.toolCall,
      options
    })) ?? "deny"
    const outcome = pickAcpPermissionOption(decision, options)
    this.write({ jsonrpc: "2.0", id, result: { outcome } })
  }

  private failAll(error: Error) {
    for (const pending of this.pending.values()) pending.reject(error)
    this.pending.clear()
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asOption(value: unknown): AcpPermissionOption {
  const rec = asRecord(value)
  return {
    optionId: String(rec.optionId ?? rec.id ?? ""),
    name: typeof rec.name === "string" ? rec.name : undefined,
    kind: typeof rec.kind === "string" ? rec.kind : undefined
  }
}

function jsonError(error: unknown): string {
  const rec = asRecord(error)
  return String(rec.message ?? JSON.stringify(error))
}
