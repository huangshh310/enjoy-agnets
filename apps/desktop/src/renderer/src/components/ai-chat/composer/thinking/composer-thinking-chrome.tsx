/**
 * 思考铬：Enjoy 本地五档；ACP 用广告/种子档；model-id 跟模型。
 */
import { useState } from "react"
import { RiArrowRightSLine, RiBrainLine, RiCheckLine } from "@remixicon/react"
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
  const [open, setOpen] = useState(false)
  const runtimeId = useChatStore((state) => state.runtimeId)
  const live = thoughtLevelOption(useChatStore((state) => state.acpConfigOptions))
  const option = live ?? thoughtSeedFor(runtimeId, modelId)
  const current = useChatStore((state) => state.acpThoughtLevel) ?? currentOf(option)
  if (!option) return null
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <ThoughtChip
        testId="composer-thinking-advertised"
        title={option.name}
        accent
        label={option.choices.find((item) => item.value === current)?.name ?? current ?? option.name}
      />
      <AdvertisedThoughtMenu option={option} current={current} onPick={() => setOpen(false)} />
    </Popover>
  )
}

function AdvertisedThoughtMenu({
  option,
  current,
  onPick
}: {
  option: SessionConfigOption
  current: string | undefined
  onPick: () => void
}) {
  const t = useT()
  return (
    <PopoverContent
      side="top"
      align="start"
      sideOffset={8}
      className="w-[240px] rounded-xl border border-border-button-default bg-background-primary-default p-1.5 shadow-card"
    >
      <p className="px-2 py-1.5 text-caption-2-medium text-text-tertiary">{t("chat.thinkingFollowModel")}</p>
      {option.choices.map((choice) => (
        <button
          key={choice.value}
          type="button"
          onClick={() => {
            void pickThought(option, choice.value)
            onPick()
          }}
          className="flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-caption-2-medium text-text-primary hover:bg-background-secondary-hover"
        >
          <span>{choice.name}</span>
          {choice.value === current ? <RiCheckLine className="size-3.5 text-accent-500" /> : null}
        </button>
      ))}
    </PopoverContent>
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
  accent,
  label
}: {
  testId: string
  title: string
  accent?: boolean
  label: string
}) {
  return (
    <PopoverTrigger asChild>
      <button
        type="button"
        data-testid={testId}
        title={title}
        className={cx(
          "inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 text-caption-2-medium transition-colors",
          "bg-background-tertiary-default/90 text-text-secondary ring-1 ring-border-button-default/80",
          "outline-none hover:bg-background-tertiary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        )}
      >
        <RiBrainLine className={cx("size-3 shrink-0", accent ? "text-accent-500" : "text-text-tertiary")} aria-hidden />
        <span className="whitespace-nowrap">{label}</span>
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
