/**
 * 宿主扩展与能力挂载看板：
 * 呈现当前助手自动继承的 MCP 外部工具与专业技能，直通扩展中心。
 * 原生插件命令收纳于高级折叠面板，普通用户无需碰终端。
 */
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import {
  RiApps2Line,
  RiArrowDownSLine,
  RiArrowRightUpLine,
  RiFileCopyLine,
  RiFlashlightLine,
  RiServerLine
} from "@remixicon/react"
import type { AgentToolPublic, McpServer } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"

export function NativePluginCopy({
  tool,
  onClose,
  onGoToStore
}: {
  tool: AgentToolPublic
  onClose?: () => void
  onGoToStore?: () => void
}) {
  const t = useT()
  const navigate = useNavigate()
  const command = tool.nativePluginCopy?.trim()
  const [copied, setCopied] = useState(false)

  const mcpQuery = useQuery({
    queryKey: ["mcp"],
    enabled: hasIde(),
    queryFn: () => getIde().mcp.servers() as Promise<McpServer[]>
  })

  const skillsQuery = useQuery({
    queryKey: ["skills", "list"],
    enabled: hasIde(),
    queryFn: () => getIde().skills.list() as Promise<unknown[]>
  })

  const readyMcpCount = mcpQuery.data?.filter((s) => s.trusted).length ?? 0
  const skillCount = skillsQuery.data?.length ?? 0

  function copy() {
    if (!command) return
    void navigator.clipboard.writeText(command).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }

  function handleGoToHub() {
    if (onGoToStore) {
      onGoToStore()
      return
    }
    onClose?.()
    void navigate({
      to: "/settings/$section",
      params: { section: "extensions" }
    })
  }

  return (
    <div className="rounded-xl border border-border-button-default/80 bg-background-secondary-default/30 p-3.5">
      {/* 顶栏：标题 + 状态小标 + 直通扩展中心链接 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-accent-primary-subtle text-accent-primary">
            <RiApps2Line className="size-3.5" />
          </div>
          <span className="truncate text-caption-1-medium text-text-primary">
            {t("settings.agentTools.hostExtensionsTitle")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border-card/60 bg-background-primary-default px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
            <span className="size-1.5 rounded-full bg-status-success-default" />
            {t("settings.agentTools.hostExtensionsBadge")}
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoToHub}
          className="inline-flex shrink-0 items-center gap-1 text-caption-2-medium text-accent-primary transition-colors hover:text-accent-primary/80"
        >
          <span>{t("settings.agentTools.hostExtensionsGoToHubShort")}</span>
          <RiArrowRightUpLine className="size-3.5" />
        </button>
      </div>

      {/* 核心指标统计药丸 */}
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-border-button-default/60 bg-background-primary-default/60 px-2.5 py-1.5">
          <RiServerLine className="size-3.5 shrink-0 text-signal-blue" />
          <span className="truncate text-caption-2-medium text-text-secondary">
            {readyMcpCount > 0
              ? t("settings.agentTools.hostExtensionsMcpCount", { n: readyMcpCount })
              : t("settings.agentTools.hostExtensionsMcpEmpty")}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border-button-default/60 bg-background-primary-default/60 px-2.5 py-1.5">
          <RiFlashlightLine className="size-3.5 shrink-0 text-accent-primary" />
          <span className="truncate text-caption-2-medium text-text-secondary">
            {skillCount > 0
              ? t("settings.agentTools.hostExtensionsSkillCount", { n: skillCount })
              : t("settings.agentTools.hostExtensionsSkillEmpty")}
          </span>
        </div>
      </div>

      {/* 高级选项：助手专有原生调试命令（仅在存在时显示，默认折叠，极简收纳） */}
      {command ? (
        <details className="group mt-2.5 border-t border-separator-border/60 pt-2">
          <summary className="flex cursor-pointer select-none items-center justify-between text-[11px] text-text-tertiary transition-colors hover:text-text-secondary">
            <span>{t("settings.agentTools.nativePluginAdvancedToggle")}</span>
            <RiArrowDownSLine className="size-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2 rounded-lg border border-border-button-default/40 bg-background-primary-default/70 p-2">
            <p className="text-[11px] text-text-tertiary">
              {t("settings.agentTools.nativePluginAdvancedHint")}
            </p>
            <div className="mt-1.5 flex items-center justify-between gap-2 rounded bg-background-secondary-default/60 px-2 py-1">
              <code className="truncate font-mono text-[11px] text-text-secondary select-all">
                {command}
              </code>
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-text-secondary transition-colors hover:bg-background-secondary-default hover:text-text-primary"
                onClick={copy}
              >
                <RiFileCopyLine className="size-3" />
                <span>{copied ? t("settings.agentTools.copied") : t("settings.agentTools.copyCommand")}</span>
              </button>
            </div>
          </div>
        </details>
      ) : null}
    </div>
  )
}
