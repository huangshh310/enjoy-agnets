/**
 * 底栏项目选择：已打开的工作区 + 添加项目。对标 Synara ProjectPicker。
 */
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RiAddLine, RiCheckLine, RiFolder6Line, RiSearchLine } from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getIde, hasIde } from "@renderer/lib/ide"
import { loadWorkspace, openFolder } from "@renderer/hooks/use-agent-session"
import type { WorkspaceRow } from "@renderer/hooks/workspace-row"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function StatusProjectPicker({ workspaceRootLabel }: { workspaceRootLabel: string }) {
  const t = useT()
  const queryClient = useQueryClient()
  const currentId = useChatStore((state) => state.workspaceId)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    enabled: hasIde() && open,
    queryFn: () => getIde().workspace.list() as Promise<WorkspaceRow[]>
  })
  const rows = useMemo(() => {
    const all = workspacesQuery.data ?? []
    const needle = query.trim().toLowerCase()
    if (!needle) return all
    return all.filter(
      (row) =>
        row.name.toLowerCase().includes(needle) || row.rootPath.toLowerCase().includes(needle)
    )
  }, [workspacesQuery.data, query])

  async function pickExisting(row: WorkspaceRow) {
    setOpen(false)
    await loadWorkspace(row)
    await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
  }

  async function pickNew() {
    setOpen(false)
    await openFolder()
    await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          title={t("chat.searchProjects")}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 hover:bg-background-secondary-hover hover:text-text-primary"
        >
          <RiFolder6Line className="size-3.5" aria-hidden />
          {workspaceRootLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        className="w-72 overflow-hidden rounded-xl border border-border-button-default bg-background-primary-default p-0 shadow-dropdown"
      >
        <label className="flex items-center gap-2 border-b border-separator-border/70 px-3 py-2">
          <RiSearchLine className="size-3.5 shrink-0 text-text-secondary" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("chat.searchProjects")}
            className="h-6 w-full bg-transparent text-caption-1-medium text-text-primary outline-hidden placeholder:text-text-secondary"
          />
        </label>
        <p className="px-3 pt-2 pb-1 text-caption-2-regular text-text-secondary">
          {t("chat.projectPickerGroup")}
        </p>
        <ul className="max-h-56 overflow-y-auto py-1">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => void pickExisting(row)}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-caption-1-medium hover:bg-background-secondary-hover"
              >
                <RiFolder6Line className="size-3.5 shrink-0 text-text-secondary" />
                <span className="min-w-0 flex-1 truncate text-text-primary">{row.name}</span>
                {row.id === currentId ? (
                  <RiCheckLine className="size-3.5 shrink-0 text-state-success-text" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => void pickNew()}
          className="flex w-full cursor-pointer items-center gap-2 border-t border-separator-border/70 px-3 py-2 text-left text-caption-1-medium text-text-primary hover:bg-background-secondary-hover"
        >
          <RiAddLine className="size-3.5 shrink-0" />
          {t("chat.pickerAddProject")}
        </button>
      </PopoverContent>
    </Popover>
  )
}
