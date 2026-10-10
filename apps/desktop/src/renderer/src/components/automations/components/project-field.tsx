/**
 * 自动化跑在哪个项目：只高亮当前一项，命名走「项目」。
 */
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RiCheckLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { loadWorkspace } from "@renderer/hooks/use-agent-session"
import type { WorkspaceRow } from "@renderer/hooks/workspace-row"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"

export function AutomationProjectField() {
  const t = useT()
  const queryClient = useQueryClient()
  const currentId = useChatStore((state) => state.workspaceId)
  const currentName = useChatStore((state) => state.workspaceName)
  const query = useQuery({
    queryKey: ["workspaces"],
    enabled: hasIde(),
    queryFn: () => getIde().workspace.list() as Promise<WorkspaceRow[]>
  })
  const rows = uniqueWorkspaces(query.data ?? [])

  async function pick(row: WorkspaceRow) {
    if (row.id === currentId) return
    await loadWorkspace(row)
    await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
  }

  return (
    <div data-testid="automation-project-picker">
      <p className="text-caption-1-medium text-text-secondary">{t("studio.automations.projectLabel")}</p>
      <p className="mt-0.5 text-caption-2-regular text-text-secondary">
        {currentName || t("studio.automations.projectEmpty")}
      </p>
      <ul className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-separator-border">
        {rows.map((row) => {
          const selected = row.id === currentId
          return (
            <li key={row.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => void pick(row)}
                className={cx(
                  "flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-caption-1-medium",
                  selected
                    ? "bg-background-secondary-default text-text-primary"
                    : "text-text-secondary hover:bg-background-secondary-hover"
                )}
              >
                <span className="min-w-0 flex-1 truncate">{row.name}</span>
                {selected ? <RiCheckLine className="size-3.5 shrink-0 text-text-secondary" /> : null}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function uniqueWorkspaces(rows: WorkspaceRow[]): WorkspaceRow[] {
  const seen = new Set<string>()
  return rows.filter((row) => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })
}
