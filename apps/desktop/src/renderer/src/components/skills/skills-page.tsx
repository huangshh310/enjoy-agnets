/**
 * 技能工作流主页面：对标 Raycast / Figma Community / App Store 的现代化 C 端交互体验。
 * 彻底告别底层“来源文件夹”心智，直观呈现 189+ 独立能力卡片、精选集市 Spotlight、即插即用抽屉与多 Agent 一键启用。
 */
import { useMemo, useState } from "react"
import type { InstalledSkillItem, SkillTargetId } from "@enjoy-agents/ipc-contract"
import { useSearch } from "@tanstack/react-router"
import { ModuleReturnBar } from "@renderer/components/app-pages/module-return-bar"
import { SecondaryPageShell } from "@renderer/components/app-pages/secondary-page-shell"
import { ImportDialog } from "./components/skills-import-dialog"
import { CreateSkillDialog } from "./components/create-skill-dialog"
import { SkillsToolbar } from "./components/skills-toolbar"
import { SkillsGrid } from "./components/skills-grid"
import { SkillItemCard } from "./components/skill-item-card"
import { SkillDrawer } from "./components/skill-drawer"
import { SkillsDetailView } from "./components/skills-detail-view"
import { SkillsCuratedView } from "./components/skills-curated-view"
import { SkillsDoctorModal } from "./components/skills-doctor-modal"
import { SkillsEmptyState } from "./components/skills-empty-state"
import { AgentArmoryView } from "./components/armory/agent-armory-view"
import { useSkillsPage } from "./hooks/use-skills-page"
import { useSkillSourcePull } from "./hooks/use-skill-source-pull"
import { countGitSkillSources } from "./lib/git-skill-sources"
import { skillVisibleForTarget } from "./lib/skill-visible-for-target"

