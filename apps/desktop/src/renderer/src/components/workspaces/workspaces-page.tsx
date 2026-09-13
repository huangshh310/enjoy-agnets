/**
 * 文件夹与工作区管理页面：展示所有已打开目录、Git 分支、关联会话与一键切换。
 */
import { useMemo, useState } from "react"
import {
  RiCheckLine,
  RiFolder6Line,
  RiFolderAddLine,
  RiFolderOpenLine,
  RiGitBranchLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SecondaryPageShell, type SecondaryNavGroup } from "@renderer/components/app-pages/secondary-page-shell"
import { useChatStore } from "@renderer/stores/chat-store"
import { openFolder, loadWorkspace } from "@renderer/hooks/use-agent-session"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import type { WorkspaceRow } from "@renderer/hooks/use-agent-session"
import type { WorkspaceItemData } from "./workspaces.types"

export function WorkspacesPage({ embed = false }: { embed?: boolean }) {
  const t = useT()
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const currentWorkspaceId = useChatStore((state) => state.workspaceId)
  const currentWorkspaceName = useChatStore((state) => state.workspaceName)
  const currentRootLabel = useChatStore((state) => state.workspaceRootLabel)
  const repositories = useChatStore((state) => state.repositories)

  const navGroups: SecondaryNavGroup[] = useMemo(
    () => [
      {
        id: "workspaces_nav",
        label: t("chat.workspaces") || "Workspaces",
        items: [
          {
            id: "all",
            label: t("pages.workspaces.list.navAll"),
            icon: RiFolder6Line
          }
        ]
      }
    ],
    [t]
  )

  const workspaceList = useMemo(() => {
    const sessionCountFor = (workspaceId: string | null) =>
      repositories.filter((row) => row.kind === "session" && row.workspaceId === workspaceId).length
    const list = [
      {
        id: currentWorkspaceId || "ws_current",
        name: currentWorkspaceName || t("common.noWorkspace"),
        path: currentRootLabel || "—",
        branch: "—",
        sessionCount: sessionCountFor(currentWorkspaceId),
        isCurrent: true,
        lastActiveAt: ""
      },
      ...repositories
        .filter((row) => row.kind === "workspace" && row.id !== currentWorkspaceId)
        .map((row) => ({
          id: row.id,
          name: row.name,
          path: row.rootPath || row.name,
          branch: "—",
          sessionCount: sessionCountFor(row.id),
          isCurrent: false,
          lastActiveAt: ""
        }))
    ] as WorkspaceItemData[]

    return list.filter(
      (ws) =>
        ws.name.toLowerCase().includes(search.toLowerCase()) ||
        ws.path.toLowerCase().includes(search.toLowerCase())
    )
  }, [currentRootLabel, currentWorkspaceId, currentWorkspaceName, repositories, search, t])

  async function handleSwitch(item: WorkspaceItemData) {
    if (item.isCurrent || !hasIde()) return
    try {
      const workspace = (await getIde().workspace.open({ path: item.path })) as WorkspaceRow
      await loadWorkspace(workspace)
    } catch {
      // ignore
    }
  }

  const body = (
      <div className="flex flex-col gap-6 max-w-5xl">
        {/* 顶部操作与快速打开 */}
        <div className="flex items-center justify-between gap-4 p-5 rounded-2xl border border-separator-border/80 bg-background-secondary-default/60 backdrop-blur-md shadow-2xs">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500 border border-accent-500/20">
              <RiFolderOpenLine className="size-6" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h2 className="text-title-3-semibold text-text-primary">{t("pages.workspaces.list.pageTitle")}</h2>
                <span className="rounded-full bg-state-success-text/10 text-state-success-text border border-state-success-text/20 px-2 py-0.2 text-[11px] font-mono font-semibold">
                  {t("pages.workspaces.list.activeBadge")}
                </span>
              </div>
              <p className="font-mono text-caption-1-regular text-text-tertiary truncate max-w-xl">
                {t("pages.workspaces.list.currentMount")}
                <span className="text-text-primary font-medium">{currentRootLabel}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={() => void openFolder()} className="h-9 gap-1.5 text-caption-1-medium">
              <RiFolderAddLine className="size-4" />
              <span>{t("pages.workspaces.list.openFolder")}</span>
            </Button>
          </div>
        </div>

        {/* 搜索与过滤 */}
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-sm">
            <Input
              placeholder={t("pages.workspaces.list.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 font-sans text-caption-1-regular"
            />
          </div>
        </div>

        {/* 工作区项目表格 */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-separator-border/80 bg-background-primary-default shadow-2xs">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-separator-border/70 bg-background-secondary-default/50 text-text-tertiary font-medium">
                  <th className="py-2.5 px-4">{t("pages.workspaces.list.colName")}</th>
                  <th className="py-2.5 px-4">{t("pages.workspaces.list.colPath")}</th>
                  <th className="py-2.5 px-4">{t("pages.workspaces.list.colBranch")}</th>
                  <th className="py-2.5 px-4">{t("pages.workspaces.list.colSessions")}</th>
                  <th className="py-2.5 px-4 text-right">{t("pages.workspaces.list.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-separator-border/50 font-sans">
                {workspaceList.map((item) => (
                  <tr key={item.id} className="hover:bg-background-secondary-hover/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <RiFolder6Line className="size-4 text-accent-500 shrink-0" />
                        <span className="font-semibold text-text-primary">{item.name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-caption-2-regular text-text-tertiary truncate max-w-xs">
                      {item.path}
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-mono text-caption-2-medium text-text-secondary bg-background-secondary-default px-2 py-0.5 rounded-md border border-separator-border/60">
                        <RiGitBranchLine className="size-3 text-text-tertiary" />
                        {item.branch}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-mono tabular-nums text-text-secondary">
                      {t("pages.workspaces.list.sessionCount", { n: item.sessionCount })}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {item.isCurrent ? (
                        <span className="inline-flex items-center gap-1 text-state-success-text text-caption-2-medium font-semibold">
                          <RiCheckLine className="size-3.5" />
                          {t("pages.workspaces.list.currentActive")}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleSwitch(item)}
                          className="px-2.5 py-1 text-caption-2-medium font-medium text-accent-600 hover:bg-accent-500/10 rounded-md transition-colors"
                        >
                          {t("pages.workspaces.list.switchTo")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  )

  if (embed) return body

  return (
    <SecondaryPageShell
      searchPlaceholder={t("pages.workspaces.list.shellSearchPlaceholder")}
      groups={navGroups}
      selectedId={filter}
      onSelect={setFilter}
      contentWidth="stage"
      breadcrumbTitle={t("pages.workspaces.list.crumbTitle")}
    >
      {body}
    </SecondaryPageShell>
  )
}
