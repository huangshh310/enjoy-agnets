/**
 * Composer 语音：renderer 只采帧并 sendAudio，会话与 Key 留在 main。
 */
import { StreamEvent } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"

let activeRunId: string | null = null
let capture: { stream: MediaStream; context: AudioContext; node: ScriptProcessorNode } | null = null
let unsub: (() => void) | null = null

export function modelHasCapability(capability: string): boolean {
  const store = useChatStore.getState()
  const model = store.models.find((item) => item.id === store.modelId)
  return Boolean(model?.capabilities?.includes(capability))
}

export function isRealtimeOpen(): boolean {
  return activeRunId != null
}

export async function toggleRealtimeMic() {
  if (!hasIde()) return
  if (activeRunId) {
    await stopRealtime()
    return
  }
  const store = useChatStore.getState()
  if (!store.sessionId) return
  const opened = (await getIde().realtime.open({
    sessionId: store.sessionId,
    modelId: store.modelId,
    providerId: store.provider ?? undefined
  })) as { runId: string }
  activeRunId = opened.runId
  unsub = getIde().agent.onEvent((raw) => {
    const parsed = StreamEvent.safeParse(raw)
    if (!parsed.success || parsed.data.runId !== opened.runId) return
    if (parsed.data.type === "realtime.text") {
      useChatStore.getState().setComposer(`${useChatStore.getState().composer}${parsed.data.text}`)
    }
    if (parsed.data.type === "realtime.status" && (parsed.data.status === "closed" || parsed.data.status === "error")) {
      void stopCaptureOnly()
    }
  })
  await startCapture(opened.runId)
}

async function startCapture(runId: string) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const context = new AudioContext({ sampleRate: 16_000 })
  const source = context.createMediaStreamSource(stream)
  const node = context.createScriptProcessor(4096, 1, 1)
  const mute = context.createGain()
  mute.gain.value = 0
  node.onaudioprocess = (event) => {
    const samples = event.inputBuffer.getChannelData(0)
    void getIde().realtime.sendAudio({ runId, chunkBase64: floatToPcm16Base64(samples) })
  }
  source.connect(node)
  node.connect(mute)
  mute.connect(context.destination)
  capture = { stream, context, node }
}

async function stopRealtime() {
  const runId = activeRunId
  await stopCaptureOnly()
  if (runId && hasIde()) await getIde().realtime.close(runId)
  activeRunId = null
}

async function stopCaptureOnly() {
  unsub?.()
  unsub = null
  if (!capture) return
  capture.node.disconnect()
  capture.stream.getTracks().forEach((track) => track.stop())
  await capture.context.close()
  capture = null
}

function floatToPcm16Base64(samples: Float32Array): string {
  const bytes = new Uint8Array(samples.length * 2)
  const view = new DataView(bytes.buffer)
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0))
    view.setInt16(index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}
