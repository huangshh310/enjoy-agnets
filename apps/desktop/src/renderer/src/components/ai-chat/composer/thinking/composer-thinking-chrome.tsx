/**
 * 思考铬：Enjoy 本地五档；ACP 用广告/种子档；model-id 跟模型。
 */
import { useState } from "react"
import { RiArrowRightSLine, RiBrainLine } from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  composerThinkingChrome,
  SetConfigOptionResult,
  thoughtLevelOption,
  thoughtSeedFor,
  type SessionConfigOption
} from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { ReasoningEffortToggle } from "../../reasoning-effort-toggle"
import { blockDismissWhileEnergyDrag } from "../../reasoning-energy-drag"
import { AdvertisedThoughtMenu } from "./advertised-thought-menu"
import { thoughtChoiceCopy, thoughtToneAt } from "./thought-choice-copy"
import { useComposerModelSwitch } from "../model-switch/use-composer-model-switch"
import { useChatStore, type ModelOption } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"

export function ComposerThinkingChrome({
  modelId,
  modelLabel,
  models,
  compact = false
}: {
  modelId: string
  modelLabel: string
  models: ModelOption[]
  compact?: boolean
}) {
  const runtimeId = useChatStore((state) => state.runtimeId)
  const kind = composerThinkingChrome(runtimeId)
  if (kind === "none") return null
  if (kind === "effort") return <ReasoningEffortToggle compact={compact} />
  if (kind === "advertised") return <AdvertisedThoughtPicker modelId={modelId} />
  return <FollowModelHint modelId={modelId} modelLabel={modelLabel} models={models} />
}

function AdvertisedThoughtPicker({ modelId }: { modelId: string }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const runtimeId = useChatStore((state) => state.runtimeId)
  const live = thoughtLevelOption(useChatStore((state) => state.acpConfigOptions))
  const option = live ?? thoughtSeedFor(runtimeId, modelId)
  const current = useChatStore((state) => state.acpThoughtLevel) ?? currentOf(option)
  if (!option) return null
  const index = Math.max(0, option.choices.findIndex((item) => item.value === current))
  const choice = option.choices[index]
  const copy = thoughtChoiceCopy(choice?.value ?? "", choice?.name ?? "", t)
  const tone = thoughtToneAt(index, option.choices.length)
  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!next && document.documentElement.dataset.energyDrag === "1") return
        setOpen(next)
      }}
    >
      <ThoughtChip
        testId="composer-thinking-advertised"
        title={t("chat.effortEnergy")}
        label={copy.short}
        className={tone.badgeClass}
      />
      <PopoverContent
        side="top"
        align="start"
        sideOffset={8}
        className="w-auto border-0 bg-transparent p-0 shadow-none"
        onPointerDownOutside={blockDismissWhileEnergyDrag}
        onInteractOutside={blockDismissWhileEnergyDrag}
        onFocusOutside={blockDismissWhileEnergyDrag}
      >
        <AdvertisedThoughtMenu
          option={option}
          current={current}
          onChange={(value) => void pickThought(option, value)}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  )
}

function FollowModelHint({
  modelId,
  modelLabel,
  models
}: {
  modelId: string
  modelLabel: string
  models: ModelOption[]
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const switched = useComposerModelSwitch({ modelId, modelLabel, models })
  const current = switched.chip.model || switched.engineLabel
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <ThoughtChip
        testId="composer-thinking-follow-model"
        title={t("chat.thinkingFollowModelHint", { model: current })}
        label={t("chat.thinkingFollowModelShort")}
      />
      <FollowModelMenu model={current} onClose={() => setOpen(false)} />
    </Popover>
  )
}

function FollowModelMenu({ model, onClose }: { model: string; onClose: () => void }) {
  const t = useT()
  return (
    <PopoverContent
      side="top"
      align="start"
      sideOffset={8}
      className="w-[280px] rounded-xl border border-border-button-default bg-background-primary-default p-3 shadow-card"
    >
      <p className="text-caption-2-regular text-text-secondary">
        {t("chat.thinkingFollowModelHint", { model })}
      </p>
      <button
        type="button"
        onClick={() => {
          onClose()
          useChatStore.getState().setAgentPickerOpen(true)
        }}
        className="mt-2 flex w-full cursor-pointer items-center justify-between rounded-lg border border-border-button-default px-2.5 py-1.5 text-caption-2-medium"
      >
        <span>{t("chat.thinkingFollowModel")}</span>
        <RiArrowRightSLine className="size-3.5 text-text-tertiary" />
      </button>
    </PopoverContent>
  )
}

function ThoughtChip({
  testId,
  title,
  label,
  className
}: {
  testId: string
  title: string
  label: string
  className?: string
}) {
  return (
    <PopoverTrigger asChild>
      <button
        type="button"
        data-testid={testId}
        title={title}
        className={cx(
          "inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 text-caption-2-medium ring-1 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
          className ?? "bg-background-tertiary-default/90 text-text-secondary ring-border-button-default/80 hover:bg-background-tertiary-hover hover:text-text-primary"
        )}
      >
        <RiBrainLine className="size-3 shrink-0" aria-hidden />
        <span className="hidden whitespace-nowrap @[28rem]:inline">{label}</span>
      </button>
    </PopoverTrigger>
  )
}

function currentOf(option: SessionConfigOption | undefined): string | undefined {
  return typeof option?.currentValue === "string" ? option.currentValue : undefined
}

async function pickThought(option: SessionConfigOption, value: string): Promise<void> {
  const store = useChatStore.getState()
  store.setAcpThoughtLevel(value)
  if (!hasIde() || !store.sessionId) return
  try {
    const raw = await getIde().agentTools.setConfigOption({
      sessionId: store.sessionId,
      configId: option.id,
      value
    })
    const parsed = SetConfigOptionResult.safeParse(raw)
    if (parsed.success && parsed.data.configOptions) {
      store.applyStreamEvent({
        type: "session.config",
        runId: store.runId ?? "cfg",
        configOptions: parsed.data.configOptions
      })
    }
  } catch {
    /* 尚无活会话时等下一轮 session/new */
  }
}
