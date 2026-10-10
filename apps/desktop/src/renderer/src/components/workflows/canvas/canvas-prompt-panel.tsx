/**
 * 节点下方生成输入条，对齐 infinite-canvas CanvasNodePromptPanel：提示词 + 模型选择 + 发送。
 */
import { useEffect, useState } from "react"
import { RiLoader4Line, RiSendPlane2Line, RiStopCircleLine } from "@remixicon/react"
import { isApplePlatform } from "@renderer/components/settings/keybindings/keybinding-format"
import { useT } from "@renderer/i18n"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { CanvasNodeType, type CanvasGenerationMode, type CanvasNodeData } from "../lib/canvas.types"
import { useCanvasTheme } from "../stores/use-canvas-theme"
import { filterModelsForMode } from "../lib/filter-models-for-mode"
import { CanvasModelPicker } from "./canvas-model-picker"

export function CanvasPromptPanel({
  node,
  isRunning,
  onPromptChange,
  onConfigChange,
  onGenerate,
  onStop
}: {
  node: CanvasNodeData
  isRunning: boolean
  onPromptChange: (nodeId: string, prompt: string) => void
  onConfigChange: (nodeId: string, patch: Partial<CanvasNodeData["metadata"]>) => void
  onGenerate: (nodeId: string, prompt: string) => void
  onStop: (nodeId: string) => void
}) {
  const t = useT()
  const theme = useCanvasTheme()
  const [prompt, setPrompt] = useState(node.metadata?.composerContent ?? node.metadata?.prompt ?? "")
  const mode = generationModeOf(node.type)

  useEffect(() => {
    setPrompt(node.metadata?.composerContent ?? node.metadata?.prompt ?? "")
  }, [node.id])

  useEffect(() => {
    if (node.metadata?.model) return
    const models = filterModelsForMode(useChatStore.getState().models, mode)
    const fallback = models[0]
    if (fallback) {
      onConfigChange(node.id, { model: fallback.id, providerId: fallback.providerId })
      return
    }
    const chatModelId = useChatStore.getState().modelId
    if (chatModelId) onConfigChange(node.id, { model: chatModelId })
  }, [mode, node.id, node.metadata?.model, onConfigChange])

  function submit() {
    const text = prompt.trim()
    if (!text || isRunning) return
    onGenerate(node.id, text)
  }

  return (
    <div
      data-canvas-no-zoom
      className="rounded-2xl border p-3 shadow-2xl backdrop-blur"
      style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <textarea
        rows={3}
        value={prompt}
        placeholder={t("pages.workflows.canvasPromptPlaceholder", {
          mod: isApplePlatform() ? "⌘" : "Ctrl"
        })}
        className="thin-scrollbar h-24 w-full resize-none bg-transparent text-sm leading-5 outline-none"
        onChange={(event) => {
          setPrompt(event.target.value)
          onPromptChange(node.id, event.target.value)
        }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault()
            submit()
          }
        }}
      />
      <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
        <CanvasModelPicker
          mode={mode}
          modelId={node.metadata?.model}
          onModelChange={(model: ModelOption) =>
            onConfigChange(node.id, { model: model.id, providerId: model.providerId })
          }
        />
        {isRunning ? (
          <button type="button" className="flex size-9 shrink-0 items-center justify-center rounded-full" onClick={() => onStop(node.id)}>
            <RiStopCircleLine className="size-5" />
          </button>
        ) : (
          <button
            type="button"
            className="flex size-9 shrink-0 items-center justify-center rounded-full disabled:opacity-30"
            style={{ background: theme.node.activeStroke, color: theme.node.panel }}
            disabled={!prompt.trim()}
            onClick={submit}
          >
            {isRunning ? <RiLoader4Line className="size-4 animate-spin" /> : <RiSendPlane2Line className="size-4" />}
          </button>
        )}
      </div>
    </div>
  )
}

function generationModeOf(type: CanvasNodeData["type"]): CanvasGenerationMode {
  if (type === CanvasNodeType.Text) return "text"
  if (type === CanvasNodeType.Video) return "video"
  if (type === CanvasNodeType.Audio) return "audio"
  return "image"
}
