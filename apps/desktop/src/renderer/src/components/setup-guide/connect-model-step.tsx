/**
 * 向导「连一个模型」：点选再按继续。未验证本机模型给人话 + 去验证。
 */
import { RiKey2Line, RiServerLine, RiTimeLine } from "@remixicon/react"
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { cx } from "@/utils/cx"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import { useChatReadiness } from "@renderer/hooks/use-chat-readiness"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { SecretWriteNotice } from "@renderer/components/settings/secret-write-notice"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import {
  connectModelOptions,
  connectModelRowAction,
  connectModelRowHintKey,
  type ConnectModelOption
} from "./connect-model-options"
import { GUIDE_TILE_CLASS } from "./setup-guide-frame"

export function ConnectModelStep({
  picked,
  onPick,
  onAddKey
}: {
  picked: string | null
  onPick: (id: string) => void
  onAddKey: () => void
}) {
  const t = useT()
  const readiness = useChatReadiness().data
  const options = connectModelOptions(readiness)
  return (
    <div className="flex flex-col gap-2">
      {readiness?.secretStorageAvailable === false ? (
        <SecretWriteNotice code="KEYCHAIN_UNAVAILABLE" />
      ) : null}
    <ul data-testid="setup-guide-connect-model" className="flex flex-col gap-2">
      {options.map((option) => (
        <li key={option.id}>
          <ConnectModelRow
            option={option}
            selected={picked === option.id || (option.kind === "api_key" && option.connected && picked == null)}
            onChoose={() => {
              if (connectModelRowAction(option) === "add-key") onAddKey()
              else onPick(option.id)
            }}
            title={rowTitle(option, t)}
            hint={t(connectModelRowHintKey(option), hintVars(option))}
            connectedLabel={t("settings.setupGuide.connectApiKeyConnected")}
            unverifiedLabel={t("settings.setupGuide.connectLocalUnverified")}
          />
        </li>
      ))}
    </ul>
    </div>
  )
}

function ConnectModelRow({
  option,
  selected,
  onChoose,
  title,
  hint,
  connectedLabel,
  unverifiedLabel
}: {
  option: ConnectModelOption
  selected: boolean
  onChoose: () => void
  title: string
  hint: string
  connectedLabel: string
  unverifiedLabel: string
}) {
  return (
    <button
      type="button"
      data-testid={`connect-model-${option.kind}`}
      data-verified={option.kind === "local_model" ? String(option.verified) : undefined}
      data-recommended={option.kind !== "later" && option.recommended ? "true" : undefined}
      onClick={onChoose}
      className={cx(
        "flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left outline-none",
        GUIDE_TILE_CLASS,
        selected && "ring-1 ring-text-primary/30",
        option.kind === "later" && "text-text-secondary",
        "focus-visible:ring-2 focus-visible:ring-border-focus-ring"
      )}
    >
      <RowMark option={option} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className="text-headline-medium font-medium text-text-primary">{title}</span>
          {option.kind === "local_model" && !option.verified ? (
            <span className="text-caption-2-medium text-text-tertiary">{unverifiedLabel}</span>
          ) : null}
        </span>
        <span className="text-body-2-regular text-text-secondary">{hint}</span>
        {option.kind === "local_model" && !option.verified ? <VerifyLocalAction service={option.service} /> : null}
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

function VerifyLocalAction({ service }: { service: "ollama" | "lmstudio" }) {
  const t = useT()
  const client = useQueryClient()
  const providers = useSettingsSnapshot().data?.providers ?? []
  const [phase, setPhase] = useState<"idle" | "pending" | "error">("idle")
  return (
    <span className="mt-1 flex items-center gap-2">
      <button
        type="button"
        data-testid="connect-model-verify"
        disabled={phase === "pending"}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void verifyLocalModel(service, providers, setPhase, () =>
            client.invalidateQueries({ queryKey: ["chat-readiness"] })
          )
        }}
        className="cursor-pointer text-caption-1-medium text-accent-600 hover:underline disabled:opacity-60"
      >
        {phase === "pending" ? t("settings.setupGuide.verifyPending") : t("settings.setupGuide.goVerify")}
      </button>
      {phase === "error" ? (
        <span className="text-caption-2-regular text-text-secondary">{t("settings.setupGuide.verifyFailed")}</span>
      ) : null}
    </span>
  )
}

async function verifyLocalModel(
  service: string,
  providers: Array<{ id: string; kind: string; baseURL?: string; apiStyle?: string }>,
  setPhase: (phase: "idle" | "pending" | "error") => void,
  refresh: () => Promise<unknown>
): Promise<void> {
  if (!hasIde()) return
  const profile = providers.find((row) => row.kind === service)
  if (!profile) {
    setPhase("error")
    return
  }
  setPhase("pending")
  try {
    const res = (await getIde().settings.pingProvider({
      id: profile.id,
      kind: profile.kind,
      baseURL: profile.baseURL,
      apiStyle: profile.apiStyle
    })) as { ok?: boolean }
    setPhase(res.ok ? "idle" : "error")
    if (res.ok) await refresh()
  } catch {
    setPhase("error")
  }
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

function hintVars(option: ConnectModelOption): Record<string, string> | undefined {
  return option.kind === "engine" ? { name: option.name } : undefined
}
