/**
 * 引擎选择器的胶囊和面板。状态在 useAgentPicker。
 */
import { RiArrowDownSLine } from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cx } from "@/utils/cx"
import { ModelSwitchToast } from "../composer/model-switch/model-switch-feedback"
import { DEFAULT_RUNTIME_ID } from "@renderer/lib/agent-runtime"
import { ModelBrandIcon } from "@renderer/components/settings/providers/provider-icons"
import { AgentBrandIcon } from "./agent-brand-icon"
import { CliModelMark } from "./cli-model-mark"
import { ComposerModelFlyout } from "./composer-model-flyout"
import { ModelSwitchBadge } from "./model-switch-badge"
import type { AgentPickerModel } from "./use-agent-picker"

export function AgentPickerView(model: AgentPickerModel) {
  return (
    <div className="relative shrink-0">
      {model.toastLabel ? <ModelSwitchToast modelLabel={model.toastLabel} /> : null}
      <Popover open={model.open} onOpenChange={(next) => onPickerOpen(next, model)}>
        <AgentPickerChip model={model} />
        <AgentPickerPanel model={model} />
      </Popover>
    </div>
  )
}

function onPickerOpen(next: boolean, model: AgentPickerModel) {
  if (model.pickerLocked) {
    model.setOpen(false)
    return
  }
  model.setOpen(next)
}

function AgentPickerChip({ model }: { model: AgentPickerModel }) {
  return (
    <PopoverTrigger asChild>
      <button
        type="button"
        data-testid="composer-engine-chip"
        aria-label={model.pickerLocked ? model.chip.title : model.t("chat.selectAgent")}
        title={model.chipTitle}
        className={cx(
          "group inline-flex h-6 max-w-[16rem] shrink-0 items-center gap-1 rounded-full border px-2 text-caption-2-medium outline-none transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          model.pickerLocked
            ? "border-accent-500 bg-background-secondary-default text-accent-500"
            : "border-border-button-default bg-accent-500/10 text-text-primary ring-1 ring-accent-500/20 hover:bg-accent-500/15"
        )}
      >
        <span className="flex size-3.5 shrink-0 items-center justify-center">
          <AgentBrandIcon id={model.chipIconId} size={14} />
        </span>
        <ChipLabel model={model} />
        {model.pickerLocked ? null : <ModelSwitchBadge visible={model.showBadge} />}
        {model.pickerLocked ? null : (
          <RiArrowDownSLine className="size-3 shrink-0 text-text-tertiary transition-transform duration-200 group-data-[state=open]:rotate-180" />
        )}
      </button>
    </PopoverTrigger>
  )
}

function ChipLabel({ model }: { model: AgentPickerModel }) {
  const shownId = shownModelId(model)
  const listed = model.models.find((item) => item.id === shownId)
  return (
    <span className="flex min-w-0 items-center">
      <span className={cx("hidden shrink-0 @[18rem]:inline", model.pickerLocked ? "text-accent-500" : "text-text-secondary")}>
        {model.chip.engine}
      </span>
      {model.chip.model ? (
        <>
          <span className="mx-1 hidden shrink-0 text-text-secondary @[24rem]:inline">·</span>
          {model.pickerLocked ? null : <ChipModelIcon model={model} shownId={shownId} provider={listed?.provider} apiStyle={listed?.apiStyle} />}
          <span className={cx("hidden min-w-0 truncate font-semibold @[24rem]:inline", model.pickerLocked ? "text-accent-500" : "text-text-primary")}>
            {model.chip.model}
          </span>
        </>
      ) : null}
    </span>
  )
}

function shownModelId(model: AgentPickerModel): string {
  const overlay = model.sessionId ? model.sessionModels[model.sessionId]?.trim() : ""
  if (overlay) return overlay
  if (model.runtimeId === DEFAULT_RUNTIME_ID) return model.modelId
  return model.current?.selectedModel?.trim() || model.chip.model
}

function ChipModelIcon({
  model,
  shownId,
  provider,
  apiStyle
}: {
  model: AgentPickerModel
  shownId: string
  provider?: string
  apiStyle?: string
}) {
  return (
    <span className="mr-1 hidden size-3.5 shrink-0 items-center justify-center @[24rem]:inline-flex">
      {model.runtimeId === DEFAULT_RUNTIME_ID ? (
        <ModelBrandIcon modelId={shownId} providerKind={provider} apiStyle={apiStyle} size={14} />
      ) : (
        <CliModelMark agentId={model.runtimeId} model={{ id: shownId, label: model.chip.model }} size={14} />
      )}
    </span>
  )
}

function AgentPickerPanel({ model }: { model: AgentPickerModel }) {
  return (
    <PopoverContent
      side="top"
      align="start"
      sideOffset={8}
      collisionPadding={12}
      className="w-auto overflow-hidden rounded-xl border border-border-button-default bg-background-primary-default p-0 shadow-card"
    >
      <ComposerModelFlyout model={model} />
    </PopoverContent>
  )
}
