/**
 * 画布节点生成条的模型选择器。复用聊天 ModelPicker 双栏列表，按节点模态过滤能力。
 */
import { useEffect, useMemo, useState } from "react"
import { RiArrowDownSLine } from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ModelBrandIcon } from "@renderer/components/settings/providers/provider-icons"
import { ModelPickerBody } from "@renderer/components/ai-chat/model-picker/model-picker-body"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { filterModelsForMode } from "../lib/filter-models-for-mode"
import type { CanvasGenerationMode } from "../lib/canvas.types"

export { filterModelsForMode }

export function CanvasModelPicker({
  mode,
  modelId,
  onModelChange
}: {
  mode: CanvasGenerationMode
  modelId?: string
  onModelChange: (model: ModelOption) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const allModels = useChatStore((state) => state.models)
  const sessionModelId = useChatStore((state) => state.modelId)
  const models = useMemo(() => filterModelsForMode(allModels, mode), [allModels, mode])
  const selectedId = modelId && models.some((item) => item.id === modelId) ? modelId : models[0]?.id ?? sessionModelId
  const current = models.find((item) => item.id === selectedId)

  useEffect(() => {
    if (!open || !hasIde()) return
    void getIde()
      .models.list()
      .then((res) => {
        if (!Array.isArray(res)) return
        useChatStore.getState().setModels(res as ModelOption[])
      })
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-canvas-no-zoom
          className="flex h-8 min-w-0 max-w-[190px] items-center gap-1.5 rounded-full px-2 text-left outline-none hover:bg-black/5"
          title={t("pages.workflows.canvasSelectModel")}
        >
          <ModelBrandIcon modelId={selectedId} providerKind={current?.provider} apiStyle={current?.apiStyle} size={15} />
          <span className="min-w-0 truncate text-xs font-medium">
            {current?.label || selectedId || t("chat.selectModel")}
          </span>
          <RiArrowDownSLine className="size-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        data-canvas-no-zoom
        className="z-[200] flex h-[380px] w-[520px] flex-col overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-0 shadow-card"
        onWheel={(event) => event.stopPropagation()}
      >
        <ModelPickerBody
          modelId={selectedId}
          models={models.length ? models : allModels}
          onSelectModel={(model) => {
            onModelChange(model)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
