/**
 * Workflow 执行列表：空态、Resume/Retry/Cancel、步骤 DAG、在会话中打开。
 */
import {
  RiCheckLine,
  RiClipboardLine,
  RiCloseLine,
  RiGitCommitLine,
  RiLoader4Line,
  RiPauseCircleLine,
  RiPlayCircleLine,
  RiRestartLine,
  RiRouteLine,
  RiShieldCheckLine,
  RiStopCircleLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "@tanstack/react-router"
import { selectPersistedSession } from "@renderer/hooks/use-agent-session"
import type { WorkflowRun, WorkflowStatus } from "@enjoy-agents/ipc-contract"
import { useT } from "@renderer/i18n"
import { WorkflowDag } from "../workflow-dag"

export function WorkflowRunList({
  runs,
  isLoading,
  copiedId,
  onCopyId,
  onAct
}: {
  runs: WorkflowRun[]
  isLoading?: boolean
  copiedId: string | null
  onCopyId: (id: string) => void
  onAct: (kind: "resume" | "pause" | "cancel" | "retry", runId: string) => void
}) {
  const t = useT()
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-body-medium font-semibold text-text-primary">
          {t("pages.workflows.executions", { n: runs.length })}
        </h3>
      </div>
      {isLoading ? (
        <div className="grid gap-3.5">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-2xl border border-border-button-default bg-background-secondary-default/50 p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="h-5 w-48 rounded-md bg-background-tertiary-default/60" />
                <div className="h-6 w-20 rounded-full bg-background-tertiary-default/60" />
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-8 w-24 rounded-lg bg-background-tertiary-default/50" />
                <div className="h-8 w-24 rounded-lg bg-background-tertiary-default/50" />
                <div className="h-8 w-24 rounded-lg bg-background-tertiary-default/50" />
              </div>
            </div>
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default/40 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-500 shadow-xs">
            <RiRouteLine className="size-6" />
          </div>
          <h4 className="mt-3 text-body-medium font-semibold text-text-primary">
            {t("pages.workflows.emptyTitle")}
          </h4>
          <p className="mt-1 max-w-md text-caption-1-medium text-text-secondary">
            {t("pages.workflows.emptyHint")}
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5">
          {runs.map((run) => (
            <RunCard key={run.id} run={run} copiedId={copiedId} onCopyId={onCopyId} onAct={onAct} />
          ))}
        </div>
      )}
    </section>
  )
}

function RunCard({
  run,
  copiedId,
  onCopyId,
  onAct
}: {
  run: WorkflowRun
  copiedId: string | null
  onCopyId: (id: string) => void
  onAct: (kind: "resume" | "pause" | "cancel" | "retry", runId: string) => void
}) {
  const t = useT()
  const navigate = useNavigate()
  return (
    <article className="group relative flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-4.5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md">
      <div className="flex flex-col gap-3 border-b border-separator-border/60 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-text-secondary shadow-xs">
            <RiGitCommitLine className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-body-medium font-semibold text-text-primary">{run.title}</h4>
              <WorkflowStatusBadge status={run.status} />
              {run.sessionId ? (
                <button
                  type="button"
                  onClick={() => {
                    void navigate({ to: "/" })
                    void selectPersistedSession(run.sessionId!)
                  }}
                  className="ml-1 inline-flex cursor-pointer items-center gap-1 text-caption-2-medium text-accent-500 hover:underline"
                >
                  <span>{t("pages.workflows.openInChat")}</span>
                </button>
              ) : null}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-caption-2-medium text-text-tertiary">
              <span className="font-mono">{run.id.slice(0, 16)}...</span>
              <button
                type="button"
                title={t("pages.workflows.copyRunId")}
                onClick={() => onCopyId(run.id)}
                className="inline-flex items-center rounded p-0.5 hover:text-text-primary cursor-pointer"
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
        <div className="flex shrink-0 items-center gap-1.5 self-end sm:self-center">
          {run.status === "paused" || run.status === "cancelled" || run.status === "failed" ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-accent-600 dark:text-accent-400"
              onClick={() => onAct("resume", run.id)}
            >
              <RiPlayCircleLine className="size-3.5" />
              <span>{t("pages.workflows.resume")}</span>
            </Button>
          ) : null}
          {run.status === "completed" || run.status === "failed" ? (
            <Button size="sm" variant="outline" className="gap-1" onClick={() => onAct("retry", run.id)}>
              <RiRestartLine className="size-3.5" />
              <span>{t("pages.workflows.retry")}</span>
            </Button>
          ) : null}
          {run.status === "running" ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => onAct("pause", run.id)}
            >
              <RiPauseCircleLine className="size-3.5" />
              <span>{t("pages.workflows.pause")}</span>
            </Button>
          ) : null}
          {run.status === "running" || run.status === "waiting_review" ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-rose-600 dark:text-rose-400"
              onClick={() => onAct("cancel", run.id)}
            >
              <RiStopCircleLine className="size-3.5" />
              <span>{t("pages.workflows.cancelRun")}</span>
            </Button>
          ) : null}
        </div>
      </div>
      {run.steps.length > 0 ? (
        <div className="mt-3.5">
          <WorkflowDag steps={run.steps} />
        </div>
      ) : null}
    </article>
  )
}

function WorkflowStatusBadge({ status }: { status: WorkflowStatus }) {
  const t = useT()
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-accent-500/30 bg-accent-500/10 px-2 py-0.5 text-caption-2-medium font-medium text-accent-600 dark:text-accent-400">
        <RiLoader4Line className="size-3 animate-spin" />
        <span>{t("pages.workflows.statusRunning")}</span>
      </span>
    )
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-caption-2-medium font-medium text-emerald-600 dark:text-emerald-400">
        <RiCheckLine className="size-3" />
        <span>{t("pages.workflows.statusCompleted")}</span>
      </span>
    )
  }
  if (status === "paused") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-caption-2-medium font-medium text-amber-600 dark:text-amber-400">
        <RiPauseCircleLine className="size-3" />
        <span>{t("pages.workflows.statusPaused")}</span>
      </span>
    )
  }
  if (status === "waiting_review") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-caption-2-medium font-medium text-amber-600 dark:text-amber-400">
        <RiShieldCheckLine className="size-3" />
        <span>{t("pages.workflows.statusWaiting")}</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-caption-2-medium font-medium text-rose-600 dark:text-rose-400">
      <RiCloseLine className="size-3" />
      <span>{t("pages.workflows.statusFailed")}</span>
    </span>
  )
}
