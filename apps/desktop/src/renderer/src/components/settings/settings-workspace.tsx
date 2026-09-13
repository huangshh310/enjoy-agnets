/**
 * Settings → Workspace：工作区管理与安全沙箱边界。
 * 展示当前工作区状态、项目信息、文件扫描与忽略规则，以及路径安全隔离边界。
 */
import { useMemo, useState } from "react"
import {
  RiCheckLine,
  RiClipboardLine,
  RiFileCodeLine,
  RiFolder6Line,
  RiGitBranchLine,
  RiRefreshLine,
  RiShieldCheckLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { openFolder } from "@renderer/hooks/use-agent-session"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { SettingsCard, SettingsRow } from "./settings-row"
import { SshConnections } from "./workspace/ssh-connections"

export function WorkspaceSettings() {
  const t = useT()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const workspaceName = useChatStore((state) => state.workspaceName)
  const workspaceKind = useChatStore((state) => state.workspaceKind)
  const repositories = useChatStore((state) => state.repositories)
  const [copied, setCopied] = useState(false)

  // 找到当前工作区的节点与会话数量
  const currentWorkspaceNode = useMemo(() => {
    return repositories.find((r) => r.id === workspaceId && r.kind === "workspace")
  }, [repositories, workspaceId])

  const sessionCount = useMemo(() => {
    return repositories.filter((r) => r.kind === "session" && r.workspaceId === workspaceId).length
  }, [repositories, workspaceId])

  const rootPath = currentWorkspaceNode?.rootPath || workspaceName || t("common.noWorkspace")

  function handleCopyPath() {
    if (!rootPath) return
    navigator.clipboard.writeText(rootPath)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ─── 当前工作区核心状态看板 ───────────────────────── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10 text-accent-500">
              <RiFolder6Line className="size-6" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-body-large-semibold text-text-primary truncate">
                  {workspaceName || t("common.untitledProject")}
                </span>
                <span className="rounded-md bg-background-secondary-default px-2 py-0.5 text-[11px] font-medium text-text-tertiary shrink-0">
                  {workspaceKind === "ssh" ? t("settings.workspace.remoteFootnote") : t("settings.workspace.localBadge")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                <span className="font-mono text-caption-2-regular text-text-tertiary truncate">
                  {rootPath}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPath}
                  aria-label={t("settings.workspace.copyPath")}
                  className="text-text-tertiary hover:text-text-primary transition-colors p-0.5 cursor-pointer shrink-0"
                >
                  {copied ? <RiCheckLine className="size-3 text-emerald-500" /> : <RiClipboardLine className="size-3" />}
                </button>
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => void openFolder()}
            className="inline-flex items-center gap-1.5 cursor-pointer h-8 text-caption-2-medium shrink-0"
          >
            <RiRefreshLine className="size-3.5" />
            <span>{t("settings.workspace.switchWs")}</span>
          </Button>
        </div>

        {/* 关键统计指标 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-separator-border">
          <div className="flex flex-col rounded-xl border border-border-button-default bg-background-secondary-default/50 p-3">
            <span className="text-[11px] font-medium text-text-tertiary">{t("settings.workspace.sessions")}</span>
            <span className="text-title-3-semibold text-text-primary mt-0.5">{sessionCount}</span>
          </div>
          <div className="flex flex-col rounded-xl border border-border-button-default bg-background-secondary-default/50 p-3">
            <span className="text-[11px] font-medium text-text-tertiary">{t("settings.workspace.jail")}</span>
            <span className="text-caption-1-semibold text-emerald-600 dark:text-emerald-400 mt-1 inline-flex items-center gap-1">
              <RiShieldCheckLine className="size-3.5" />
              <span>{t("settings.workspace.strictlyJailed")}</span>
            </span>
          </div>
          <div className="flex flex-col rounded-xl border border-border-button-default bg-background-secondary-default/50 p-3">
            <span className="text-[11px] font-medium text-text-tertiary">{t("settings.workspace.gitBoundary")}</span>
            <span className="text-caption-1-semibold text-text-primary mt-1 inline-flex items-center gap-1">
              <RiGitBranchLine className="size-3.5 text-accent-500" />
              <span>{t("settings.workspace.workspaceRoot")}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ─── 远程 SSH 连接名册 ───────────────────────────── */}
      <SshConnections />

      {/* ─── 扫描与忽略规则 ─────────────────────────────── */}
      <SettingsCard title={t("settings.workspace.scanTitle")}>
        <SettingsRow title={t("settings.workspace.ignore")} description={t("settings.workspace.ignoreDesc")}>
          <div className="flex flex-wrap items-center gap-1.5 max-w-[320px] justify-end">
            {[".git", "node_modules", "dist", "out", "build", ".env*"].map((pat) => (
              <span
                key={pat}
                className="font-mono rounded-md border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-[10px] text-text-secondary"
              >
                {pat}
              </span>
            ))}
          </div>
        </SettingsRow>

        <SettingsRow title={t("settings.workspace.instructions")} description={t("settings.workspace.instructionsDesc")}>
          <span className="inline-flex items-center gap-1 rounded-full border border-accent-500/20 bg-accent-500/10 px-2.5 py-0.5 text-caption-2-medium text-accent-600 dark:text-accent-400">
            <RiFileCodeLine className="size-3" />
            <span>{t("settings.workspace.agentsActive")}</span>
          </span>
        </SettingsRow>
      </SettingsCard>

      {/* ─── 安全与沙箱边界 ─────────────────────────────── */}
      <SettingsCard title={t("settings.workspace.securityTitle")}>
        <div className="flex flex-col gap-2 p-3 rounded-xl border border-border-button-default bg-background-secondary-default/40">
          <div className="flex items-center gap-2 text-caption-1-semibold text-text-primary">
            <RiShieldCheckLine className="size-4 text-emerald-500" />
            <span>{t("settings.workspace.jailTitle")}</span>
          </div>
          <p className="text-caption-2-regular text-text-tertiary leading-relaxed">{t("settings.workspace.jailBody")}</p>
        </div>
      </SettingsCard>
    </div>
  )
}
