/**
 * Realtime：main 代理会话。renderer 只传音频帧。实验能力。
 */
import type { BrowserWindow } from "electron"
import { createRealtimeSession, type RealtimeSession } from "@enjoy-agents/agent-core"
import { RealtimeCloseInput, RealtimeOpenInput, RealtimeSendAudioInput } from "@enjoy-agents/ipc-contract"
import { assertMediaKindAllowed } from "./media-policy"
import { attachRealtimeTransport } from "./attach-realtime-ws"
import { stampAndSend } from "./event-bus"
import { createId } from "./ids"

const sessions = new Map<string, { sessionId: string; session: RealtimeSession }>()

export async function openRealtime(window: BrowserWindow, raw: unknown) {
  assertMediaKindAllowed("realtime-session")
  const input = RealtimeOpenInput.parse(raw)
  const runId = createId("rt")
  const session = createRealtimeSession({ maxRetries: 3 })
  const mode = await attachRealtimeTransport({
    window,
    runId,
    sessionId: input.sessionId,
    providerId: input.providerId,
    modelId: input.modelId,
    session
  })
  if (mode === "loop") {
    session.close()
    stampAndSend(
      window,
      {
        type: "realtime.status",
        runId,
        status: "error",
        message: "No remote Realtime session. Local echo is not a live model.",
        experimental: true
      },
      input.sessionId
    )
    return { runId, experimental: true, transport: "loop" as const }
  }
  sessions.set(runId, { sessionId: input.sessionId, session })
  stampAndSend(
    window,
    {
      type: "realtime.status",
      runId,
      status: "open",
      message: "Realtime WebSocket opened in main. Experimental.",
      experimental: true
    },
    input.sessionId
  )
  return { runId, experimental: true, transport: "ws" as const }
}

export function sendRealtimeAudio(window: BrowserWindow, raw: unknown) {
  const input = RealtimeSendAudioInput.parse(raw)
  const held = sessions.get(input.runId)
  if (!held) throw new Error("Realtime session is not open.")
  held.session.sendAudio(input.chunkBase64)
  if (held.session.status === "reconnecting") {
    stampAndSend(
      window,
      { type: "realtime.status", runId: input.runId, status: "reconnecting", experimental: true },
      held.sessionId
    )
  }
  return { ok: true, queued: held.session.queued }
}

export function closeRealtime(window: BrowserWindow, raw: unknown) {
  const input = RealtimeCloseInput.parse(raw)
  const held = sessions.get(input.runId)
  sessions.delete(input.runId)
  held?.session.close()
  if (held) {
    stampAndSend(
      window,
      { type: "realtime.status", runId: input.runId, status: "closed", experimental: true },
      held.sessionId
    )
  }
  return { ok: true }
}

/** 供测试注入断线。 */
export function markRealtimeTransportClosed(runId: string) {
  return sessions.get(runId)?.session.transportClosed()
}
