/**
 * stdio JSON-RPC 会话：握手后可继续 tools/list 与 tools/call。
 */
import type { ChildProcess } from "node:child_process"
import { decodeMessages, encodeMessage } from "./stdio-rpc.ts"

export type McpSession = {
  request(method: string, params?: unknown): Promise<unknown>
  notify(method: string, params?: unknown): void
  close(): void
}

export function createStdioSession(child: ChildProcess, timeoutMs = 25_000): McpSession {
  let nextId = 1
  let buffer = Buffer.alloc(0)
  let stderrBuffer = ""
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()

  const onData = (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk])
    const decoded = decodeMessages(buffer)
    buffer = Buffer.from(decoded.rest)
    for (const message of decoded.messages) {
      if (message.id == null) continue
      const wait = pending.get(message.id)
      if (!wait) continue
      pending.delete(message.id)
      if (message.error) wait.reject(new Error(message.error.message))
      else wait.resolve(message.result)
    }
  }

  const onStderr = (chunk: Buffer) => {
    stderrBuffer = (stderrBuffer + chunk.toString("utf8")).slice(-4000)
  }

  const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
    const detail = stderrBuffer.trim() || (code !== null ? `exit code ${code}` : `signal ${signal}`)
    const err = new Error(`MCP process terminated: ${detail}`)
    for (const wait of pending.values()) wait.reject(err)
    pending.clear()
  }

  child.stdout?.on("data", onData)
  child.stderr?.on("data", onStderr)
  child.on("error", (error) => {
    for (const wait of pending.values()) wait.reject(error)
    pending.clear()
  })
  child.on("exit", onExit)
  child.on("close", onExit)

  return {
    request(method, params) {
      const id = nextId
      nextId += 1
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id)
          const detail = stderrBuffer.trim() ? ` (${stderrBuffer.trim().slice(-200)})` : ""
          reject(new Error(`MCP ${method} timeout.${detail}`))
        }, timeoutMs)
        pending.set(id, {
          resolve: (value) => {
            clearTimeout(timer)
            resolve(value)
          },
          reject: (error) => {
            clearTimeout(timer)
            reject(error)
          }
        })
        child.stdin?.write(encodeMessage({ jsonrpc: "2.0", id, method, params }))
      })
    },
    notify(method, params) {
      child.stdin?.write(encodeMessage({ jsonrpc: "2.0", method, params }))
    },
    close() {
      child.stdout?.off("data", onData)
      child.stderr?.off("data", onStderr)
      child.off("exit", onExit)
      child.off("close", onExit)
      child.kill()
    }
  }
}
