/**
 * 技能工作流主页面：左栏情境栏多维筛选与导航，主区自适应切换总览、精选市场与详情工作台。
 */
import { useMemo } from "react"
import type { SkillTargetId } from "@enjoy-agents/ipc-contract"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { ImportDialog } from "./components/skills-import-dialog"
import { SkillsToolbar } from "./components/skills-toolbar"
import { SkillsGrid } from "./components/skills-grid"
import { SkillsDetailView } from "./components/skills-detail-view"
import { SkillsCuratedView } from "./components/skills-curated-view"
import { SkillsDoctorModal } from "./components/skills-doctor-modal"
import { useSkillsPage } from "./hooks/use-skills-page"

export function SkillsPage() {
  const page = useSkillsPage()

  const activeTargetId = useMemo<SkillTargetId | null>(() => {
    if (page.selectedNavId.startsWith("target:")) {
      return page.selectedNavId.replace("target:", "") as SkillTargetId
    }
    return null
  }, [page.selectedNavId])

  const displayedSources = useMemo(() => {
    if (!activeTargetId) return page.sources
    return page.sources.filter((s) => s.enabledTargetIds.includes(activeTargetId))
  }, [page.sources, activeTargetId])

  const isDetailView = Boolean(page.selectedSourceId && page.detail)
  const isCuratedView = page.selectedNavId === "curated"

  return (
    <SecondaryPageShell
      searchPlaceholder="搜索技能与来源组…"
      groups={page.navGroups}
      selectedId={page.selectedNavId}
      onSelect={(id) => {
        page.setSelectedNavId(id)
        page.setActiveSkillId(null)
        page.setActionError(null)
      }}
      contentWidth="wide"
      hideChrome
    >
      <div className="flex flex-col gap-6 pb-12">
        {page.actionError ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-caption-2-medium text-rose-600 dark:text-rose-400">
            {page.actionError}
          </div>
        ) : null}
        {page.busyMessage ? (
          <div className="rounded-xl border border-accent-500/30 bg-accent-500/10 px-4 py-2.5 text-caption-2-medium text-accent-700 dark:text-accent-300">
            正在{page.busyMessage}…
          </div>
        ) : null}

        {isDetailView && page.detail ? (
          <SkillsDetailView
            detail={page.detail}
            activeSkillId={page.activeSkillId}
            hasWorkspace={page.hasWorkspace}
            busy={Boolean(page.busyMessage)}
            onBack={() => page.setSelectedNavId("all")}
            onSelectSkill={(id) => page.setActiveSkillId(id)}
            onToggleTarget={(source, targetId) => void page.toggleTarget(source, targetId)}
            onToggleSkill={(source, skillId) => void page.toggleSkill(source, skillId)}
            onUpdate={() => void page.updateSource(page.detail!.source.id)}
            onDeploy={() => void page.deploySource(page.detail!.source.id)}
            onRemove={() => void page.removeSource(page.detail!.source.id)}
            onDeleteSkill={(skillId) => void page.deleteSkill(page.detail!.source.id, skillId)}
          />
        ) : isCuratedView ? (
          <SkillsCuratedView
            curated={page.curated}
            sources={page.sources}
            busy={Boolean(page.busyMessage)}
            onInstall={(curatedSource) => void page.installCurated(curatedSource)}
          />
        ) : (
          <div className="flex flex-col gap-6">
            <SkillsToolbar
              sourceCount={page.sources.length}
              deployedCount={page.overview?.installedCount ?? 0}
              driftCount={page.overview?.driftCount ?? 0}
              warningCount={page.warnings.length}
              busy={Boolean(page.busyMessage)}
              onDoctor={() => page.setDoctorOpen(true)}
              onUpdateAll={() => void page.updateAllSources()}
              onImport={() => page.setImportOpen(true)}
            />

            <SkillsGrid
              sources={displayedSources}
              curated={page.curated}
              busy={Boolean(page.busyMessage)}
              activeTargetId={activeTargetId}
              onClearTargetFilter={() => page.setSelectedNavId("all")}
              onSelect={(id) => page.setSelectedNavId(id)}
              onUpdate={(id) => void page.updateSource(id)}
              onDeploy={(id) => void page.deploySource(id)}
              onRemove={(id) => void page.removeSource(id)}
              onAddGit={(origin) => void page.addGitSource(origin)}
              onPickFolder={() => void page.addLocalSource()}
              onInstallCurated={(item) => void page.installCurated(item)}
            />
          </div>
        )}

        <SkillsDoctorModal
          open={page.doctorOpen}
          warnings={page.warnings}
          onOpenChange={page.setDoctorOpen}
          onRepairAll={async () => {
            await page.repairTargets()
          }}
        />

        <ImportDialog
          open={page.importOpen}
          onOpenChange={page.setImportOpen}
          onImported={page.refreshAll}
        />
      </div>
    </SecondaryPageShell>
  )
}
