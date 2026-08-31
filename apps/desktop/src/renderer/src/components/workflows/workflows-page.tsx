/**
 * Workflow 列表：新建、预设管道、步骤 DAG 可视化、暂停 / 恢复 / 重试 / 取消。
 */
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  RiArrowRightLine,
  RiCheckLine,
  RiClipboardLine,
  RiCloseLine,
  RiGitCommitLine,
  RiLoader4Line,
  RiPauseCircleLine,
  RiPlayCircleLine,
  RiPlayLine,
  RiRestartLine,
  RiRouteLine,
  RiSparklingLine,
  RiStopCircleLine,
  RiTimeLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { WorkflowRun, WorkflowStatus } from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { WorkflowDag } from "@renderer/components/workflows/workflow-dag"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"

const WORKFLOW_RECIPES = [
  {
    id: "plan-act-verify",
    title: "Plan → Act → Verify",
    subtitle: "全自动规划、实现与验证闭环",
    category: "Full Cycle Dev",
    description: "Multi-step autonomous workflow: first writes a structural plan, makes precise code modifications, and validates with automated test suites.",
    chain: "plan>act>verify",
    steps: ["Plan", "Act", "Verify"]
  },
  {
    id: "explore-refactor-test",
    title: "Explore → Refactor → Test",
    subtitle: "代码架构探索与安全重构",
    category: "Architecture & Refactor",
    description: "Deep codebase research followed by systematic refactoring and automated regression verification.",
    chain: "explore>refactor>test",
    steps: ["Explore", "Refactor", "Test"]
  },
  {
    id: "audit-fix-review",
    title: "Audit → Fix → Review",
    subtitle: "安全隐患巡检与缺陷修复",
    category: "Security & BugFix",
    description: "Scan code for potential runtime vulnerabilities, generate targeted fixes, and perform human-in-the-loop review.",
    chain: "audit>fix>review",
    steps: ["Audit", "Fix", "Review"]
  },
  {
    id: "analyze-patch-verify",
    title: "Analyze → Patch → Verify",
    subtitle: "针对性诊断与热补丁交付",
    category: "Diagnostic & Patch",
    description: "Analyze error logs or issue descriptions, synthesize minimal diff patch, and verify against target workspace.",
    chain: "analyze>patch>verify",
    steps: ["Analyze", "Patch", "Verify"]
  }
]

