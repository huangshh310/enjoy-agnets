/**
 * 节点悬浮快捷操作条（Node Hover Toolbar）。
 * 对齐 infinite-canvas hover toolbar：白底/暗色胶囊、图标+文字、信息弹窗、生图/对话框开关、缩小/放大字号等。
 */
import { useMemo, useState } from "react"
import {
  RiAddLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiFileCopyLine,
  RiFolderAddLine,
  RiInformationLine,
  RiSparklingLine,
  RiSplitCellsHorizontal,
  RiSubtractLine
} from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { CanvasNodeType, type CanvasNodeData, type ViewportTransform } from "../lib/canvas.types"
import { useCanvasTheme } from "../stores/use-canvas-theme"

export function CanvasNodeHoverToolbar({
  node,
  viewport,
  onDuplicate,
  onDelete,
  onIncreaseFont,
  onDecreaseFont,
  onTogglePanel,
  onDownload,
  onUngroup,
  onSaveAsset
}: {
  node: CanvasNodeData | null
  viewport: ViewportTransform
  onDuplicate: (node: CanvasNodeData) => void
  onDelete: (node: CanvasNodeData) => void
  onIncreaseFont?: (node: CanvasNodeData) => void
  onDecreaseFont?: (node: CanvasNodeData) => void
  onTogglePanel?: (node: CanvasNodeData) => void
  onDownload?: (node: CanvasNodeData) => void
  onUngroup?: (node: CanvasNodeData) => void
  onSaveAsset?: (node: CanvasNodeData) => void
}) {
  const t = useT()
  const theme = useCanvasTheme()
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [savedAssetToast, setSavedAssetToast] = useState(false)

  if (!node) return null

  // 世界坐标转换为屏幕视口坐标（位于节点上方或翻转到下方）
  const nodeTopScreen = viewport.y + node.position.y * viewport.k
  const nodeBottomScreen = viewport.y + (node.position.y + node.height) * viewport.k
  const rawLeft = viewport.x + (node.position.x + node.width / 2) * viewport.k

  // 工具栏高度为 44px (h-11)，当节点贴近视口顶栏 (小于 68px) 时智能翻转至节点下方
  const isFlipped = nodeTopScreen - 58 < 64
  const top = isFlipped ? nodeBottomScreen + 14 : nodeTopScreen - 14
  const left = Math.max(160, Math.min(window.innerWidth - 160, rawLeft))

  const isText = node.type === CanvasNodeType.Text
  const isMedia =
    (node.type === CanvasNodeType.Image ||
      node.type === CanvasNodeType.Video ||
      node.type === CanvasNodeType.Audio) &&
    Boolean(node.metadata?.content)
  const isGroup = node.type === CanvasNodeType.Group

  function handleSaveAsset() {
    if (!node) return
    if (onSaveAsset) {
      onSaveAsset(node)
    } else {
      setSavedAssetToast(true)
      setTimeout(() => setSavedAssetToast(false), 2000)
    }
  }

  return (
    <>
      <div
        className={`pointer-events-auto absolute z-[75] flex h-11 -translate-x-1/2 items-center gap-0.5 rounded-[18px] border border-black/10 dark:border-white/10 bg-white/95 dark:bg-zinc-900/95 px-1.5 shadow-[0_8px_28px_rgba(15,23,42,.12)] backdrop-blur-md transition-all ${
          isFlipped ? "translate-y-0" : "-translate-y-full"
        }`}
        style={{
          left,
          top,
          color: theme.toolbar.item
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 节点详细信息 */}
        <ToolbarItem
          icon={<RiInformationLine className="size-4 opacity-75" />}
          label="信息"
          title="查看节点信息与 JSON"
          onClick={() => setInfoModalOpen(true)}
        />

        {/* 删除节点 */}
        <ToolbarItem
          icon={<RiDeleteBinLine className="size-4" />}
          label={t("pages.workflows.canvasDelete")}
          title={t("pages.workflows.canvasDelete")}
          danger
          onClick={() => onDelete(node)}
        />

        {/* 存资产 */}
        <ToolbarItem
          icon={savedAssetToast ? <RiCheckLine className="size-4 text-emerald-500" /> : <RiFolderAddLine className="size-4 opacity-75" />}
          label={savedAssetToast ? "已暂存" : "存资产"}
          title="存入资产库"
          onClick={handleSaveAsset}
        />

        {/* 非 Group 节点：打开/切换生成提示词面板 */}
        {!isGroup && onTogglePanel && (
          <ToolbarItem
            icon={<RiSparklingLine className="size-4 text-blue-500" />}
            label="生图"
            title="生成提示词与设置"
            onClick={() => onTogglePanel(node)}
          />
        )}

        {/* 文本节点专属：字号大小调节 */}
        {isText && (
          <>
            <ToolbarItem
              icon={<RiSubtractLine className="size-4 opacity-75" />}
              label="缩小"
              title="减小字号"
              onClick={() => onDecreaseFont?.(node)}
            />
            <ToolbarItem
              icon={<RiAddLine className="size-4 opacity-75" />}
              label="放大"
              title="增大字号"
              onClick={() => onIncreaseFont?.(node)}
            />
          </>
        )}

        {/* 媒体节点专属：下载素材 */}
        {isMedia && (
          <ToolbarItem
            icon={<RiDownloadLine className="size-4 opacity-75" />}
            label="下载"
            title="下载媒体素材"
            onClick={() => onDownload?.(node)}
          />
        )}

        {/* Group 专属：解散成组 */}
        {isGroup && onUngroup && (
          <ToolbarItem
            icon={<RiSplitCellsHorizontal className="size-4 text-blue-500" />}
            label="解散"
            title="解散编组"
            onClick={() => onUngroup(node)}
          />
        )}

        {/* 复制节点 */}
        <ToolbarItem
          icon={<RiFileCopyLine className="size-4 opacity-75" />}
          label="复制"
          title={t("pages.workflows.canvasDuplicate")}
          onClick={() => onDuplicate(node)}
        />
      </div>

      {/* 节点详细信息模态窗 */}
      <CanvasNodeInfoModal
        node={node}
        open={infoModalOpen}
        onClose={() => setInfoModalOpen(false)}
      />
    </>
  )
}

function ToolbarItem({
  icon,
  label,
  title,
  danger = false,
  onClick
}: {
  icon: React.ReactNode
  label: string
  title: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      className={`group relative flex h-full items-center px-0.5 transition-colors ${
        danger ? "text-zinc-500 hover:text-rose-500" : "text-zinc-700 dark:text-zinc-200 hover:text-zinc-950 dark:hover:text-white"
      }`}
      onClick={onClick}
    >
      <span className={`flex h-8 items-center gap-1.5 rounded-xl px-2 text-xs font-medium transition ${
        danger ? "group-hover:bg-rose-500/10" : "group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800"
      }`}>
        {icon}
        <span className="whitespace-nowrap text-[11px]">{label}</span>
      </span>
    </button>
  )
}

export function CanvasNodeInfoModal({
  node,
  open,
  onClose
}: {
  node: CanvasNodeData | null
  open: boolean
  onClose: () => void
}) {
  const [tab, setTab] = useState<"info" | "json">("info")
  const [copied, setCopied] = useState(false)

  const jsonString = useMemo(() => {
    if (!node) return ""
    return JSON.stringify(
      node,
      (key, value) => {
        if (key === "content" && typeof value === "string" && value.startsWith("data:")) {
          return "[Base64 Data URI]"
        }
        return value
      },
      2
    )
  }, [node])

  if (!open || !node) return null

  function copyJson() {
    void navigator.clipboard.writeText(jsonString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-[460px] max-h-[80vh] flex flex-col rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border-button-default">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">节点信息</h3>
            <span className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary uppercase">
              {node.type}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5 text-xs font-medium">
              <button
                type="button"
                className={`rounded-md px-2.5 py-1 transition ${tab === "info" ? "bg-white dark:bg-zinc-700 text-text-primary shadow-xs" : "text-text-tertiary"}`}
                onClick={() => setTab("info")}
              >
                信息
              </button>
              <button
                type="button"
                className={`rounded-md px-2.5 py-1 transition ${tab === "json" ? "bg-white dark:bg-zinc-700 text-text-primary shadow-xs" : "text-text-tertiary"}`}
                onClick={() => setTab("json")}
              >
                JSON
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="ml-2 rounded-lg p-1 text-text-tertiary hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <RiCloseLine className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pt-4 text-xs">
          {tab === "info" ? (
            <div className="space-y-3">
              <InfoRow label="节点 ID" value={node.id} />
              <InfoRow label="节点名称" value={node.title || "未命名节点"} />
              <InfoRow label="节点类型" value={node.type} />
              <InfoRow label="尺寸规格" value={`${Math.round(node.width)} × ${Math.round(node.height)} px`} />
              <InfoRow label="画布坐标" value={`X: ${Math.round(node.position.x)}, Y: ${Math.round(node.position.y)}`} />
              <InfoRow label="运行状态" value={node.metadata?.status || "idle"} />
              {node.metadata?.model && (
                <InfoRow label="配置模型" value={node.metadata.model} />
              )}
              {node.metadata?.prompt && (
                <InfoRow label="提示词" value={node.metadata.prompt} />
              )}
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                className="absolute top-2 right-2 flex items-center gap-1 rounded bg-zinc-200/80 dark:bg-zinc-700 px-2 py-1 text-[11px] font-medium text-text-secondary hover:bg-zinc-300 dark:hover:bg-zinc-600 transition"
                onClick={copyJson}
              >
                {copied ? <RiCheckLine className="size-3 text-emerald-500" /> : <RiFileCopyLine className="size-3" />}
                <span>{copied ? "已复制" : "复制"}</span>
              </button>
              <pre className="thin-scrollbar max-h-[380px] overflow-auto rounded-xl bg-zinc-100 dark:bg-zinc-900 p-3 font-mono text-[11px] leading-relaxed text-text-secondary">
                {jsonString}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_minmax(0,1fr)] gap-2 py-1 border-b border-zinc-100 dark:border-zinc-800/60">
      <span className="text-text-tertiary font-medium">{label}</span>
      <span className="text-text-primary break-all">{value}</span>
    </div>
  )
}
