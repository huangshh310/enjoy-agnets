/**
 * Composer 模型浮层：左列引擎图标，右列搜索和名单。
 * 点图标只切换正在看的引擎，点模型才真正换上。
 */
import { useState } from "react"
import { RiBookmarkLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { DEFAULT_RUNTIME_ID } from "@renderer/lib/agent-runtime"
import { useT } from "@renderer/i18n"
import { UsagePill } from "../usage/usage-pill"
import { AgentBrandIcon } from "./agent-brand-icon"
import { AgentCliPane } from "./agent-cli-pane"
import { splitCliReady } from "./split-cli-ready"
import { ComposerModelMenu } from "./composer-model-menu"
import { ComposerPresetRow } from "./composer-preset-row"
import { EngineRenameAction } from "./engine-rename-action"
import { useEngineFace } from "@renderer/hooks/use-engine-display-name"
import type { AgentPickerModel } from "./use-agent-picker"

type RailAgent = AgentPickerModel["local"][number]

export function ComposerModelFlyout({ model }: { model: AgentPickerModel }) {
  const [presets, setPresets] = useState(false)
  const engines = railEngines(model)
  return (
    <div className="relative flex h-[min(22rem,calc(100vh-6rem))] w-[19.5rem] flex-col overflow-hidden pl-11">
      <EngineIconRail
        engines={engines}
        soon={model.soon}
        runtimeId={model.runtimeId}
        selectedId={presets ? null : (model.tab?.id ?? null)}
        presets={presets}
        onSelect={(id) => {
          setPresets(false)
          model.setTabId(id)
        }}
        onPresets={() => setPresets(true)}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
        <FlyoutQuota model={model} />
        {presets ? <ComposerPresetRow /> : <FlyoutPane model={model} />}
      </div>
    </div>
  )
}

function railEngines(model: AgentPickerModel): RailAgent[] {
  const { installed, missing } = splitCliReady(model.cli)
  return [...model.local, ...installed, ...missing]
}

function EngineIconRail({
  engines,
  soon,
  runtimeId,
  selectedId,
  presets,
  onSelect,
  onPresets
}: {
  engines: RailAgent[]
  soon: RailAgent[]
  runtimeId: string
  selectedId: string | null
  presets: boolean
  onSelect: (id: string) => void
  onPresets: () => void
}) {
  const t = useT()
  const [soonOpen, setSoonOpen] = useState(false)
  return (
    <nav
      aria-label={t("chat.selectAgent")}
      className="no-scrollbar absolute inset-y-0 left-0 flex w-11 flex-col items-center gap-1 overflow-x-hidden overflow-y-auto overscroll-contain border-r border-separator-border p-1.5"
    >
      {engines.map((agent) => (
        <EngineIconTab
          key={agent.id}
          agent={agent}
          selected={agent.id === selectedId}
          current={agent.id === runtimeId}
          onSelect={() => onSelect(agent.id)}
        />
      ))}
      <SoonRail soon={soon} open={soonOpen} selectedId={selectedId} runtimeId={runtimeId} onToggle={() => setSoonOpen((value) => !value)} onSelect={onSelect} />
      <PresetRailButton pressed={presets} onPress={onPresets} />
    </nav>
  )
}

function PresetRailButton({ pressed, onPress }: { pressed: boolean; onPress: () => void }) {
  const t = useT()
  return (
    <button
      type="button"
      title={t("chat.presetTitle")}
      aria-label={t("chat.presetTitle")}
      aria-pressed={pressed}
      onClick={onPress}
      className={cx(
        "mt-auto grid size-8 shrink-0 place-items-center rounded-md",
        pressed
          ? "bg-background-tertiary-default text-text-primary"
          : "text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary"
      )}
    >
      <RiBookmarkLine className="size-4" aria-hidden />
    </button>
  )
}

function SoonRail({
  soon,
  open,
  selectedId,
  runtimeId,
  onToggle,
  onSelect
}: {
  soon: RailAgent[]
  open: boolean
  selectedId: string | null
  runtimeId: string
  onToggle: () => void
  onSelect: (id: string) => void
}) {
  const t = useT()
  if (soon.length === 0) return null
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        title={t("chat.railSoonCount", { n: soon.length })}
        aria-label={t("chat.railSoonCount", { n: soon.length })}
        onClick={onToggle}
        className="grid size-8 shrink-0 place-items-center rounded-md text-caption-2-medium text-text-tertiary hover:bg-background-secondary-hover"
      >
        {soon.length}
      </button>
      {open
        ? soon.map((agent) => (
            <EngineIconTab
              key={agent.id}
              agent={agent}
              selected={agent.id === selectedId}
              current={agent.id === runtimeId}
              onSelect={() => onSelect(agent.id)}
            />
          ))
        : null}
    </>
  )
}

function EngineIconTab({
  agent,
  selected,
  current,
  onSelect
}: {
  agent: RailAgent
  selected: boolean
  current: boolean
  onSelect: () => void
}) {
  const { face, trueNameTitle } = useEngineFace(agent.id, agent.label)
  const dim = agent.id !== DEFAULT_RUNTIME_ID && agent.status !== "ready"
  return (
    <button
      type="button"
      role="tab"
      title={trueNameTitle || face}
      aria-label={face}
      aria-selected={selected}
      onClick={onSelect}
      className={cx(
        "relative grid size-8 shrink-0 place-items-center rounded-md",
        selected
          ? "bg-background-tertiary-default text-text-primary"
          : "text-text-tertiary hover:bg-background-secondary-hover hover:text-text-primary",
        dim && !selected && "opacity-40"
      )}
    >
      <AgentBrandIcon id={agent.id} size={16} />
      {current ? <span className="absolute top-1 right-1 size-1 rounded-full bg-accent-500" aria-hidden /> : null}
    </button>
  )
}

function FlyoutQuota({ model }: { model: AgentPickerModel }) {
  if (model.pickerLocked || model.quota.percent == null) return null
  return (
    <div className="flex h-8 shrink-0 items-center justify-between border-b border-separator-border px-3">
      <span className="text-caption-2-medium text-text-tertiary">{model.t("chat.usage.accountTitle")}</span>
      <UsagePill runtimeId={model.runtimeId} />
    </div>
  )
}

function FlyoutPane({ model }: { model: AgentPickerModel }) {
  const tab = model.tab
  if (!tab) return null
  if (tab.id !== DEFAULT_RUNTIME_ID) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden">
        <div className="flex h-8 shrink-0 items-center justify-end border-b border-separator-border px-2">
          <EngineRenameAction runtimeId={tab.id} />
        </div>
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
      </div>
    )
  }
  return (
    <ComposerModelMenu
      modelId={model.modelId}
      models={model.models}
      rename={<EngineRenameAction runtimeId={tab.id} />}
      onSelectModel={(picked) => {
        void model.applyAgent(DEFAULT_RUNTIME_ID, picked.id, picked.label)
        model.onModelChange(picked)
        model.setOpen(false)
      }}
    />
  )
}
