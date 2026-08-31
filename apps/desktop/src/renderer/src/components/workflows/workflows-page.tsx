/**
 * Workflow 列表：新建、步骤、暂停 / 恢复 / 重试 / 取消。
 */
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RiRouteLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { WorkflowRun } from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { WorkflowDag } from "@renderer/components/workflows/workflow-dag"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"

export function WorkflowsPage() {
  const queryClient = useQueryClient()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const sessionId = useChatStore((state) => state.sessionId)
  const [chain, setChain] = useState("plan>act>verify")
  const runsQuery = useQuery({
    queryKey: ["workflows", workspaceId],
    enabled: hasIde(),
    queryFn: () => getIde().workflow.list({ workspaceId: workspaceId ?? undefined }) as Promise<WorkflowRun[]>
  })
  const runs = runsQuery.data ?? []
  const groups = useMemo(
    () => [
      {
        id: "runs",
        label: "Runs",
        items: [{ id: "all", label: "All workflows", icon: RiRouteLine, meta: String(runs.length) }]
      }
    ],
    [runs.length]
  )

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["workflows"] })
  }

  async function start() {
    if (!sessionId) return
    const steps = stepsFromChain(chain)
    const created = (await getIde().workflow.start({
      sessionId,
      workspaceId: workspaceId ?? undefined,
      title: steps.map((step) => step.label).join(" → ") || "Plan → Act → Verify",
      steps
    })) as WorkflowRun
    await getIde().workflow.resume(created.id)
    await refresh()
  }

  async function act(kind: "resume" | "cancel" | "retry", runId: string) {
    await getIde().workflow[kind](runId)
    await refresh()
  }

  return (
    <SecondaryPageShell groups={groups} selectedId="all" onSelect={() => undefined} contentWidth="wide">
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 data-testid="page-workflows" className="text-title-3-semibold text-text-primary">
              Workflows
            </h1>
            <p className="mt-1 text-body-medium text-text-secondary">
              Durable runs pause on quit and resume from the last checkpoint.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Input
              value={chain}
              onChange={(event) => setChain(event.target.value)}
              placeholder="plan>act>verify"
            />
            <Button size="sm" data-testid="workflow-start" onClick={() => void start()} disabled={!sessionId}>
              Start workflow
            </Button>
          </div>
        </div>
        <ul className="divide-y divide-separator-border rounded-2xl border border-border-button-default">
          {runs.map((run) => (
            <li key={run.id} className="flex flex-col gap-2 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-body-medium text-text-primary">{run.title}</p>
                  <p className="text-body-medium text-text-tertiary">
                    {run.status} · {run.id}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void act("resume", run.id)}>
                    Resume
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void act("retry", run.id)}>
                    Retry
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void act("cancel", run.id)}>
                    Cancel
                  </Button>
                </div>
              </div>
              {run.steps.length > 0 ? <WorkflowDag steps={run.steps} /> : null}
            </li>
          ))}
          {runs.length === 0 ? (
            <li className="px-4 py-6 text-body-medium text-text-secondary">No workflow runs yet.</li>
          ) : null}
        </ul>
      </div>
    </SecondaryPageShell>
  )
}

function stepsFromChain(raw: string) {
  const ids = raw.split(/[>,]/).map((item) => item.trim()).filter(Boolean)
  return ids.map((id, index) => ({
    id,
    label: id,
    dependsOn: index === 0 ? [] : [ids[index - 1] as string]
  }))
}
