/**
 * Settings → 项目：路径、隔离执行、远程连接走默认面；
 * 路径穿越 / 多子项目等放进默认收起的「高级」。
 */
import { useMemo, useState } from "react"
import {
  RiCheckLine,
  RiClipboardLine,
  RiFolder6Line,
  RiGitBranchLine,
  RiRefreshLine,
  RiShieldCheckLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { openFolder } from "@renderer/hooks/use-agent-session"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { WorkspaceExclusionsCard } from "./workspace/workspace-exclusions-card"
import { SettingsCard, SettingsRow } from "./settings-row"
import { SshConnections } from "./workspace/ssh-connections"

export function WorkspaceSettings() {
  const t = useT()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const workspaceName = useChatStore((state) => state.workspaceName)
  const workspaceKind = useChatStore((state) => state.workspaceKind)
  const repositories = useChatStore((state) => state.repositories)
  const [copied, setCopied] = useState(false)

  const currentWorkspaceNode = useMemo(() => {
    return repositories.find((row) => row.id === workspaceId && row.kind === "workspace")
  }, [repositories, workspaceId])

  const sessionCount = useMemo(() => {
    return repositories.filter((row) => row.kind === "session" && row.workspaceId === workspaceId).length
  }, [repositories, workspaceId])

  const rootPath = currentWorkspaceNode?.rootPath || workspaceName || t("settings.workspace.noProject")

  function handleCopyPath() {
    if (!rootPath) return
    void navigator.clipboard.writeText(rootPath)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div data-testid="page-workspace" className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-accent-500/20 bg-accent-500/10 text-accent-500">
              <RiFolder6Line className="size-6" />
            </div>
            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-2">
                <span className="truncate text-title-3-semibold text-text-primary">
                  {workspaceName || t("common.untitledProject")}
                </span>
                <span className="shrink-0 rounded-md bg-background-secondary-default px-2 py-0.5 text-caption-2-medium font-medium text-text-tertiary">
                  {workspaceKind === "ssh" ? t("settings.workspace.remoteFootnote") : t("settings.workspace.localBadge")}
                </span>
              </div>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                <span className="truncate font-mono text-caption-2-regular text-text-tertiary">{rootPath}</span>
                <button
                  type="button"
                  onClick={handleCopyPath}
                  aria-label={t("settings.workspace.copyPath")}
                  className="shrink-0 cursor-pointer p-0.5 text-text-tertiary transition-colors hover:text-text-primary"
                >
                  {copied ? <RiCheckLine className="size-3 text-state-success-text" /> : <RiClipboardLine className="size-3" />}
                </button>
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => void openFolder()}
            className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 text-caption-2-medium"
          >
            <RiRefreshLine className="size-3.5" />
            <span>{t("settings.workspace.switchWs")}</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 border-t border-separator-border pt-3 sm:grid-cols-3">
          <div className="flex flex-col rounded-xl border border-border-button-default bg-background-secondary-default/50 p-3">
            <span className="text-caption-2-medium font-medium text-text-tertiary">{t("settings.workspace.sessions")}</span>
            <span className="mt-0.5 text-title-3-semibold text-text-primary">{sessionCount}</span>
          </div>
          <div className="flex flex-col rounded-xl border border-border-button-default bg-background-secondary-default/50 p-3">
            <span className="text-caption-2-medium font-medium text-text-tertiary">{t("settings.workspace.jail")}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-caption-1-semibold text-state-success-text">
              <RiShieldCheckLine className="size-3.5 shrink-0" />
              <span>{t("settings.workspace.strictlyJailed")}</span>
            </span>
          </div>
          <div className="flex flex-col rounded-xl border border-border-button-default bg-background-secondary-default/50 p-3">
            <span className="text-caption-2-medium font-medium text-text-tertiary">{t("settings.workspace.gitBoundary")}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-caption-1-semibold text-text-primary">
              <RiGitBranchLine className="size-3.5 text-accent-500" />
              <span>
                {workspaceKind === "ssh" ? t("settings.workspace.remoteFootnote") : t("settings.workspace.workspaceRoot")}
              </span>
            </span>
          </div>
        </div>
      </div>

      <SshConnections />

      <details className="group rounded-2xl border border-border-button-default bg-background-primary-default">
        <summary className="cursor-pointer list-none px-5 py-4 text-body-medium text-text-primary">
          {t("settings.workspace.advanced")}
        </summary>
        <div className="flex flex-col gap-4 border-t border-separator-border px-5 pb-5 pt-4">
          <SettingsCard>
            <SettingsRow
              title={t("settings.workspace.allowOutside")}
              description={t("settings.workspace.allowOutsideDesc")}
            >
              <span className="text-caption-2-medium text-text-tertiary">{t("common.off")}</span>
            </SettingsRow>
            <SettingsRow title={t("settings.workspace.monorepo")} description={t("settings.workspace.monorepoDesc")}>
              <span className="text-caption-2-medium text-text-tertiary">
                {workspaceLooksLikeMonorepo(repositories) ? t("common.yes") : t("common.no")}
              </span>
            </SettingsRow>
          </SettingsCard>
          <WorkspaceExclusionsCard workspaceId={workspaceId} />
        </div>
      </details>
    </div>
  )
}

/** 本版没有 monorepo 偏好，也没有子项目探测。未识别就是否，不要写「高级」。 */
export function workspaceLooksLikeMonorepo(_repositories: Array<{ kind: string }>): boolean {
  return false
}
