/**
 * Realtime WebSocket 传输：main 持有连接，renderer 只传音频帧。
 * 无可用 URL 时由调用方回落到本地回环。
 */
import type { RealtimeTransport } from "./realtime-session"

export type RealtimeSocketMessage =
  | { kind: "audio"; value: string }
  | { kind: "text"; value: string }
  | { kind: "status"; value: string }

export function realtimeUrlFor(provider: string, modelId: string): string | null {
  if (provider === "openai" || /realtime/i.test(modelId)) {
    return `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(modelId)}`
  }
  if (provider === "google") {
    return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`
  }
  return null
}

export function parseRealtimeSocketMessage(raw: string): RealtimeSocketMessage | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const type = String(parsed.type ?? "")
    if (type.includes("transcript") || (type.includes("text") && !type.includes("audio"))) {
      const text = typeof parsed.delta === "string" ? parsed.delta : String(parsed.text ?? "")
      return text ? { kind: "text", value: text } : null
    }
    if (type.includes("audio") && typeof parsed.delta === "string") {
      return { kind: "audio", value: parsed.delta }
    }
    if (type.includes("audio") && typeof parsed.audio === "string") {
      return { kind: "audio", value: parsed.audio }
    }
    if (type.includes("error") || type.includes("session")) {
      return { kind: "status", value: type }
    }
  } catch {
    if (raw) return { kind: "text", value: raw }
  }
  return null
}

export function bindRealtimeSocket(socket: {
  send: (data: string) => void
  close: () => void
}): RealtimeTransport {
  return {
    send: (payload) => {
      socket.send(JSON.stringify({ type: "input_audio_buffer.append", audio: payload }))
    },
    close: () => socket.close()
  }
}

export type SocketFactory = (url: string, headers: Record<string, string>) => Promise<{
  send: (data: string) => void
  close: () => void
  onMessage: (handler: (data: string) => void) => void
  onClose: (handler: () => void) => void
}>

export async function connectRealtimeWebSocket(options: {
  url: string
  headers?: Record<string, string>
  openSocket?: SocketFactory
  onMessage: (parsed: RealtimeSocketMessage) => void
  onClose: () => void
}): Promise<RealtimeTransport> {
  const open = options.openSocket ?? openNodeWebSocket
  const socket = await open(options.url, options.headers ?? {})
  socket.onMessage((raw) => {
    const parsed = parseRealtimeSocketMessage(raw)
    if (parsed) options.onMessage(parsed)
  })
  socket.onClose(options.onClose)
  return bindRealtimeSocket(socket)
}

async function openNodeWebSocket(url: string, headers: Record<string, string>) {
  const socket = new WebSocket(url, { headers } as never)
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true })
    socket.addEventListener("error", () => reject(new Error("Realtime WebSocket failed to open.")), {
      once: true
    })
  })
  return {
    send: (data: string) => socket.send(data),
    close: () => socket.close(),
    onMessage: (handler: (data: string) => void) => {
      socket.addEventListener("message", (event) => handler(String(event.data)))
    },
    onClose: (handler: () => void) => {
      socket.addEventListener("close", () => handler())
    }
  }
}
