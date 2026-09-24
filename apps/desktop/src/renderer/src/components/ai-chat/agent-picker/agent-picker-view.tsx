/**
 * 引擎选择器的胶囊和面板。状态在 useAgentPicker。
 */
import { RiArrowDownSLine } from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cx } from "@/utils/cx"
import { canSwitchAgent, DEFAULT_RUNTIME_ID } from "@renderer/lib/agent-runtime"
import { ModelPickerBody } from "../model-picker/model-picker-body"
import { ModelSwitchToast } from "../composer/model-switch/model-switch-feedback"
import { UsagePill } from "../usage/usage-pill"
import { AgentBrandIcon } from "./agent-brand-icon"
import { AgentCliPane } from "./agent-cli-pane"
import { AgentEngineRail } from "./agent-engine-rail"
import { ComposerPresetRow } from "./composer-preset-row"
import { EnginePickerRenameRow } from "./engine-picker-rename-row"
import { canBindEngine } from "./engine-readiness"
import { readinessInputOf } from "./engine-readiness-input"
import { ModelSwitchBadge } from "./model-switch-badge"
import type { AgentPickerModel } from "./use-agent-picker"

export function AgentPickerView(model: AgentPickerModel) {
  return (
    <div className="relative shrink-0">
      {model.toastLabel ? <ModelSwitchToast modelLabel={model.toastLabel} /> : null}
      <Popover open={model.open} onOpenChange={(next) => onPickerOpen(next, model)}>
        <PopoverTrigger asChild>
          <AgentPickerChip model={model} />
        </PopoverTrigger>
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
      <span className="flex min-w-0 items-baseline">
        <span className={cx("hidden shrink-0 @[18rem]:inline", model.pickerLocked ? "text-accent-500" : "text-text-secondary")}>
          {model.chip.engine}
        </span>
        {model.chip.model ? (
          <>
            <span className="mx-1 hidden shrink-0 text-text-secondary @[24rem]:inline">·</span>
            <span className={cx("hidden min-w-0 truncate font-semibold @[24rem]:inline", model.pickerLocked ? "text-accent-500" : "text-text-primary")}>
              {model.chip.model}
            </span>
          </>
        ) : null}
      </span>
      {model.pickerLocked ? null : <ModelSwitchBadge visible={model.showBadge} />}
      {model.pickerLocked ? null : (
        <RiArrowDownSLine className="size-3 shrink-0 text-text-tertiary transition-transform duration-200 group-data-[state=open]:rotate-180" />
      )}
    </button>
  )
}

function AgentPickerPanel({ model }: { model: AgentPickerModel }) {
  const tab = model.tab
  return (
    <PopoverContent side="top" align="end" sideOffset={8} className={pickerPanelClass(model)}>
      <ComposerPresetRow />
      <AgentPickerQuota model={model} />
      <AgentEngineRail
        local={model.local}
        cli={model.cli}
        soon={model.soon}
        selectedId={tab?.id ?? DEFAULT_RUNTIME_ID}
        currentId={model.runtimeId}
        onSelect={(id) => void model.onTab(id)}
      />
      {model.pickerLocked || !tab ? null : <EnginePickerRenameRow runtimeId={tab.id} brandLabel={tab.label} />}
      <AgentPickerBody model={model} />
    </PopoverContent>
  )
}

/** 未就绪的 CLI 用 max-h，避免空面板被固定高度撑出一块空白。 */
function pickerPanelClass(model: AgentPickerModel): string {
  return cx(
    "flex w-[min(36rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-0 shadow-card",
    pickerPanelTall(model) ? "max-h-[390px]" : "h-[390px]"
  )
}

function pickerPanelTall(model: AgentPickerModel): boolean {
  const tab = model.tab
  if (!tab || tab.id === DEFAULT_RUNTIME_ID) return false
  if (!canSwitchAgent(tab)) return true
  const loop = model.loginLoops[tab.id]?.phase
  return !canBindEngine(readinessInputOf(tab, { hasKey: model.hasKey, loginLoop: loop }))
}

function AgentPickerQuota({ model }: { model: AgentPickerModel }) {
  if (model.pickerLocked || model.quota.percent == null) return null
  return (
    <div className="flex items-center justify-between gap-2 border-b border-separator-border px-3 py-1.5">
      <p className="text-caption-2-medium text-text-secondary">{model.t("chat.usage.accountTitle")}</p>
      <UsagePill runtimeId={model.runtimeId} />
    </div>
  )
}

function AgentPickerBody({ model }: { model: AgentPickerModel }) {
  const tab = model.tab
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {tab && tab.id !== DEFAULT_RUNTIME_ID ? (
        <AgentCliPane
          agent={tab}
          inspecting={model.inspecting}
          onUse={(picked) => {
            void model.applyAgent(tab.id, picked?.id, picked?.label).then(() => model.setOpen(false))
          }}
          onInstalled={() => {
            void model.queryClient.invalidateQueries({ queryKey: ["settings"] })
            void model.queryClient.invalidateQueries({ queryKey: ["agentTools.inspect"] })
          }}
        />
      ) : (
        <ModelPickerBody
          modelId={model.modelId}
          models={model.models}
          onSelectModel={(picked) => {
            void model.applyAgent(DEFAULT_RUNTIME_ID, picked.id, picked.label)
            model.onModelChange(picked)
            model.setOpen(false)
          }}
        />
      )}
    </div>
  )
}