export function WorkflowsPage() {
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

  const previewSteps = useMemo(() => stepsFromChain(chain), [chain])

  const groups = useMemo(
    () => [
      {
        id: "runs",
        label: "Durable Runs",
        items: [
          {
            id: "all",
            label: "All workflows",
            icon: RiRouteLine,
            meta: String(runs.length)
          }
        ]
      }
    ],
    [runs.length]
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
        title: steps.map((step) => step.label).join(" → ") || "Plan → Act → Verify",
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
      searchPlaceholder="Filter workflows..."
      groups={groups}
      selectedId="all"
      onSelect={() => undefined}
      contentWidth="wide"
    >
      <div className="flex flex-col gap-7">
        {/* Header */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-500 shadow-xs ring-1 ring-accent-500/20">
              <RiRouteLine className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 data-testid="page-workflows" className="text-title-3-semibold text-text-primary">
                  Durable Workflows & Pipelines
                </h1>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Durable Checkpoints
                </span>
              </div>
              <p className="mt-0.5 text-caption-1-medium text-text-secondary">
                Multi-step autonomous execution with durable SQLite checkpoints. Supports pause, step-by-step resume, failure retry, and recovery after application restart.
              </p>
            </div>
          </div>
        </header>

        {/* Featured Workflow Recipes Showcase */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-5 items-center justify-center rounded-md bg-accent-500/10 text-accent-500">
                <RiSparklingLine className="size-3.5" />
              </div>
              <h3 className="text-body-medium font-semibold text-text-primary">
                Pre-built Workflow Recipes · 经典自主流程模版
              </h3>
            </div>
            <span className="text-caption-2-medium text-text-tertiary">
              1-click autonomous execution
            </span>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            {WORKFLOW_RECIPES.map((recipe) => (
              <div
                key={recipe.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-4.5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-body-medium font-semibold text-text-primary group-hover:text-accent-500 transition-colors">
                          {recipe.title}
                        </h4>
                      </div>
                      <p className="text-[11px] font-medium text-accent-600 dark:text-accent-400 mt-0.5">
                        {recipe.subtitle}
                      </p>
                    </div>

                    <span className="rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                      {recipe.category}
                    </span>
                  </div>

                  <p className="mt-2 text-[12px] text-text-secondary leading-relaxed">
                    {recipe.description}
                  </p>

                  {/* Visual Step Pills with Connecting Arrows */}
                  <div className="mt-3.5 flex items-center gap-1.5 rounded-xl bg-background-secondary-default/80 p-2 text-[11px]">
                    {recipe.steps.map((step, idx) => (
                      <div key={step} className="flex items-center gap-1.5">
                        {idx > 0 ? <RiArrowRightLine className="size-3 text-text-tertiary" /> : null}
                        <span className="rounded-md border border-border-button-default bg-background-primary-default px-2 py-0.5 font-mono font-medium text-text-primary shadow-2xs">
                          {step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
                  <span className="font-mono text-[10px] text-text-tertiary">
                    Syntax: {recipe.chain}
                  </span>

                  <Button
                    size="sm"
                    disabled={!sessionId || isStarting}
                    onClick={() => {
                      setChain(recipe.chain)
                      void start(recipe.chain)
                    }}
                    className="gap-1.5 h-7 px-3 text-caption-2-medium shadow-xs"
                  >
                    <RiPlayLine className="size-3.5" />
                    <span>Run Recipe</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Custom Pipeline Launcher Card */}
        <section className="overflow-hidden rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-separator-border/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-lg bg-accent-500/10 text-accent-500">
                <RiRouteLine className="size-3.5" />
              </div>
              <h3 className="text-body-medium font-semibold text-text-primary">
                Custom Workflow Pipeline Builder
              </h3>
            </div>
            <span className="text-caption-2-medium text-text-tertiary">
              Chain syntax: <code className="font-mono text-[11px]">step1&gt;step2&gt;step3</code>
            </span>
          </div>

          <div className="mt-4 flex flex-col gap-3.5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Input
                  value={chain}
                  onChange={(event) => setChain(event.target.value)}
                  placeholder="e.g. plan>act>verify"
                  className="bg-background-secondary-default font-mono text-body-medium focus-visible:bg-background-primary-default"
                />
              </div>

              <Button
                size="sm"
                data-testid="workflow-start"
                onClick={() => void start()}
                disabled={!sessionId || isStarting || !chain.trim()}
                className="gap-1.5 shadow-xs shrink-0"
              >
                {isStarting ? (
                  <RiLoader4Line className="size-4 animate-spin" />
                ) : (
                  <RiPlayLine className="size-4" />
                )}
                <span>Start Pipeline</span>
              </Button>
            </div>

            {/* Live Steps Preview */}
            {previewSteps.length > 0 ? (
              <div className="flex items-center gap-2 rounded-xl bg-background-secondary-default/70 p-2.5 overflow-x-auto">
                <span className="text-[11px] font-medium text-text-tertiary shrink-0">Live Pipeline Preview:</span>
                <div className="flex items-center gap-1.5 text-[11px]">
                  {previewSteps.map((step, idx) => (
                    <div key={step.id} className="flex items-center gap-1.5">
                      {idx > 0 ? <RiArrowRightLine className="size-3 text-text-tertiary" /> : null}
                      <span className="rounded-md border border-border-button-default bg-background-primary-default px-2 py-0.5 font-mono font-medium text-text-primary shadow-xs">
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* Runs List Section */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-body-medium font-semibold text-text-primary">
              Workflow Executions ({runs.length})
            </h3>
          </div>

          {runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default/40 p-8 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-500 shadow-xs">
                <RiRouteLine className="size-6" />
              </div>
              <h4 className="mt-3 text-body-medium font-semibold text-text-primary">
                No Workflow Runs Recorded Yet
              </h4>
              <p className="mt-1 max-w-md text-caption-1-medium text-text-secondary">
                Launch one of the pre-built workflow recipes above to execute multi-step autonomous tasks with step-by-step state checkpointing.
              </p>
            </div>
          ) : (
            <div className="grid gap-3.5">
              {runs.map((run) => (
                <article
                  key={run.id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-4.5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md"
                >
                  {/* Run Header */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-separator-border/60 pb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default shadow-xs text-text-secondary">
                        <RiGitCommitLine className="size-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="truncate text-body-medium font-semibold text-text-primary">
                            {run.title}
                          </h4>
                          <WorkflowStatusBadge status={run.status} />
                        </div>

                        <div className="mt-0.5 flex items-center gap-2 text-caption-2-medium text-text-tertiary">
                          <span className="font-mono">{run.id.slice(0, 16)}...</span>
                          <button
                            type="button"
                            title="Copy Run ID"
                            onClick={() => handleCopyRunId(run.id)}
                            className="inline-flex items-center rounded p-0.5 hover:text-text-primary"
                          >
                            {copiedId === run.id ? (
                              <RiCheckLine className="size-3 text-emerald-500" />
                            ) : (
                              <RiClipboardLine className="size-3" />
                            )}
                          </button>
                          <span>·</span>
                          <span>{new Date(run.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Run Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {run.status === "paused" || run.status === "cancelled" || run.status === "failed" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-accent-600 dark:text-accent-400"
                          onClick={() => void act("resume", run.id)}
                        >
                          <RiPlayCircleLine className="size-3.5" />
                          <span>Resume</span>
                        </Button>
                      ) : null}

                      {run.status === "completed" || run.status === "failed" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => void act("retry", run.id)}
                        >
                          <RiRestartLine className="size-3.5" />
                          <span>Retry</span>
                        </Button>
                      ) : null}

                      {run.status === "running" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-rose-600 dark:text-rose-400"
                          onClick={() => void act("cancel", run.id)}
                        >
                          <RiStopCircleLine className="size-3.5" />
                          <span>Cancel</span>
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {/* Run Steps DAG */}
                  {run.steps.length > 0 ? (
                    <div className="mt-3.5">
                      <WorkflowDag steps={run.steps} />
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </SecondaryPageShell>
  )
}

function WorkflowStatusBadge({ status }: { status: WorkflowStatus }) {
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-accent-500/20 bg-accent-500/10 px-2 py-0.5 text-[11px] font-semibold text-accent-600 dark:text-accent-400">
        <RiLoader4Line className="size-3 animate-spin" />
        Running
      </span>
    )
  }

  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
        <RiCheckLine className="size-3" />
        Completed
      </span>
    )
  }

  if (status === "paused") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
        <RiPauseCircleLine className="size-3" />
        Paused
      </span>
    )
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
        <RiCloseLine className="size-3" />
        Failed
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-background-tertiary-default px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
      <RiTimeLine className="size-3" />
      {status}
    </span>
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

