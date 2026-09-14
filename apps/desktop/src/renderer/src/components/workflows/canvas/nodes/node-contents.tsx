/**
 * 节点内容：对齐 infinite-canvas Text / Image / Video / Audio / Config / Group / Loading / Error。
 */
import { RiImageLine, RiLoader4Line, RiMusic2Line, RiPlayCircleLine, RiRefreshLine, RiStackLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { CanvasNodeType, type CanvasNodeData } from "../../lib/canvas.types"
import type { CanvasTheme } from "../../lib/canvas-theme"

export function NodeContents({
  node,
  theme,
  isEditingContent,
  textareaRef,
  onContentChange,
  onStopEditing,
  onRetry
}: {
  node: CanvasNodeData
  theme: CanvasTheme
  isEditingContent: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onContentChange: (nodeId: string, content: string) => void
  onStopEditing: () => void
  onRetry?: (node: CanvasNodeData) => void
}) {
  const t = useT()
  if (node.metadata?.status === "loading") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3" style={{ color: theme.node.activeStroke }}>
        <RiLoader4Line className="size-10 animate-spin" />
        <span className="text-[10px] tracking-[0.2em]">{t("pages.workflows.canvasGenerating")}</span>
      </div>
    )
  }
  if (node.metadata?.status === "error") {
    return (
      <div className="flex max-w-[260px] flex-col items-center gap-3 px-5 text-center">
        <div className="break-words text-xs leading-5 text-red-400" title={node.metadata?.errorDetails}>
          {node.metadata?.errorDetails || t("pages.workflows.canvasFailed")}
        </div>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium"
          style={{ background: theme.toolbar.panel, borderColor: theme.toolbar.border, color: theme.node.text }}
          onClick={(event) => {
            event.stopPropagation()
            onRetry?.(node)
          }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <RiRefreshLine className="size-3.5" />
          {t("pages.workflows.retry")}
        </button>
      </div>
    )
  }
  if (node.type === CanvasNodeType.Group) {
    return (
      <div className="pointer-events-none flex h-full w-full p-3">
        <div className="flex h-7 items-center gap-2 px-1 text-xs font-medium" style={{ color: theme.node.text }}>
          <RiStackLine className="size-3.5" style={{ color: theme.node.muted }} />
          <span className="truncate">{node.title || t("pages.workflows.canvasGroup")}</span>
        </div>
      </div>
    )
  }
  if (node.type === CanvasNodeType.Text) {
    return (
      <TextBody
        node={node}
        theme={theme}
        isEditingContent={isEditingContent}
        textareaRef={textareaRef}
        onContentChange={onContentChange}
        onStopEditing={onStopEditing}
      />
    )
  }
  if (node.type === CanvasNodeType.Video) {
    if (!node.metadata?.content) return <EmptySlot theme={theme} icon={<RiPlayCircleLine className="size-7 opacity-35" />} label={t("pages.workflows.canvasEmptyVideo")} />
    return <video src={node.metadata.content} controls className="h-full w-full rounded-[18px] bg-black object-contain" data-canvas-no-zoom />
  }
  if (node.type === CanvasNodeType.Audio) {
    if (!node.metadata?.content) return <EmptySlot theme={theme} icon={<RiMusic2Line className="size-7 opacity-35" />} label={t("pages.workflows.canvasEmptyAudio")} />
    return (
      <div className="flex h-full w-full flex-col justify-center gap-3 px-4" style={{ background: theme.node.fill, color: theme.node.text }}>
        <div className="flex items-center gap-2 text-sm opacity-70">
          <RiMusic2Line className="size-4" />
          {t("pages.workflows.canvasAudio")}
        </div>
        <audio src={node.metadata.content} controls className="w-full" data-canvas-no-zoom />
      </div>
    )
  }
  if (node.type === CanvasNodeType.Image && node.metadata?.content) {
    return (
      <img
        src={node.metadata.content}
        alt={node.title}
        draggable={false}
        className={`pointer-events-none block h-full w-full select-none ${node.metadata?.freeResize ? "object-fill" : "object-contain"}`}
      />
    )
  }
  return (
    <EmptySlot
      theme={theme}
      icon={<RiImageLine className="size-6 opacity-30" />}
      label={node.type === CanvasNodeType.Config ? t("pages.workflows.canvasConfig") : t("pages.workflows.canvasEmptyImage")}
    />
  )
}

function EmptySlot({ theme, icon, label }: { theme: CanvasTheme; icon: React.ReactNode; label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 p-4 text-center" style={{ color: theme.node.placeholder }}>
      <div
        className="flex size-12 items-center justify-center rounded-xl shadow-xs transition-transform"
        style={{ background: theme.toolbar.itemHover, color: theme.node.muted }}
      >
        {icon}
      </div>
      <span className="text-[11px] font-medium tracking-wide opacity-70">{label}</span>
    </div>
  )
}

function TextBody({
  node,
  theme,
  isEditingContent,
  textareaRef,
  onContentChange,
  onStopEditing
}: {
  node: CanvasNodeData
  theme: CanvasTheme
  isEditingContent: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onContentChange: (nodeId: string, content: string) => void
  onStopEditing: () => void
}) {
  const t = useT()
  const fontSize = node.metadata?.fontSize || 13
  const content = node.metadata?.content || ""
  const textStyle = {
    fontSize: `${fontSize}px`,
    lineHeight: `${Math.round(fontSize * 1.6)}px`,
    color: theme.node.text
  } as React.CSSProperties

  if (isEditingContent) {
    return (
      <div className="relative h-full w-full p-3.5">
        <textarea
          ref={textareaRef}
          data-canvas-no-zoom
          className="thin-scrollbar block h-full w-full resize-none overflow-y-auto whitespace-pre-wrap break-words border-none bg-transparent font-sans text-left outline-none selection:bg-blue-500/20"
          style={textStyle}
          value={content}
          placeholder={t("pages.workflows.canvasEditText")}
          onChange={(event) => onContentChange(node.id, event.target.value)}
          onBlur={onStopEditing}
          onKeyDown={(event) => {
            if (event.key === "Escape") onStopEditing()
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        />
      </div>
    )
  }

  if (content) {
    return (
      <div
        className="thin-scrollbar block h-full w-full overflow-y-auto whitespace-pre-wrap break-words p-3.5 font-sans text-left"
        style={textStyle}
        onWheel={(event) => event.stopPropagation()}
      >
        {content}
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col justify-start p-3.5 text-left font-sans select-none" style={{ color: theme.node.placeholder }}>
      <p className="text-xs leading-relaxed opacity-60">
        {t("pages.workflows.canvasEditText")}
      </p>
      <span className="mt-2 text-[10px] opacity-40">双击输入文本、提示词或说明</span>
    </div>
  )
}
