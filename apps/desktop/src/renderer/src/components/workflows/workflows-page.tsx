/**
 * Workflow 列表：新建、预设管道、步骤 DAG、暂停 / 恢复 / 重试 / 取消。
 */
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RiRouteLine } from "@remixicon/react"
import type { WorkflowRun } from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { WorkflowPipelineBuilder } from "./components/pipeline-builder"
import { WorkflowRecipesGrid } from "./components/recipes-grid"
import { WorkflowRunList } from "./components/run-list"
import { stepsFromChain } from "./lib/steps-from-chain"

export function WorkflowsPage() {
  const t = useT()
  const queryClient = useQueryClient()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const sessionId = useChatStore((state) => state.sessionId)
  const [chain, setChain] = useState("plan>act>verify")
  const [isStarting, setIsStarting] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const runsQuery = useQuery({
    queryKey: ["workflows", workspaceId],
    enabled: hasIde(),
    queryFn: () =>
      getIde().workflow.list({ workspaceId: workspaceId ?? undefined }) as Promise<WorkflowRun[]>,
    refetchInterval: (query) => {
      const data = query.state.data as WorkflowRun[] | undefined
      return data?.some((r) => r.status === "running") ? 1500 : false
    }
  })
  const runs = runsQuery.data ?? []

  const groups = useMemo(
    () => [
      {
        id: "runs",
        label: t("pages.workflows.navGroup"),
        items: [
          { id: "all", label: t("pages.workflows.navAll"), icon: RiRouteLine, meta: String(runs.length) }
        ]
      }
    ],
    [runs.length, t]
  )

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["workflows"] })
  }

  async function start(customChain?: string) {
    const targetChain = customChain ?? chain
    if (!sessionId || isStarting || !targetChain.trim()) return
    setIsStarting(true)
    try {
      const steps = stepsFromChain(targetChain)
      const created = (await getIde().workflow.start({
        sessionId,
        workspaceId: workspaceId ?? undefined,
        title: steps.map((step) => step.label).join(" → ") || t("pages.workflows.defaultTitle"),
        steps
      })) as WorkflowRun
      await getIde().workflow.resume(created.id)
      await refresh()
    } finally {
      setIsStarting(false)
    }
  }

  async function act(kind: "resume" | "cancel" | "retry", runId: string) {
    await getIde().workflow[kind](runId)
    await refresh()
  }

  function handleCopyRunId(id: string) {
    void navigator.clipboard.writeText(id)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <SecondaryPageShell
      searchPlaceholder={t("pages.workflows.filterPlaceholder")}
      groups={groups}
      selectedId="all"
      onSelect={() => undefined}
      contentWidth="wide"
      hideChrome
    >
      <div className="flex min-h-0 flex-1 flex-col gap-7">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-500 shadow-xs ring-1 ring-accent-500/20">
              <RiRouteLine className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 data-testid="page-workflows" className="text-title-3-semibold text-text-primary">
                  {t("pages.workflows.title")}
                </h1>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {t("pages.workflows.checkpoints")}
                </span>
              </div>
              <p className="mt-0.5 text-caption-1-medium text-text-secondary">
                {t("pages.workflows.subtitle")}
              </p>
            </div>
          </div>
        </header>

        <WorkflowRecipesGrid
          sessionId={sessionId}
          isStarting={isStarting}
          onRun={(next) => {
            setChain(next)
            void start(next)
          }}
        />
        <WorkflowPipelineBuilder
          chain={chain}
          onChainChange={setChain}
          sessionId={sessionId}
          isStarting={isStarting}
          onStart={() => void start()}
        />
        <WorkflowRunList runs={runs} copiedId={copiedId} onCopyId={handleCopyRunId} onAct={(kind, id) => void act(kind, id)} />
      </div>
    </SecondaryPageShell>
  )
}
