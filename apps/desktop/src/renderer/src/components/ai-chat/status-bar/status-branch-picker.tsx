/**
 * 底栏分支选择：列本地 heads 并 switch。脏工作树拒绝。
 */
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RiCheckLine, RiGitBranchLine, RiSearchLine } from "@remixicon/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { GitBranchesResult, GitSwitchResult } from "@enjoy-agents/ipc-contract"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function StatusBranchPicker() {
  const t = useT()
  const queryClient = useQueryClient()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const branchesQuery = useQuery({
    queryKey: ["git-branches", workspaceId],
    enabled: hasIde() && Boolean(workspaceId),
    queryFn: () =>
      getIde().workspace.gitBranches({ workspaceId }) as Promise<GitBranchesResult>
  })
  const current = branchesQuery.data?.current?.trim() || ""
  const rows = useMemo(() => {
    const all = branchesQuery.data?.branches ?? []
    const needle = query.trim().toLowerCase()
    if (!needle) return all
    return all.filter((row) => row.name.toLowerCase().includes(needle))
  }, [branchesQuery.data, query])

  async function pick(name: string) {
    if (!workspaceId || name === current) {
      setOpen(false)
      return
    }
    const result = (await getIde().workspace.gitSwitch({ workspaceId, name })) as GitSwitchResult
    if (!result.ok) {
      setError(
        result.code === "GIT_SWITCH_DIRTY" ? t("chat.gitSwitchDirty") : t("chat.gitSwitchFailed")
      )
      return
    }
    setError(null)
    setOpen(false)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["git-branches", workspaceId] }),
      queryClient.invalidateQueries({ queryKey: ["workspace-git-log", workspaceId] }),
      queryClient.invalidateQueries({ queryKey: ["changes", workspaceId] })
    ])
  }

  const label = current || t("chat.gitNoBranch")

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) {
          setQuery("")
          setError(null)
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          title={t("chat.switchBranch")}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 hover:bg-background-secondary-hover hover:text-text-primary"
        >
          <RiGitBranchLine className="size-3.5" aria-hidden />
          {label}
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
            placeholder={t("chat.searchBranches")}
            className="h-6 w-full bg-transparent text-caption-1-medium text-text-primary outline-hidden placeholder:text-text-secondary"
          />
        </label>
        {error ? (
          <p className="px-3 py-2 text-caption-2-regular text-status-yellow-text">{error}</p>
        ) : null}
        <ul className="max-h-56 overflow-y-auto py-1">
          {rows.map((row) => (
            <li key={row.name}>
              <button
                type="button"
                onClick={() => void pick(row.name)}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-caption-1-medium hover:bg-background-secondary-hover"
              >
                <RiGitBranchLine className="size-3.5 shrink-0 text-text-secondary" />
                <span className="min-w-0 flex-1 truncate font-mono text-text-primary">{row.name}</span>
                {row.current ? (
                  <RiCheckLine className="size-3.5 shrink-0 text-state-success-text" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
