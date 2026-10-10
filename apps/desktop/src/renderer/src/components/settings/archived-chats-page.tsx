/**
 * 设置「已归档的聊天」：按项目分组，可恢复或永久删除。
 */
import { useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RiDeleteBinLine, RiFolder6Line, RiInboxUnarchiveLine, RiSearchLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { cx } from "@/utils/cx"
import { dateLocale, useI18n, useT } from "@renderer/i18n"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import {
  deleteAllArchivedSessions,
  deleteArchivedSession,
  unarchiveSession
} from "@renderer/hooks/workspace-lifecycle"
import { getIde, hasIde } from "@renderer/lib/ide"
import {
  filterArchivedChats,
  formatArchivedAt,
  groupArchivedByWorkspace,
  type ArchivedChatRow
} from "./archived-chats"

export function ArchivedChatsPage() {
  const t = useT()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState("")
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("all")
  const [confirmAll, setConfirmAll] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const listQuery = useQuery({
    queryKey: ["archived-sessions"],
    enabled: hasIde(),
    queryFn: () => getIde().session.listArchived() as Promise<ArchivedChatRow[]>
  })
  const rows = listQuery.data ?? []
  const filtered = useMemo(
    () => filterArchivedChats(rows, query, workspaceFilter),
    [query, rows, workspaceFilter]
  )
  const groups = useMemo(() => groupArchivedByWorkspace(filtered), [filtered])
  const projects = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of rows) map.set(row.workspaceId, row.workspaceName)
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [rows])

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["archived-sessions"] })
    await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-3">
          <h1 className="text-title-3-semibold text-text-primary">{t("nav.archived")}</h1>
          <button
            type="button"
            data-testid="archived-back-to-chat"
            className="text-caption-1-medium text-text-secondary hover:text-text-primary"
            onClick={() => void navigate({ to: "/" })}
          >
            {t("settings.archived.backToChat")}
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-border-button-default bg-background-secondary-default/50">
          <p className="text-body-medium text-text-tertiary">{t("settings.archived.empty")}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <RiSearchLine className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-foreground-icon-tertiary" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("settings.archived.search")}
                className="rounded-xl pl-8"
              />
            </div>
            <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
              <SelectTrigger className="w-[180px] rounded-xl">
                <SelectValue placeholder={t("settings.archived.allProjects")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("settings.archived.allProjects")}</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              size="sm"
              className="ml-auto gap-1.5"
              data-testid="delete-all-archived"
              onClick={() => setConfirmAll(true)}
            >
              <RiDeleteBinLine className="size-3.5" />
              {t("settings.archived.deleteAll")}
            </Button>
          </div>

          <div className="flex flex-col gap-5">
            {groups.map((group) => (
              <ArchivedGroup
                key={group.workspaceId}
                name={group.workspaceName}
                chats={group.chats}
                onRefresh={() => void refresh()}
                onAskDelete={(id) => setPendingDeleteId(id)}
              />
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmAll}
        title={t("settings.archived.deleteAll")}
        description={t("settings.archived.deleteAllConfirm", { count: rows.length })}
        confirmLabel={t("settings.archived.deleteAll")}
        destructive
        onOpenChange={setConfirmAll}
        onConfirm={() => void deleteAllArchivedSessions().then(() => refresh())}
      />
      <ConfirmDialog
        open={pendingDeleteId !== null}
        title={t("settings.archived.deleteSession")}
        description={t("settings.archived.deleteConfirm")}
        confirmLabel={t("common.delete")}
        destructive
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null)
        }}
        onConfirm={() => {
          if (!pendingDeleteId) return
          void deleteArchivedSession(pendingDeleteId).then(() => refresh())
        }}
      />
    </div>
  )
}

function ArchivedGroup({
  name,
  chats,
  onRefresh,
  onAskDelete
}: {
  name: string
  chats: ArchivedChatRow[]
  onRefresh: () => void
  onAskDelete: (id: string) => void
}) {
  const t = useT()
  const { locale } = useI18n()
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-body-medium font-semibold text-text-primary">
          <RiFolder6Line className="size-4 text-accent-500" />
          <span>{name}</span>
        </div>
        <span className="text-caption-2-medium text-text-tertiary">
          {t("settings.archived.chatCount", { count: chats.length })}
        </span>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border-button-default">
        {chats.map((chat, index) => (
          <div
            key={chat.id}
            className={cx(
              "flex items-center justify-between gap-3 px-3 py-2.5",
              index > 0 && "border-t border-separator-border/60"
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-body-medium text-text-primary">{chat.title}</p>
              <p className="text-caption-2-medium text-text-tertiary">
                {formatArchivedAt(chat.archivedAt, dateLocale(locale))}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                title={t("common.delete")}
                data-testid="archived-row-delete"
                className="flex size-7 items-center justify-center rounded-md text-text-tertiary hover:bg-background-secondary-hover hover:text-text-error-primary"
                onClick={() => onAskDelete(chat.id)}
              >
                <RiDeleteBinLine className="size-3.5" />
              </button>
              <Button
                variant="outline"
                size="xs"
                className="gap-1"
                data-testid="archived-row-restore"
                onClick={() => void unarchiveSession(chat.id).then(() => onRefresh())}
              >
                <RiInboxUnarchiveLine className="size-3.5" />
                {t("settings.archived.unarchive")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
