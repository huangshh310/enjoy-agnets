/**
 * 工具策略格子、MCP Schema 开销与本轮调用状态。
 */
import {
  RiCheckLine,
  RiCloseLine,
  RiCommandLine,
  RiEditLine,
  RiEyeLine,
  RiLoader4Line,
  RiShieldLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import { McpIcon } from "@renderer/components/mcp/components/mcp-brand-icons.ts"
import type { McpServer, ThreadToolCall } from "@enjoy-agents/ipc-contract"
import { formatTokens } from "../../../agent-limits/agent-limits-calculator"
import { useT } from "@renderer/i18n"
import { toolRunKind } from "./thread-run-slice"
import { estimateMcpSchemaTokens } from "./context-token-estimator.ts"

export function InspectorToolsMatrix({
  turnTools,
  mcpServers = [],
  running
}: {
  turnTools: ThreadToolCall[]
  mcpServers?: McpServer[]
  running: boolean
}) {
  const t = useT()
  const connectedServers = mcpServers.filter((server) => server.connected)
  const totalMcpSchemaTokens = connectedServers.reduce(
    (sum, server) => sum + estimateMcpSchemaTokens(server),
    0
  )

  return (
    <section className="flex flex-col gap-2.5 rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-caption-1-medium font-semibold text-text-primary">
          <RiShieldLine className="size-4 text-accent-500" />
          <span>{t("chat.inspectorToolsPolicy")}</span>
        </div>
        {running ? (
          <span className="flex items-center gap-1 font-mono text-caption-2-medium text-accent-500">
            <RiLoader4Line className="size-3 animate-spin" />
            <span>{t("chat.inspectorRunning")}</span>
          </span>
        ) : null}
      </div>

      <PolicyGrid
        serverCount={connectedServers.length}
        schemaTokens={totalMcpSchemaTokens}
      />
      {connectedServers.length > 0 ? (
        <McpSchemaList servers={connectedServers} totalTokens={totalMcpSchemaTokens} />
      ) : null}
      {turnTools.length > 0 ? <TurnToolTrace tools={turnTools} /> : null}
    </section>
  )
}

function PolicyGrid({
  serverCount,
  schemaTokens
}: {
  serverCount: number
  schemaTokens: number
}) {
  const t = useT()
  const tiles = [
    {
      id: "inspect",
      icon: RiEyeLine,
      iconClass: "text-accent-500",
      title: t("chat.inspectorReadGroup"),
      policy: t("chat.inspectorPolicyFree"),
      policyClass: "text-state-success-text",
      detail: "read / list / search / git_log"
    },
    {
      id: "write",
      icon: RiEditLine,
      iconClass: "text-status-yellow-text",
      title: t("chat.inspectorWriteGroup"),
      policy: t("chat.inspectorPolicyAsk"),
      policyClass: "text-status-yellow-text",
      detail: "write_file / edit_file"
    },
    {
      id: "exec",
      icon: RiTerminalBoxLine,
      iconClass: "text-status-yellow-text",
      title: t("chat.inspectorExecGroup"),
      policy: t("chat.inspectorPolicyAsk"),
      policyClass: "text-status-yellow-text",
      detail: "bash / git_commit / git_push"
    },
    {
      id: "mcp",
      icon: McpIcon,
      iconClass: "text-accent-500",
      title: t("chat.inspectorMcpGroup"),
      policy: t("chat.inspectorPolicySandbox"),
      policyClass: "text-accent-500",
      detail:
        serverCount > 0
          ? t("chat.inspectorMcpServers", { n: serverCount, tokens: formatTokens(schemaTokens) })
          : t("chat.inspectorMcpNone")
    }
  ]

  return (
    <div className="grid grid-cols-2 gap-1.5 font-mono text-caption-2-regular">
      {tiles.map((tile) => (
        <div
          key={tile.id}
          className="flex flex-col gap-1 rounded-lg border border-separator-border/50 bg-background-secondary-default/30 p-2"
        >
          <div className="flex items-center justify-between font-medium text-text-secondary">
            <span className="flex items-center gap-1">
              <tile.icon className={`size-3 ${tile.iconClass}`} />
              <span>{tile.title}</span>
            </span>
            <span className={`text-caption-2-medium ${tile.policyClass}`}>{tile.policy}</span>
          </div>
          <div className="truncate text-caption-2-regular text-text-tertiary">{tile.detail}</div>
        </div>
      ))}
    </div>
  )
}

function McpSchemaList({
  servers,
  totalTokens
}: {
  servers: McpServer[]
  totalTokens: number
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-1 border-t border-separator-border/40 pt-2 font-mono text-caption-2-regular">
      <div className="flex items-center justify-between text-text-tertiary">
        <span className="font-semibold uppercase tracking-wider">{t("chat.inspectorMcpSchema")}</span>
        <span className="font-semibold text-status-yellow-text">~{formatTokens(totalTokens)}</span>
      </div>
      {servers.map((server) => {
        const cost = estimateMcpSchemaTokens(server)
        const toolCount = server.tools?.length ?? 0
        return (
          <div
            key={server.id}
            className="flex items-center justify-between rounded-md border border-separator-border/30 bg-background-secondary-default/20 px-2 py-1"
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="size-1.5 shrink-0 rounded-full bg-accent-500" />
              <span className="truncate text-text-secondary">{server.name}</span>
              <span className="text-caption-2-regular text-text-tertiary">
                {t("chat.inspectorMcpTools", { n: toolCount })}
              </span>
            </div>
            <span className="shrink-0 font-semibold text-text-primary">~{formatTokens(cost)}</span>
          </div>
        )
      })}
    </div>
  )
}

function TurnToolTrace({ tools }: { tools: ThreadToolCall[] }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-1 border-t border-separator-border/40 pt-2 font-mono text-caption-2-regular">
      <span className="font-semibold uppercase tracking-wider text-text-tertiary">
        {t("chat.inspectorTurnTrace", { n: tools.length })}
      </span>
      {tools.map((tool) => (
        <div
          key={tool.id}
          className="flex items-center justify-between gap-2 rounded-md border border-separator-border/40 bg-background-secondary-default/25 px-2 py-1"
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <RiCommandLine className="size-3 shrink-0 text-text-tertiary" />
            <span className="truncate font-medium text-text-primary">{tool.name}</span>
          </div>
          <ToolStatusPill kind={toolRunKind(tool.state, tool)} />
        </div>
      ))}
    </div>
  )
}

