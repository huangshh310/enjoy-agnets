/**
 * 智能体卡片头部：品牌、状态、设为主引擎。
 */
import {
  RiCheckLine,
  RiFileCopyLine,
  RiFlashlightLine,
  RiTerminalBoxFill,
  RiTerminalBoxLine
} from "@remixicon/react"
import type { AgentToolPublic } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useT } from "@renderer/i18n"
import { AgentBrandIcon } from "@renderer/components/ai-chat/agent-picker/agent-brand-icon"
import type { AgentToolActions } from "./use-agent-tool-actions"

export function AgentToolHeader({
  tool,
  actions
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
}) {
  const t = useT()
  const ready = tool.status === "ready" || actions.isDefaultLocal
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3.5">
          <BrandMark
            tool={tool}
            terminalLabel={t("settings.agentTools.terminalCli")}
            showTerminal={Boolean(actions.meta.isTerminalCli)}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-body-medium font-semibold text-text-primary">{tool.label}</h3>
              <StatusBadge tool={tool} ready={ready} />
              {actions.meta.badgeText ? (
                <span className="rounded-md border border-border-button-default bg-background-secondary-default px-1.5 py-0.5 font-mono text-caption-2-medium text-text-tertiary">
                  {actions.meta.badgeText}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-caption-1-regular text-text-secondary">{actions.meta.tagline}</p>
          </div>
        </div>
        <HeaderActions tool={tool} actions={actions} ready={ready} />
      </div>
      <CapabilityTags actions={actions} />
      {ready ? <ReadyBar tool={tool} actions={actions} /> : null}
    </>
  )
}

function BrandMark({
  tool,
  terminalLabel,
  showTerminal
}: {
  tool: AgentToolPublic
  terminalLabel: string
  showTerminal: boolean
}) {
  return (
    <div className="relative shrink-0">
      <span className="flex size-11 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default shadow-2xs">
        <AgentBrandIcon id={tool.id} size={24} />
      </span>
      {showTerminal ? (
        <span
          title={terminalLabel}
          className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-[4px] border border-background-primary-default bg-text-primary text-background-primary-default shadow-xs"
        >
          <RiTerminalBoxFill className="size-2.5" />
        </span>
      ) : null}
    </div>
  )
}

function StatusBadge({ tool, ready }: { tool: AgentToolPublic; ready: boolean }) {
  const t = useT()
  const label = ready
    ? t("settings.agentTools.statusReady")
    : tool.comingSoon
      ? t("settings.agentTools.statusSoon")
      : tool.needsLoginHint
        ? t("settings.agentTools.statusPending")
        : t("settings.agentTools.statusMissing")
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-caption-2-medium font-medium ${
        ready
          ? "bg-accent-500/10 text-accent-600"
          : tool.comingSoon
            ? "bg-text-tertiary/10 text-text-tertiary"
            : "bg-background-secondary-default text-text-secondary"
      }`}
    >
      <span
        className={`size-1.5 rounded-full ${
          ready ? "bg-accent-500 animate-pulse" : tool.comingSoon ? "bg-text-tertiary" : "bg-text-secondary"
        }`}
      />
      {label}
    </span>
  )
}

function HeaderActions({
  tool,
  actions,
  ready
}: {
  tool: AgentToolPublic
  actions: AgentToolActions
  ready: boolean
}) {
  const t = useT()
  return (
    <div className="flex items-center gap-2.5">
      {actions.isActive ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-500/15 px-3 py-1 text-caption-1-medium font-semibold text-accent-600 shadow-2xs">
          <RiCheckLine className="size-3.5" />
          {t("settings.agentTools.currentEngine")}
        </span>
      ) : ready && tool.enabled ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={actions.busyAction === "activate"}
          onClick={() => void actions.persistRuntime()}
          className="gap-1 text-caption-1-medium hover:border-accent-500/50 hover:bg-accent-500/5"
        >
          <RiFlashlightLine className="size-3.5 text-accent-500" />
          {t("settings.agentTools.makeActive")}
        </Button>
      ) : null}
      {actions.configurable ? (
        <Switch
          checked={tool.enabled}
          onCheckedChange={(enabled) => void actions.persist({ enabled })}
          aria-label={t("settings.agentTools.enabled")}
        />
      ) : null}
    </div>
  )
}

function CapabilityTags({ actions }: { actions: AgentToolActions }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      {actions.meta.capabilities.map((cap) => (
        <span
          key={cap.code}
          className="inline-flex items-center gap-1 rounded-md border border-border-button-default/80 bg-background-secondary-default/60 px-2 py-0.5 text-caption-2-medium text-text-secondary"
        >
          <span className="size-1 rounded-full bg-text-tertiary" />
          <span>{cap.label}</span>
          <span className="font-mono text-caption-2-medium text-text-tertiary opacity-75">[{cap.code}]</span>
        </span>
      ))}
    </div>
  )
}

function ReadyBar({ tool, actions }: { tool: AgentToolPublic; actions: AgentToolActions }) {
  const t = useT()
  return (
    <div className="mt-1 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-button-default/60 bg-background-secondary-default/30 px-3.5 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <RiTerminalBoxLine className="size-4 shrink-0 text-text-tertiary" />
        <span className="text-caption-2-medium text-text-tertiary">{t("settings.agentTools.execSource")}:</span>
        <span className="truncate font-mono text-caption-2-medium text-text-secondary">
          {tool.detectedPath ||
            (actions.isDefaultLocal ? t("settings.agentTools.builtinRuntime") : t("settings.agentTools.statusReady"))}
        </span>
        {tool.detectedPath ? (
          <button
            type="button"
            title={t("settings.agentTools.copyPath")}
            onClick={() => actions.copyPath(tool.detectedPath!)}
            className="shrink-0 p-0.5 text-text-tertiary hover:text-text-primary"
          >
            {actions.copiedPath ? (
              <RiCheckLine className="size-3.5 text-accent-500" />
            ) : (
              <RiFileCopyLine className="size-3.5" />
            )}
          </button>
        ) : null}
      </div>
      {tool.models && tool.models.length > 0 ? (
        <div className="flex items-center gap-2">
          <span className="text-caption-2-medium text-text-tertiary">{t("settings.agentTools.model")}:</span>
          <select
            value={tool.selectedModel ?? tool.models[0]?.id}
            onChange={(event) => void actions.persist({ modelId: event.target.value })}
            className="rounded-lg border border-border-button-default bg-background-primary-default px-2.5 py-1 font-mono text-caption-2-medium text-text-primary shadow-2xs outline-none hover:border-border-button-hover focus:ring-1 focus:ring-accent-500"
          >
            {tool.models.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  )
}
