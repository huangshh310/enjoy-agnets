/**
 * Browser Bridge 本地环回 WebSocket 服务：
 * 监听 127.0.0.1:47823，负责接收 Chrome 扩展的配对连接、心跳维护与指令代理。
 */
import { createServer, type Server as HttpServer } from "node:http"
import { WebSocketServer, type WebSocket } from "ws"
import {
  getBuiltinToolsState,
  updateBridgeClientConnection
} from "./builtin-tools-state"

let httpServer: HttpServer | null = null
let wss: WebSocketServer | null = null
let activeClient: WebSocket | null = null

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
}
const pendingRequests = new Map<string, PendingRequest>()

export function isBridgeServerRunning(): boolean {
  return Boolean(httpServer?.listening)
}

export function startBridgeServer(port = 47823): Promise<void> {
  if (httpServer?.listening) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    try {
      const server = createServer((req, res) => {
        // 健康检查与状态接口
        if (req.url?.startsWith("/health")) {
          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ status: "ok", bridge: "enjoy-agents" }))
          return
        }
        res.writeHead(404)
        res.end()
      })

      const wsServer = new WebSocketServer({ server })

      wsServer.on("connection", (ws: WebSocket, req) => {
        const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`)
        const queryToken = url.searchParams.get("token")
        const authHeader = req.headers.authorization?.replace(/^Bearer\s+/i, "")
        const incomingToken = queryToken ?? authHeader

        const state = getBuiltinToolsState()
        const currentToken = state.browserBridge.pairingCode.split(":").pop()

        if (!incomingToken || incomingToken !== currentToken) {
          ws.send(JSON.stringify({ type: "error", code: "UNAUTHORIZED", message: "Invalid pairing token" }))
          ws.close(4401, "Unauthorized")
          return
        }

        // 配对成功
        activeClient = ws
        const clientBrowser = (req.headers["user-agent"]?.includes("Chrome") ? "Chrome 0.1.0" : "Chrome Extension 0.1.0")
        updateBridgeClientConnection(clientBrowser)

        ws.send(JSON.stringify({
          type: "handshake_ok",
          message: "Enjoy Agents Browser Bridge connected"
        }))

        ws.on("close", () => {
          if (activeClient === ws) {
            activeClient = null
            updateBridgeClientConnection(null)
          }
        })

        ws.on("error", () => {
          if (activeClient === ws) {
            activeClient = null
            updateBridgeClientConnection(null)
          }
        })

        ws.on("message", (data) => {
          try {
            const parsed = JSON.parse(data.toString()) as {
              id?: string
              type?: string
              browser?: string
              version?: string
              success?: boolean
              result?: unknown
              error?: string
            }
            if (parsed.type === "client_info") {
              const name = parsed.browser ?? "Chrome"
              const ver = parsed.version ? ` ${parsed.version}` : " 0.1.0"
              updateBridgeClientConnection(`${name}${ver}`)
              return
            }
            if (parsed.type === "ping") {
              ws.send(JSON.stringify({ type: "pong" }))
              return
            }
            if (parsed.id && pendingRequests.has(parsed.id)) {
              const pending = pendingRequests.get(parsed.id)!
              pendingRequests.delete(parsed.id)
              if (parsed.success) {
                pending.resolve(parsed.result)
              } else {
                pending.reject(new Error(parsed.error ?? "Unknown bridge error"))
              }
            }
          } catch {
            // ignore non-json messages
          }
        })
      })

      server.listen(port, "127.0.0.1", () => {
        httpServer = server
        wss = wsServer
        resolve()
      })

      server.on("error", (err) => {
        httpServer = null
        wss = null
        reject(err)
      })
    } catch (err) {
      reject(err)
    }
  })
}

export function stopBridgeServer(): Promise<void> {
  return new Promise((resolve) => {
    for (const [, req] of pendingRequests) {
      req.reject(new Error("Browser Bridge server stopped"))
    }
    pendingRequests.clear()

    if (activeClient) {
      try {
        activeClient.close(1000, "Server shutting down")
      } catch {
        // ignore
      }
      activeClient = null
      updateBridgeClientConnection(null)
    }

    if (wss) {
      try {
        wss.close()
      } catch {
        // ignore
      }
      wss = null
    }

    if (httpServer) {
      httpServer.close(() => {
        httpServer = null
        resolve()
      })
    } else {
      resolve()
    }
  })
}

/**
 * 向已连接的 Chrome 扩展发送异步指令并等待结果
 */
export function sendBridgeCommand<T = unknown>(
  action: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!activeClient || activeClient.readyState !== 1 /* WebSocket.OPEN */) {
      return reject(new Error("No active browser connected to bridge"))
    }
    const id = "req_" + Math.random().toString(36).slice(2, 9)
    const timeout = setTimeout(() => {
      pendingRequests.delete(id)
      reject(new Error(`Bridge command '${action}' timed out`))
    }, 15000)

    pendingRequests.set(id, {
      resolve: (data) => {
        clearTimeout(timeout)
        resolve(data as T)
      },
      reject: (err) => {
        clearTimeout(timeout)
        reject(err)
      }
    })

    activeClient.send(JSON.stringify({ id, action, params }))
  })
}

/**
 * 同步 Browser Bridge 服务状态（根据持久化开关开启或停止）
 */
export async function syncBridgeServerWithState(): Promise<void> {
  const state = getBuiltinToolsState()
  if (state.browserBridge.enabled) {
    try {
      await startBridgeServer(state.browserBridge.port)
    } catch (err) {
      console.warn("Failed to start Browser Bridge server on port", state.browserBridge.port, err)
    }
  } else {
    await stopBridgeServer()
  }
}