function ToolStatusPill({ kind }: { kind: ReturnType<typeof toolRunKind> }) {
  const t = useT()
  if (kind === "ok") {
    return (
      <span className="inline-flex shrink-0 items-center gap-0.5 text-caption-2-medium text-state-success-text">
        <RiCheckLine className="size-2.5" />
        <span>{t("chat.inspectorToolOk")}</span>
      </span>
    )
  }
  if (kind === "skipped" || kind === "catch_up" || kind === "restart") {
    return (
      <span className="inline-flex shrink-0 items-center gap-0.5 text-caption-2-medium text-text-tertiary">
        <span className="size-1.5 rounded-full bg-text-tertiary" />
        <span>
          {kind === "restart"
            ? t("chat.restartAbandoned")
            : kind === "catch_up"
              ? t("studio.automations.catchUpTimeout")
              : t("chat.toolStaleObservation")}
        </span>
      </span>
    )
  }
  if (kind === "stopped") {
    return (
      <span className="inline-flex shrink-0 items-center gap-0.5 text-caption-2-medium text-text-tertiary">
        <RiCloseLine className="size-2.5" />
        <span>{t("chat.toolStopped")}</span>
      </span>
    )
  }
  if (kind === "error" || kind === "denied") {
    return (
      <span className="inline-flex shrink-0 items-center gap-0.5 text-caption-2-medium text-text-error-primary">
        <RiCloseLine className="size-2.5" />
        <span>{kind === "denied" ? t("chat.inspectorToolDenied") : t("chat.inspectorToolError")}</span>
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 text-caption-2-medium text-accent-500">
      <RiLoader4Line className="size-2.5 animate-spin" />
      <span>{t("chat.inspectorToolRunning")}</span>
    </span>
  )
}
