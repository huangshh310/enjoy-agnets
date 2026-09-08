/**
 * Composer 上沿：交接确认卡 + 已交接微条（仅 from→to）。
 */
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { DEFAULT_RUNTIME_ID } from "@renderer/lib/agent-runtime"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { EngineHandoffBanner } from "./engine-handoff-banner"
import { EngineHandoffCard } from "./engine-handoff-card"
import { useEngineHandoffStore } from "./engine-handoff-store"
import { restoreComposerEngineSelection } from "./restore-composer-engine"

export function EngineHandoffDock() {
  const t = useT()
  const tools = useSettingsSnapshot().data?.agentTools ?? []
  const phase = useEngineHandoffStore((state) => state.phase)
  const fromRuntimeId = useEngineHandoffStore((state) => state.fromRuntimeId)
  const toRuntimeId = useEngineHandoffStore((state) => state.toRuntimeId)
  const banner = useEngineHandoffStore((state) => state.banner)

  const fromId = fromRuntimeId ?? banner?.fromRuntimeId
  const toId = toRuntimeId ?? banner?.toRuntimeId
  const fromLabel = labelFor(tools, fromId, t("chat.usage.enjoyLocal"))
  const toLabel = labelFor(tools, toId, t("chat.usage.enjoyLocal"))

  const showCard = phase !== "idle"
  const showBanner = Boolean(banner)
  if (!showCard && !showBanner) return null

  return (
    <div className="mb-2 flex w-full flex-col items-start gap-2">
      {showCard ? (
        <EngineHandoffCard
          fromLabel={fromLabel}
          toLabel={toLabel}
          onCancelRestore={(from) => {
            restoreComposerEngineSelection(from, useChatStore.getState().setRuntimeId)
          }}
        />
      ) : null}
      <EngineHandoffBanner fromLabel={fromLabel} toLabel={toLabel} />
    </div>
  )
}

function labelFor(
  tools: Array<{ id: string; label: string }>,
  id: string | null | undefined,
  localLabel: string
): string {
  if (!id) return ""
  if (id === DEFAULT_RUNTIME_ID) return tools.find((item) => item.id === id)?.label ?? localLabel
  return tools.find((item) => item.id === id)?.label ?? id
}