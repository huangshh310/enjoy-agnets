/**
 * 设置「已归档的聊天」：按项目分组，可恢复或永久删除。
 */
import { useMemo, useState } from "react"
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
        <h1 className="text-title-3-semibold text-text-primary">已归档的聊天</h1>
        {rows.length > 0 ? (
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={() => setConfirmAll(true)}
          >
            <RiDeleteBinLine className="size-3.5" />
            全部删除
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-border-button-default bg-background-secondary-default/50">
          <p className="text-body-medium text-text-tertiary">暂无已归档的聊天</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <RiSearchLine className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-foreground-icon-tertiary" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索已归档聊天"
                className="rounded-xl pl-8"
              />
            </div>
            <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
              <SelectTrigger className="w-[180px] rounded-xl">
                <SelectValue placeholder="所有项目" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">所有项目</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        title="全部删除"
        description="确定永久删除全部已归档会话？此操作不可恢复。"
        confirmLabel="全部删除"
        destructive
        onOpenChange={setConfirmAll}
        onConfirm={() => void deleteAllArchivedSessions().then(() => refresh())}
      />
      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="删除会话"
        description="确定永久删除这条会话？此操作不可恢复。"
        confirmLabel="删除"
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
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 text-body-medium font-semibold text-text-primary">
          <RiFolder6Line className="size-4 text-accent-500" />
          <span>{name}</span>
        </div>
        <span className="text-caption-2-medium text-text-tertiary">{chats.length} chat</span>
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
                {formatArchivedAt(chat.archivedAt)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                title="删除"
                className="flex size-7 items-center justify-center rounded-md text-text-tertiary hover:bg-background-secondary-hover hover:text-text-error-primary"
                onClick={() => onAskDelete(chat.id)}
              >
                <RiDeleteBinLine className="size-3.5" />
              </button>
              <Button
                variant="outline"
                size="xs"
                className="gap-1"
                onClick={() => void unarchiveSession(chat.id).then(onRefresh)}
              >
                <RiInboxUnarchiveLine className="size-3.5" />
                取消归档
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
