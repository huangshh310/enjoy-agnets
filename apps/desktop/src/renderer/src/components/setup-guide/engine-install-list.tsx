/**
 * 引导里的本机引擎：就绪的只标状态，缺的走已有安装或复制命令。
 */
import { useState } from "react"
import { RiRefreshLine } from "@remixicon/react"
import { useQueryClient } from "@tanstack/react-query"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { composerAgentTabs } from "@renderer/components/ai-chat/agent-picker/composer-agents"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import {
  copyMissingCommand,
  installMissingAgent
} from "@renderer/components/ai-chat/empty-state/checklist/empty-state-missing-actions"
import { useSettingsSnapshot } from "@renderer/hooks/use-settings-snapshot"
import { useT } from "@renderer/i18n"
import { useChatReadiness } from "@renderer/hooks/use-chat-readiness"
import { countAvailableEngines } from "@enjoy-agents/ipc-contract/chat-readiness"
import { guideEngineShowsReady } from "./guide-engine-ready"
import { splitGuideEngines } from "./guide-engine-split"
import { GUIDE_TILE_CLASS } from "./setup-guide-frame"

type RowPhase = "idle" | "busy" | "failed" | "copied"

export function EngineInstallList() {
  const t = useT()
  const snapshot = useSettingsSnapshot()
  const tools = composerAgentTabs(snapshot.data?.agentTools ?? [])
  const [phase, setPhase] = useState<Record<string, RowPhase>>({})
  const [refreshing, setRefreshing] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const queryClient = useQueryClient()
  const readiness = useChatReadiness().data
  const ready = readiness?.engineCount ?? countAvailableEngines(tools)
  const missing = tools.filter((tool) => !tool.comingSoon && !guideEngineShowsReady(tool)).length
  const { pinned, more } = splitGuideEngines(tools)
  const visible = showMore ? [...pinned, ...more] : pinned
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      <ul className="grid min-h-0 flex-1 auto-rows-[60px] grid-cols-3 content-start gap-2.5 overflow-y-auto pr-1">
        {visible.map((tool) => (
          <EngineInstallRow
            key={tool.id}
            tool={tool}
            phase={phase[tool.id] ?? "idle"}
            readyLabel={t("settings.setupGuide.readyState")}
            missingLabel={t("settings.setupGuide.missingState")}
            soonLabel={t("settings.setupGuide.soonState")}
            actionLabel={actionLabel(tool, phase[tool.id] ?? "idle", t)}
            onAction={() => void runEngineAction(tool, setPhase, queryClient)}
          />
        ))}
      </ul>
      {more.length > 0 ? (
        <button
          type="button"
          data-testid="setup-guide-more-engines"
          onClick={() => setShowMore((open) => !open)}
          className="self-start cursor-pointer text-caption-1-medium text-text-primary underline decoration-text-primary/40 underline-offset-2"
        >
          {showMore ? t("settings.setupGuide.fewerEngines") : t("settings.setupGuide.moreEngines")}
        </button>
      ) : null}
      <div className="flex items-center justify-between text-body-2-regular text-text-secondary">
        <span>{t("settings.setupGuide.engineSummary", { ready, missing })}</span>
        <button
          type="button"
          disabled={refreshing}
          onClick={() => void redetectEngines(setRefreshing, queryClient)}
          className="inline-flex cursor-pointer items-center gap-1.5 text-text-primary/70 hover:text-text-primary disabled:opacity-60"
        >
          <RiRefreshLine className={cx("size-3.5", refreshing && "animate-spin")} aria-hidden />
          {t("settings.setupGuide.redetect")}
        </button>
      </div>
    </div>
  )
}

function EngineInstallRow({
  tool,
  phase,
  readyLabel,
  missingLabel,
  soonLabel,
  actionLabel,
  onAction
}: {
  tool: AgentToolPublic
  phase: RowPhase
  readyLabel: string
  missingLabel: string
  soonLabel: string
  actionLabel: string
  onAction: () => void
}) {
  const ready = guideEngineShowsReady(tool)
  const status = tool.comingSoon ? soonLabel : ready ? readyLabel : missingLabel
  const dot = ready ? "bg-state-success-text" : "bg-text-tertiary/40"
  return (
    <li className={cx("flex h-[60px] items-center gap-3 px-3.5", GUIDE_TILE_CLASS, tool.comingSoon && "opacity-50")}>
      <AgentBrandIcon id={tool.id} size={20} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-headline-medium font-medium text-text-primary">{tool.label}</span>
        <span className="flex items-center gap-1.5 text-caption-1-regular text-text-secondary">
          <span aria-hidden className={cx("size-1.5 shrink-0 rounded-full", dot)} />
          {status}
          {ready || tool.comingSoon ? null : (
            <button
              type="button"
              disabled={phase === "busy"}
              onClick={onAction}
              className="ml-1 cursor-pointer text-text-primary underline decoration-text-primary/40 underline-offset-2 disabled:opacity-40"
            >
              {actionLabel}
            </button>
          )}
        </span>
      </span>
    </li>
  )
}

async function redetectEngines(
  setRefreshing: (value: boolean) => void,
  queryClient: ReturnType<typeof useQueryClient>
): Promise<void> {
  setRefreshing(true)
  try {
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  } finally {
    setRefreshing(false)
  }
}

function actionLabel(tool: AgentToolPublic, phase: RowPhase, t: (path: string) => string): string {
  if (phase === "busy") return t("settings.setupGuide.installing")
  if (phase === "failed") return t("settings.setupGuide.installFailed")
  if (phase === "copied") return t("settings.setupGuide.copied")
  return tool.installKind === "copy" ? t("settings.setupGuide.copyCmd") : t("settings.setupGuide.install")
}

async function runEngineAction(
  tool: AgentToolPublic,
  setPhase: (value: Record<string, RowPhase> | ((prev: Record<string, RowPhase>) => Record<string, RowPhase>)) => void,
  queryClient: ReturnType<typeof useQueryClient>
): Promise<void> {
  setPhase((prev) => ({ ...prev, [tool.id]: "busy" }))
  const ok =
    tool.installKind === "copy"
      ? await copyMissingCommand(tool.installCommand)
      : await installMissingAgent(tool)
  setPhase((prev) => ({ ...prev, [tool.id]: ok ? (tool.installKind === "copy" ? "copied" : "idle") : "failed" }))
  if (ok && tool.installKind !== "copy") {
    await queryClient.invalidateQueries({ queryKey: ["settings"] })
  }
}
