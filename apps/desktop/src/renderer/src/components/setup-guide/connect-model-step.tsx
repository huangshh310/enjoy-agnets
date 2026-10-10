/**
 * 向导「连一个模型」：可点行，复用淡描边砖。选项只来自 chat.readiness。
 */
import { RiKey2Line, RiServerLine, RiTimeLine } from "@remixicon/react"
import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { cx } from "@/utils/cx"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import { useChatReadiness } from "@renderer/hooks/use-chat-readiness"
import { useT } from "@renderer/i18n"
import { connectModelOptions, type ConnectModelOption } from "./connect-model-options"
import { SETUP_GUIDE_FROM, officialProviderSearch, pauseGuideForProviderForm } from "./open-provider-form"
import { GUIDE_TILE_CLASS } from "./setup-guide-frame"

export function ConnectModelStep({ onSkip }: { onSkip: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  const readiness = useChatReadiness().data
  const options = connectModelOptions(readiness)
  const [picked, setPicked] = useState<string | null>(null)

  function choose(option: ConnectModelOption) {
    if (option.kind === "later") {
      onSkip()
      return
    }
    if (option.kind === "api_key" && !option.connected) {
      pauseGuideForProviderForm("connect-model")
      void navigate({
        to: "/settings/$section",
        params: { section: "providers" },
        search: officialProviderSearch(SETUP_GUIDE_FROM)
      })
      return
    }
    setPicked(option.id)
  }

  return (
    <ul data-testid="setup-guide-connect-model" className="flex flex-col gap-2">
      {options.map((option) => (
        <li key={option.id}>
          <ConnectModelRow
            option={option}
            selected={picked === option.id || (option.kind === "api_key" && option.connected)}
            onChoose={() => choose(option)}
            title={rowTitle(option, t)}
            hint={rowHint(option, t)}
            connectedLabel={t("settings.setupGuide.connectApiKeyConnected")}
          />
        </li>
      ))}
    </ul>
  )
}

function ConnectModelRow({
  option,
  selected,
  onChoose,
  title,
  hint,
  connectedLabel
}: {
  option: ConnectModelOption
  selected: boolean
  onChoose: () => void
  title: string
  hint: string
  connectedLabel: string
}) {
  const recommended = option.kind !== "later" && option.recommended
  return (
    <button
      type="button"
      data-testid={`connect-model-${option.kind}`}
      data-recommended={recommended ? "true" : undefined}
      onClick={onChoose}
      className={cx(
        "flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left",
        GUIDE_TILE_CLASS,
        recommended && "ring-1 ring-accent-500",
        selected && option.kind === "api_key" && "ring-1 ring-state-success-text/50",
        option.kind === "later" && "text-text-secondary"
      )}
    >
      <RowMark option={option} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-headline-medium font-medium text-text-primary">{title}</span>
        <span className="text-body-2-regular text-text-secondary">{hint}</span>
      </span>
      {option.kind === "api_key" && option.connected ? (
        <span className="inline-flex items-center gap-1.5 text-caption-1-medium text-state-success-text">
          <span aria-hidden className="size-1.5 rounded-full bg-state-success-text" />
          {connectedLabel}
        </span>
      ) : null}
    </button>
  )
}

function RowMark({ option }: { option: ConnectModelOption }) {
  if (option.kind === "engine") return <AgentBrandIcon id={option.runtimeId} size={20} />
  if (option.kind === "local_model") return <RiServerLine className="size-5 text-text-primary/80" aria-hidden />
  if (option.kind === "api_key") return <RiKey2Line className="size-5 text-text-primary/80" aria-hidden />
  return <RiTimeLine className="size-5 text-text-tertiary" aria-hidden />
}

function rowTitle(option: ConnectModelOption, t: (path: string, vars?: Record<string, string>) => string): string {
  if (option.kind === "engine") return t("settings.setupGuide.connectEngine", { name: option.name })
  if (option.kind === "local_model") return t("settings.setupGuide.connectLocal")
  if (option.kind === "api_key") return t("settings.setupGuide.connectApiKey")
  return t("settings.setupGuide.connectLater")
}

function rowHint(option: ConnectModelOption, t: (path: string, vars?: Record<string, string>) => string): string {
  if (option.kind === "engine") return t("settings.setupGuide.connectEngineHint", { name: option.name })
  if (option.kind === "local_model") return t("settings.setupGuide.connectLocalHint")
  if (option.kind === "api_key") return t("settings.setupGuide.connectApiKeyHint")
  return t("settings.setupGuide.connectLaterHint")
}
