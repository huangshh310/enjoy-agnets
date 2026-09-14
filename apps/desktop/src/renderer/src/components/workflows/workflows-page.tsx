/**
 * 工作流模块：无限画布工作台，对齐 infinite-canvas 项目列表 + 画布编辑器。
 */
import { useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RiAddLine, RiArtboardLine, RiPlayLine } from "@remixicon/react"
import type { WorkflowRun } from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { useT } from "@renderer/i18n"
import { CanvasEditor } from "./canvas/canvas-editor"
import { stepsFromChain } from "./lib/steps-from-chain"
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

  useEffect(() => {
    if (!selectedId && projects[0]) setSelectedId(projects[0].id)
  }, [projects, selectedId])

  useQuery({
    queryKey: ["workflows", workspaceId],
    enabled: hasIde(),
    queryFn: () =>
      getIde().workflow.list({ workspaceId: workspaceId ?? undefined }) as Promise<WorkflowRun[]>,
    refetchInterval: (query) => {
      const data = query.state.data as WorkflowRun[] | undefined
      return data?.some((run) => run.status === "running" || run.status === "waiting_review") ? 1500 : false
    }
  })

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
    try {
      const steps = stepsFromChain("plan>act>verify")
      const created = (await getIde().workflow.start({
        sessionId,
        workspaceId: workspaceId ?? undefined,
        title: steps.map((step) => step.label).join(" → "),
        steps
      })) as WorkflowRun
      await getIde().workflow.resume(created.id)
      await queryClient.invalidateQueries({ queryKey: ["workflows"] })
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <SecondaryPageShell
      searchPlaceholder={t("pages.workflows.filterPlaceholder")}
      groups={groups}
      selectedId={selectedId ?? ""}
      onSelect={setSelectedId}
      contentWidth="fill"
      hideChrome
    >
      <div className="flex size-full min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border-button-default/60 px-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-caption-1-medium text-accent-600 hover:bg-accent-500/10"
              onClick={() => {
                const id = createProject(t("pages.workflows.canvasUntitled"))
                setSelectedId(id)
              }}
            >
              <RiAddLine className="size-4" />
              {t("pages.workflows.canvasCreate")}
            </button>
            {selectedId ? (
              <input
                className="h-7 w-56 rounded-md bg-transparent px-2 text-caption-1-semibold text-text-primary outline-none"
                value={projects.find((item) => item.id === selectedId)?.title ?? ""}
                onChange={(event) => renameProject(selectedId, event.target.value)}
              />
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="workflow-start"
              disabled={!sessionId || isStarting}
              className="flex h-8 items-center gap-1 rounded-lg bg-button-primary px-3 text-caption-2-medium text-text-white disabled:opacity-40"
              onClick={() => void startPipeline()}
            >
              <RiPlayLine className="size-3.5" />
              {t("pages.workflows.startPipeline")}
            </button>
            {selectedId ? (
              <button
                type="button"
                className="text-caption-2-medium text-rose-500"
                onClick={() => {
                  deleteProjects([selectedId])
                  setSelectedId(projects.find((item) => item.id !== selectedId)?.id ?? null)
                }}
              >
                {t("pages.workflows.canvasDelete")}
              </button>
            ) : null}
          </div>
        </div>
        {selectedId ? (
          <CanvasEditor projectId={selectedId} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-caption-1-medium text-text-tertiary">
            {t("pages.workflows.canvasEmpty")}
          </div>
        )}
      </div>
    </SecondaryPageShell>
  )
}
