/**
 * 尝试把 Realtime 接到 Provider WebSocket；失败则让调用方回落本地回环。
 */
import type { BrowserWindow } from "electron"
import {
  connectRealtimeWebSocket,
  realtimeUrlFor,
  type RealtimeSession
} from "@enjoy-agents/agent-core"
import { stampAndSend } from "./event-bus"
import { readSecret } from "./secrets"

export async function attachRealtimeTransport(options: {
  window: BrowserWindow
  runId: string
  sessionId: string
  providerId?: string
  modelId: string
  session: RealtimeSession
}): Promise<"ws" | "loop"> {
  const secret = await readSecret()
  const provider = options.providerId ?? secret?.provider ?? ""
  const url = realtimeUrlFor(provider, options.modelId)
  if (!url || !secret?.apiKey) return "loop"
  try {
    const transport = await connectRealtimeWebSocket({
      url,
      headers: {
        Authorization: `Bearer ${secret.apiKey}`,
        "OpenAI-Beta": "realtime=v1"
      },
      onMessage: (parsed) => emitRealtimeFrame(options, parsed.kind, parsed.value),
      onClose: () => {
        options.session.transportClosed()
      }
    })
    options.session.attach(transport)
    return "ws"
  } catch {
    return "loop"
  }
}

function emitRealtimeFrame(
  options: { window: BrowserWindow; runId: string; sessionId: string },
  kind: "audio" | "text" | "status",
  value: string
) {
  if (kind === "audio") {
    stampAndSend(
      options.window,
      { type: "realtime.audio", runId: options.runId, chunkBase64: value },
      options.sessionId
    )
    return
  }
  if (kind === "text") {
    stampAndSend(
      options.window,
      { type: "realtime.text", runId: options.runId, text: value },
      options.sessionId
    )
    return
  }
  stampAndSend(
    options.window,
    { type: "realtime.status", runId: options.runId, status: "open", message: value, experimental: true },
    options.sessionId
  )
}

