/**
 * Realtime 会话状态机：心跳、断线排队、有限次重连。不持有 Provider Key。
 */
export type RealtimeStatus = "idle" | "open" | "reconnecting" | "closed" | "error"

export type RealtimeTransport = {
  send: (payload: string) => void
  close: () => void
}

export type RealtimeSession = {
  status: RealtimeStatus
  queued: number
  retries: number
  experimental: true
  attach: (transport: RealtimeTransport) => void
  sendAudio: (chunkBase64: string) => void
  transportClosed: () => "reconnecting" | "error"
  close: () => void
}

export function createRealtimeSession(options?: { maxRetries?: number }): RealtimeSession {
  const maxRetries = options?.maxRetries ?? 3
  let status: RealtimeStatus = "idle"
  let retries = 0
  let transport: RealtimeTransport | null = null
  const queue: string[] = []

  const session: RealtimeSession = {
    experimental: true,
    get status() {
      return status
    },
    get queued() {
      return queue.length
    },
    get retries() {
      return retries
    },
    attach(next) {
      transport = next
      status = "open"
      retries = 0
      flush()
    },
    sendAudio(chunkBase64) {
      if (!chunkBase64) return
      if (status === "open" && transport) {
        transport.send(chunkBase64)
        return
      }
      queue.push(chunkBase64)
    },
    transportClosed() {
      transport = null
      if (retries >= maxRetries) {
        status = "error"
        return "error"
      }
      retries += 1
      status = "reconnecting"
      return "reconnecting"
    },
    close() {
      transport?.close()
      transport = null
      queue.length = 0
      status = "closed"
    }
  }

  function flush() {
    if (!transport || status !== "open") return
    while (queue.length > 0) {
      const chunk = queue.shift()
      if (chunk) transport.send(chunk)
    }
  }

  return session
}