export function SkillsPage(props?: { embedded?: boolean }) {
  const search = useSearch({ strict: false }) as { from?: string; section?: string }
  const page = useSkillsPage()
  const pullState = useSkillSourcePull()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDrawerSkill, setSelectedDrawerSkill] = useState<InstalledSkillItem | null>(null)

  // 解析当前选中的目标 Agent 筛选
  const activeTargetId = useMemo<SkillTargetId | null>(() => {
    if (page.selectedNavId.startsWith("target:")) {
      return page.selectedNavId.replace("target:", "") as SkillTargetId
    }
    return null
  }, [page.selectedNavId])

  // 当前三栏视图模式
  const isDetailView = Boolean(page.selectedSourceId && page.detail)
  const isCuratedView = page.selectedNavId === "curated"
  const isPacksView = page.selectedNavId === "packs"

  const activeTab: "curated" | "skills" | "packs" = isCuratedView
    ? "curated"
    : isPacksView
      ? "packs"
      : "skills"

  function handleTabChange(tab: "curated" | "skills" | "packs") {
    if (tab === "curated") {
      page.setSelectedNavId("curated")
    } else if (tab === "packs") {
      page.setSelectedNavId("packs")
    } else {
      page.setSelectedNavId("all")
    }
    page.setActiveSkillId(null)
    page.setActionError(null)
  }

  // 1. 全部具体技能列表过滤（能力卡片视图）
  const filteredSkills = useMemo(() => {
    let list = page.allSkills
    if (activeTargetId) {
      list = list.filter((s) => skillVisibleForTarget(s, activeTargetId))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description && s.description.toLowerCase().includes(q)) ||
          (s.trigger && s.trigger.toLowerCase().includes(q)) ||
          s.sourceName.toLowerCase().includes(q)
      )
    }
    return list
  }, [page.allSkills, activeTargetId, searchQuery])

  // 2. 来源合集列表过滤（合集视图）
  const displayedSources = useMemo(() => {
    let list = page.sources
    if (activeTargetId) {
      list = list.filter((s) =>
        s.enabledTargetIds.includes("enjoy-agents") ||
        s.enabledTargetIds.includes("workspace-agents") ||
        s.enabledTargetIds.includes(activeTargetId)
      )
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.origin.toLowerCase().includes(q) ||
          s.selectedSkillIds.some((id) => id.toLowerCase().includes(q))
      )
    }
    return list
  }, [page.sources, activeTargetId, searchQuery])

  // 抽屉中当前技能对应的所属 source
  const drawerSource = useMemo(() => {
    if (!selectedDrawerSkill) return undefined
    return page.sources.find((s) => s.id === selectedDrawerSkill.sourceId)
  }, [selectedDrawerSkill, page.sources])

  const content = (
    <div className="flex h-full min-h-0 flex-col gap-6 px-8 pt-5 pb-6">
      {page.actionError ? (
        <div className="shrink-0 rounded-xl border border-border-error-default/30 bg-background-tertiary-error/10 px-4 py-2.5 text-caption-2-medium text-text-error-primary dark:text-text-error-primary">
          {page.actionError}
        </div>
      ) : null}
      {page.busyMessage ? (
        <div className="shrink-0 rounded-xl border border-accent-500/30 bg-accent-500/10 px-4 py-2.5 text-caption-2-medium text-accent-700 dark:text-accent-300">
          正在{page.busyMessage}…
        </div>
      ) : null}

      {isDetailView && page.detail ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
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
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-6">
          <SkillsToolbar
            sourceCount={page.sources.length}
            gitSourceCount={countGitSkillSources(page.sources)}
            deployedCount={page.allSkills.length || page.overview?.installedCount || 0}
            driftCount={page.overview?.driftCount ?? 0}
            warningCount={page.warnings.length}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            busy={Boolean(page.busyMessage)}
            updating={pullState.busy}
            onDoctor={() => page.setDoctorOpen(true)}
            onUpdateAll={() => void pullState.pull()}
            onImport={() => page.setImportOpen(true)}
            onCreateSkill={() => page.setCreateSkillOpen(true)}
          />

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {activeTargetId ? (
              <AgentArmoryView
                targetId={activeTargetId}
                allSkills={page.allSkills}
                sources={page.sources}
                curated={page.curated}
                busy={Boolean(page.busyMessage)}
                onGoToStore={() => page.setSelectedNavId("curated")}
                onClearFilter={() => page.setSelectedNavId("all")}
                onInstallCurated={(source) => void page.installCurated(source)}
                onToggleTarget={(source, targetId) => void page.toggleTarget(source, targetId)}
                onSelectSkill={(skill) => setSelectedDrawerSkill(skill)}
              />
            ) : activeTab === "curated" ? (
              <SkillsCuratedView
                curated={page.curated}
                sources={page.sources}
                busy={Boolean(page.busyMessage)}
                onInstall={(curatedSource) => void page.installCurated(curatedSource)}
              />
            ) : activeTab === "packs" ? (
              <SkillsGrid
                sources={displayedSources}
                busy={Boolean(page.busyMessage)}
                activeTargetId={activeTargetId}
                onClearTargetFilter={() => page.setSelectedNavId("all")}
                onSelect={(id) => page.setSelectedNavId(id)}
                onUpdate={(id) => void page.updateSource(id)}
                onDeploy={(id) => void page.deploySource(id)}
                onRemove={(id) => void page.removeSource(id)}
                onPickFolder={() => void page.addLocalSource()}
                onGoToStore={() => page.setSelectedNavId("curated")}
              />
            ) : filteredSkills.length === 0 ? (
              <SkillsEmptyState
                activeTargetId={activeTargetId}
                onClearTargetFilter={() => page.setSelectedNavId("all")}
                onGoToStore={() => page.setSelectedNavId("curated")}
                onPickFolder={() => void page.addLocalSource()}
              />
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSkills.map((skill) => (
                  <SkillItemCard
                    key={`${skill.sourceId}:${skill.id}`}
                    skill={skill}
                    onSelect={() => setSelectedDrawerSkill(skill)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 技能详情抽屉 */}
      <SkillDrawer
        skill={selectedDrawerSkill}
        source={drawerSource}
        hasWorkspace={page.hasWorkspace}
        busy={Boolean(page.busyMessage)}
        onClose={() => setSelectedDrawerSkill(null)}
        onToggleTarget={(source, targetId) => void page.toggleTarget(source, targetId)}
        onDeleteSkill={(sourceId, skillId) => {
          void page.deleteSkill(sourceId, skillId)
          setSelectedDrawerSkill(null)
        }}
      />

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
        workspacePath={page.workspacePath}
      />

      <CreateSkillDialog
        open={page.createSkillOpen}
        hasWorkspace={page.hasWorkspace}
        workspacePath={page.workspacePath}
        onOpenChange={page.setCreateSkillOpen}
        onCreated={page.refreshAll}
      />
    </div>
  )

  if (props?.embedded) {
    return content
  }

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
      contentWidth="fill"
      hideChrome
    >
      <ModuleReturnBar from={search.from} origin={search.section} fallback="skills" />
      {content}
    </SecondaryPageShell>
  )
}
