/**
 * 设置页默认模型选择器。聊天输入框用 AgentPicker（Agent + 模型合一）。
 */
import { useEffect, useMemo, useState } from "react"
import { RiArrowDownSLine } from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getIde, hasIde } from "@renderer/lib/ide"
import { markModelsListFailed } from "@renderer/hooks/models-listed.ts"
import { ModelBrandIcon } from "@renderer/components/settings/providers/provider-icons"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { resolveModelDisplayName } from "@renderer/lib/model-display-name"
import { ModelPickerBody } from "./model-picker-body"

export function ModelPicker({
  modelId,
  modelLabel,
  models,
  onModelChange
}: {
  modelId: string
  modelLabel: string
  models: ModelOption[]
  onModelChange: (model: ModelOption) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const currentModel = useMemo(() => models.find((model) => model.id === modelId), [models, modelId])

  useEffect(() => {
    if (!open || !hasIde()) return
    void getIde()
      .models.list()
      .then((res) => {
        if (!Array.isArray(res)) return
        const listed = res as ModelOption[]
        const store = useChatStore.getState()
        store.setModels(listed)
        if (listed.length === 0) store.setModel("", "")
      })
      .catch(() => markModelsListFailed())
  }, [open])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("chat.selectModel")}
          className="group flex h-8 min-w-0 max-w-full items-center gap-1.5 rounded-full px-2 text-body-medium text-text-secondary outline-none transition-colors hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring @[26rem]:px-2.5"
        >
          <div className="flex size-4.5 shrink-0 items-center justify-center">
            <ModelBrandIcon
              modelId={modelId}
              providerKind={currentModel?.provider}
              apiStyle={currentModel?.apiStyle}
              size={15}
            />
          </div>
          <span className="min-w-0 max-w-[5.5rem] truncate text-caption-1-medium text-text-primary">
            {models.length > 0 ? resolveModelDisplayName(modelId, modelLabel || currentModel?.label) : t("chat.selectModel")}
          </span>
          <RiArrowDownSLine className="size-3.5 shrink-0 text-text-tertiary transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="flex h-[380px] w-[520px] flex-col overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-0 shadow-card sm:w-[560px]"
      >
        <ModelPickerBody
          modelId={modelId}
          models={models}
          onSelectModel={(model) => {
            onModelChange(model)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
