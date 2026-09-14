/**
 * 节点生成：走 ai.generate，订阅 asset.created。对齐 infinite-canvas handleGenerateNode 的结果回写。
 */
import { useRef } from "react"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { applyCanvasGenerationEvent, type CanvasGenKind } from "../lib/apply-canvas-generation-event"
import { CanvasNodeType, type CanvasNodeData } from "../lib/canvas.types"

type StreamLike = { type?: string; runId?: string; assetId?: string; mediaType?: string; message?: string }

export function useCanvasGeneration(setNodes: React.Dispatch<React.SetStateAction<CanvasNodeData[]>>) {
  const abortRef = useRef<Map<string, () => void>>(new Map())
  const statusRef = useRef<Map<string, string>>(new Map())

  function stop(nodeId: string) {
    abortRef.current.get(nodeId)?.()
    abortRef.current.delete(nodeId)
    statusRef.current.set(nodeId, "idle")
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId && node.metadata?.status === "loading"
          ? { ...node, metadata: { ...node.metadata, status: "idle" } }
          : node
      )
    )
  }

  async function generate(node: CanvasNodeData, prompt: string) {
    if (!hasIde()) return
    const target = resolveGenerateTarget(node)
    if ("error" in target) {
      writeNodeError(setNodes, statusRef, node.id, target.error)
      return
    }
    statusRef.current.set(node.id, "loading")
    setNodes((prev) =>
      prev.map((item) =>
        item.id === node.id ? { ...item, metadata: { ...item.metadata, status: "loading", prompt, errorDetails: undefined } } : item
      )
    )
    try {
      const result = (await getIde().ai.generate({
        kind: target.kind,
        sessionId: target.sessionId,
        modelId: target.modelId,
        providerId: target.providerId,
        prompt,
        experimental: target.kind === "video"
      })) as { runId: string }
      const stopListen = subscribeRun(result.runId, node.id, target.kind, setNodes, statusRef, abortRef)
      abortRef.current.set(node.id, stopListen)
    } catch (error) {
      writeNodeError(setNodes, statusRef, node.id, error instanceof Error ? error.message : "Generation failed.")
    }
  }

  return { generate, stop }
}

function resolveGenerateTarget(node: CanvasNodeData):
  | { kind: CanvasGenKind; sessionId: string; modelId: string; providerId?: string }
  | { error: string } {
  const store = useChatStore.getState()
  const modelId = node.metadata?.model || store.modelId
  if (!store.sessionId || !modelId) return { error: "Add a provider key in Settings." }
  const providerId =
    node.metadata?.providerId || store.models.find((model) => model.id === modelId)?.providerId
  return { kind: kindOf(node), sessionId: store.sessionId, modelId, providerId }
}

function kindOf(node: CanvasNodeData): CanvasGenKind {
  if (node.type === CanvasNodeType.Video) return "video"
  if (node.type === CanvasNodeType.Audio) return "speech"
  if (node.type === CanvasNodeType.Text) return "text"
  return "image"
}

function subscribeRun(
  runId: string,
  nodeId: string,
  kind: CanvasGenKind,
  setNodes: React.Dispatch<React.SetStateAction<CanvasNodeData[]>>,
  statusRef: React.MutableRefObject<Map<string, string>>,
  abortRef: React.MutableRefObject<Map<string, () => void>>
) {
  let stopListen = () => {}
  stopListen = getIde().agent.onEvent((raw) => {
    const event = raw as StreamLike
    if (event.runId !== runId) return
    const applied = applyCanvasGenerationEvent(statusRef.current.get(nodeId), kind, event)
    if (!applied) return
    statusRef.current.set(nodeId, applied.status)
    setNodes((prev) =>
      prev.map((item) => {
        if (item.id !== nodeId) return item
        return {
          ...item,
          metadata: {
            ...item.metadata,
            status: applied.status,
            errorDetails: applied.errorDetails,
            storageKey: applied.assetId ?? item.metadata?.storageKey,
            mimeType: applied.mediaType ?? item.metadata?.mimeType
          }
        }
      })
    )
    if (applied.assetId) void hydrateAsset(nodeId, applied.assetId, applied.mediaType, setNodes)
    if (applied.status !== "loading") {
      abortRef.current.delete(nodeId)
      stopListen()
    }
  })
  return stopListen
}

function writeNodeError(
  setNodes: React.Dispatch<React.SetStateAction<CanvasNodeData[]>>,
  statusRef: React.MutableRefObject<Map<string, string>>,
  nodeId: string,
  message: string
) {
  statusRef.current.set(nodeId, "error")
  setNodes((prev) =>
    prev.map((item) =>
      item.id === nodeId ? { ...item, metadata: { ...item.metadata, status: "error", errorDetails: message } } : item
    )
  )
}

async function hydrateAsset(
  nodeId: string,
  assetId: string,
  mediaType: string | undefined,
  setNodes: React.Dispatch<React.SetStateAction<CanvasNodeData[]>>
) {
  if (!hasIde()) return
  if (mediaType?.startsWith("video/") || mediaType?.startsWith("audio/")) {
    const { assetPlaybackUrl } = await import("@enjoy-agents/assets/playback-url")
    setNodes((prev) =>
      prev.map((item) =>
        item.id === nodeId ? { ...item, metadata: { ...item.metadata, content: assetPlaybackUrl(assetId), status: "success" } } : item
      )
    )
    return
  }
  const row = (await getIde().assets.read(assetId)) as { bytesBase64?: string; mediaType?: string }
  if (!row.bytesBase64) return
  const content = `data:${row.mediaType ?? mediaType ?? "image/png"};base64,${row.bytesBase64}`
  setNodes((prev) =>
    prev.map((item) => (item.id === nodeId ? { ...item, metadata: { ...item.metadata, content, status: "success" } } : item))
  )
}
