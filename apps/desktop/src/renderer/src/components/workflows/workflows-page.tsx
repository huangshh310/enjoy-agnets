/**
 * 工作流模块：无限画布工作台，对齐 infinite-canvas 项目列表 + 画布编辑器。
 */
import { useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  RiAddLine,
  RiAlertLine,
  RiArtboardLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiLoader4Line,
  RiPlayLine,
  RiStopCircleLine
} from "@remixicon/react"
import type { WorkflowRun } from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { CanvasEditor } from "./canvas/canvas-editor"
import { canvasToWorkflowGraph } from "./lib/canvas-to-workflow-graph"
import { useCanvasStore } from "./stores/use-canvas-store"

export function WorkflowsPage() {
  const t = useT()
  const queryClient = useQueryClient()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const sessionId = useChatStore((state) => state.sessionId)
  const projects = useCanvasStore((state) => state.projects)
  const createProject = useCanvasStore((state) => state.createProject)
  const renameProject = useCanvasStore((state) => state.renameProject)
  const deleteProjects = useCanvasStore((state) => state.deleteProjects)
  const [selectedId, setSelectedId] = useState<string | null>(projects[0]?.id ?? null)
  const [isStarting, setIsStarting] = useState(false)
  const [dagError, setDagError] = useState<string | null>(null)
  const [cycleNodeIds, setCycleNodeIds] = useState<string[]>([])
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedId && projects[0]) setSelectedId(projects[0].id)
    setDagError(null)
    setCycleNodeIds([])
  }, [projects, selectedId])

  const { data: workflowRuns } = useQuery({
    queryKey: ["workflows", workspaceId],
    enabled: hasIde(),
    queryFn: () =>
      getIde().workflow.list({ workspaceId: workspaceId ?? undefined }) as Promise<WorkflowRun[]>,
    refetchInterval: (query) => {
      const data = query.state.data as WorkflowRun[] | undefined
      return data?.some((run) => run.status === "running" || run.status === "waiting_review") ? 1500 : false
    }
  })

  const activeWorkflowRun = useMemo(() => {
    if (!workflowRuns?.length) return null
    return (
      workflowRuns.find((run) => run.status === "running" || run.status === "waiting_review") ??
      workflowRuns[0] ??
      null
    )
  }, [workflowRuns])

  const groups = useMemo(
    () => [
      {
        id: "boards",
        label: t("pages.workflows.canvasLibrary"),
        items: projects.map((project) => ({
          id: project.id,
          label: project.title,
          icon: RiArtboardLine,
          meta: String(project.nodes.length)
        }))
      }
    ],
    [projects, t]
  )

  async function startPipeline() {
    if (!sessionId || isStarting) return
    setIsStarting(true)
    setDagError(null)
    setCycleNodeIds([])
    try {
      const { steps, error, cycleNodes } = canvasToWorkflowGraph(
        currentProject?.nodes ?? [],
        currentProject?.connections ?? []
      )
      if (error) {
        setDagError(error)
        if (cycleNodes?.length) setCycleNodeIds(cycleNodes)
        return
      }

      const title = (
        currentProject?.title?.trim() ||
        steps.map((s) => s.label).join(" → ") ||
        "Workflow Pipeline"
      ).slice(0, 80)

      const created = (await getIde().workflow.start({
        sessionId,
        workspaceId: workspaceId ?? undefined,
        title,
        steps
      })) as WorkflowRun
      await getIde().workflow.resume(created.id)
      await queryClient.invalidateQueries({ queryKey: ["workflows"] })
    } catch (err) {
      setDagError(err instanceof Error ? err.message : "启动工作流失败")
    } finally {
      setIsStarting(false)
    }
  }

  async function stopPipeline() {
    if (!activeWorkflowRun?.id) return
    try {
      await getIde().workflow.cancel(activeWorkflowRun.id)
      await queryClient.invalidateQueries({ queryKey: ["workflows"] })
    } catch (err) {
      setDagError(err instanceof Error ? err.message : "停止工作流失败")
    }
  }

  const currentProject = projects.find((item) => item.id === selectedId)

  return (
    <SecondaryPageShell
      searchPlaceholder={t("pages.workflows.filterPlaceholder")}
      groups={groups}
      selectedId={selectedId ?? ""}
      onSelect={setSelectedId}
      contentWidth="fill"
      hideChrome
    >
      <div className="relative flex size-full min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border-button-default/60 px-3 bg-background-primary-default/50 backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-caption-1-medium text-accent-600 hover:bg-accent-500/10 transition"
              onClick={() => {
                const id = createProject(t("pages.workflows.canvasUntitled"))
                setSelectedId(id)
              }}
            >
              <RiAddLine className="size-4" />
              {t("pages.workflows.canvasCreate")}
            </button>
            {selectedId ? (
              <div className="flex items-center gap-1.5">
                <input
                  className="h-7 w-56 rounded-md bg-transparent px-2 text-caption-1-semibold text-text-primary outline-none transition hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40 focus:bg-zinc-100 dark:focus:bg-zinc-800"
                  value={currentProject?.title ?? ""}
                  placeholder={t("pages.workflows.canvasUntitled")}
                  onChange={(event) => renameProject(selectedId, event.target.value)}
                />
                {currentProject && (
                  <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-text-tertiary">
                    {currentProject.nodes.length} 个节点
                  </span>
                )}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {activeWorkflowRun?.status === "running" ? (
              <button
                type="button"
                data-testid="workflow-stop"
                className="flex h-8 items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 px-3 text-caption-2-medium text-white shadow-sm transition"
                onClick={() => void stopPipeline()}
              >
                <RiStopCircleLine className="size-3.5" />
                <span>停止流水线</span>
              </button>
            ) : (
              <button
                type="button"
                data-testid="workflow-start"
                disabled={!sessionId || isStarting}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 text-caption-2-medium text-white shadow-sm transition disabled:opacity-40"
                onClick={() => void startPipeline()}
              >
                {isStarting ? (
                  <RiLoader4Line className="size-3.5 animate-spin" />
                ) : (
                  <RiPlayLine className="size-3.5" />
                )}
                {t("pages.workflows.startPipeline")}
              </button>
            )}
            {selectedId ? (
              <button
                type="button"
                title={t("pages.workflows.canvasDelete")}
                className="flex size-8 items-center justify-center rounded-lg text-text-tertiary hover:text-rose-500 hover:bg-rose-500/10 transition"
                onClick={() => setDeleteConfirmId(selectedId)}
              >
                <RiDeleteBinLine className="size-4" />
              </button>
            ) : null}
          </div>
        </div>

        {selectedId ? (
          <CanvasEditor
            projectId={selectedId}
            activeWorkflowRun={activeWorkflowRun}
            cycleNodeIds={cycleNodeIds}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-caption-1-medium text-text-tertiary">
            {t("pages.workflows.canvasEmpty")}
          </div>
        )}

        {dagError && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-2 rounded-xl bg-rose-600 text-white px-4 py-2 text-xs shadow-lg backdrop-blur">
            <RiAlertLine className="size-4 shrink-0" />
            <span>{dagError}</span>
            <button
              type="button"
              onClick={() => {
                setDagError(null)
                setCycleNodeIds([])
              }}
              className="ml-2 rounded p-0.5 hover:bg-white/20 transition"
            >
              <RiCloseLine className="size-3.5" />
            </button>
          </div>
        )}

        {/* 删除画布二次确认弹窗 */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs">
            <div className="w-96 rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-2xl">
              <h3 className="text-base font-semibold text-text-primary">
                {t("pages.workflows.canvasDeleteConfirmTitle")}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                {t("pages.workflows.canvasDeleteConfirmDesc")}
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-border-button-default px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  onClick={() => setDeleteConfirmId(null)}
                >
                  {t("pages.workflows.canvasCancel")}
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-rose-700 transition"
                  onClick={() => {
                    const toDelete = deleteConfirmId
                    setDeleteConfirmId(null)
                    deleteProjects([toDelete])
                    setSelectedId(projects.find((item) => item.id !== toDelete)?.id ?? null)
                  }}
                >
                  {t("pages.workflows.canvasConfirm")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SecondaryPageShell>
  )
}
