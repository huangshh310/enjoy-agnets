/**
 * 来源组详情工作台 (Skills Detail View)。
 * 聚合目标 Agent 投影插槽、高密度技能搜索清单与 IDE 级规范检视器。
 */
import { useMemo, useState } from "react"
import {
  RiArrowLeftLine,
  RiDeleteBinLine,
  RiLoader4Line,
  RiRefreshLine,
  RiShieldCheckLine
} from "@remixicon/react"
import type {
  SkillSourceDetail,
  SkillSource,
  SkillTargetId
} from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { HEALTH_CONFIG, SKILLS_UI_COPY } from "../constants/skills-ui.constants"
import { resolveSkillTheme } from "../constants/skills-badge-theme"
import { TargetDeploymentsCard } from "./detail/target-deployments-card"
import { SkillListPane } from "./detail/skill-list-pane"
import { SkillDocInspector } from "./detail/skill-doc-inspector"

export function SkillsDetailView({
  detail,
  activeSkillId,
  hasWorkspace,
  busy,
  onBack,
  onSelectSkill,
  onToggleTarget,
  onToggleSkill,
  onUpdate,
  onDeploy,
  onRemove,
  onDeleteSkill
}: {
  detail: SkillSourceDetail
  activeSkillId: string | null
  hasWorkspace: boolean
  busy: boolean
  onBack: () => void
  onSelectSkill: (id: string) => void
  onToggleTarget: (source: SkillSource, targetId: SkillTargetId) => void
  onToggleSkill: (source: SkillSource, skillId: string) => void
  onUpdate: () => void
  onDeploy: () => void
  onRemove: () => void
  onDeleteSkill: (skillId: string) => void
}) {
  const { source, skills } = detail
  const [confirmDialog, setConfirmDialog] = useState<"deploy" | "remove" | null>(null)
  const [pendingDeleteSkillId, setPendingDeleteSkillId] = useState<string | null>(null)
  const health = HEALTH_CONFIG[source.health]

  const activeSkill = useMemo(() => {
    if (activeSkillId) {
      const found = skills.find((s) => s.id === activeSkillId)
      if (found) return found
    }
    return skills[0] ?? null
  }, [skills, activeSkillId])

  const theme = resolveSkillTheme(source.id || source.name, source.kind)
  const ThemeIcon = theme.icon

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-200">
      {/* 顶部控制栏 */}
      <header className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-separator-border/60">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={onBack}
            className="gap-1 h-8 text-caption-2-medium"
          >
            <RiArrowLeftLine className="size-3.5" />
            <span>{SKILLS_UI_COPY.backToList}</span>
          </Button>

          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={cx(
                "flex size-9 items-center justify-center rounded-xl border shrink-0 shadow-2xs",
                theme.badgeBg,
                theme.badgeText,
                theme.badgeBorder
              )}
            >
              <ThemeIcon className="size-4.5" />
            </div>
            <h2 className="text-title-3-semibold text-text-primary truncate tracking-tight">
              {source.name}
            </h2>
            <span
              className={cx(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium",
                health.badgeClass
              )}
            >
              <span className={cx("size-1.5 rounded-full", health.dotClass)} />
              {health.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onUpdate}
            className="gap-1 h-8 text-caption-2-medium"
          >
            {busy ? (
              <RiLoader4Line className="size-3.5 animate-spin" />
            ) : (
              <RiRefreshLine className="size-3.5" />
            )}
            <span>{SKILLS_UI_COPY.pullUpdates}</span>
          </Button>

          <Button
            size="sm"
            disabled={busy}
            onClick={() => setConfirmDialog("deploy")}
            className="gap-1 h-8 text-caption-2-medium shadow-xs"
          >
            <RiShieldCheckLine className="size-3.5" />
            <span>{SKILLS_UI_COPY.redeploySource}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setConfirmDialog("remove")}
            className="gap-1 h-8 text-caption-2-medium text-rose-600 dark:text-rose-400 hover:border-rose-500/40"
          >
            <RiDeleteBinLine className="size-3.5" />
            <span>{SKILLS_UI_COPY.removeSource}</span>
          </Button>
        </div>
      </header>

      {/* 1. 目标 Agent 部署开关矩阵 */}
      <TargetDeploymentsCard
        source={source}
        hasWorkspace={hasWorkspace}
        busy={busy}
        onToggleTarget={onToggleTarget}
      />

      {/* 2. Master-Detail 双栏：技能清单 + 文档规范检视 */}
      <section className="grid gap-4 lg:grid-cols-12 items-start">
        <SkillListPane
          source={source}
          skills={skills}
          activeSkillId={activeSkill?.id ?? null}
          busy={busy}
          onSelectSkill={onSelectSkill}
          onToggleSkill={onToggleSkill}
          onDeleteSkill={(id) => setPendingDeleteSkillId(id)}
        />

        <SkillDocInspector skill={activeSkill} />
      </section>

      {/* 二次确认弹窗 */}
      <ConfirmDialog
        open={confirmDialog === "deploy"}
        title={SKILLS_UI_COPY.confirmDeployTitle}
        description={SKILLS_UI_COPY.confirmDeployDesc}
        confirmLabel={SKILLS_UI_COPY.redeploySource}
        destructive={false}
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null)
        }}
        onConfirm={() => {
          onDeploy()
          setConfirmDialog(null)
        }}
      />

      <ConfirmDialog
        open={confirmDialog === "remove"}
        title={SKILLS_UI_COPY.confirmRemoveTitle}
        description={SKILLS_UI_COPY.confirmRemoveDesc}
        confirmLabel={SKILLS_UI_COPY.removeSource}
        destructive
        onOpenChange={(open) => {
          if (!open) setConfirmDialog(null)
        }}
        onConfirm={() => {
          onRemove()
          setConfirmDialog(null)
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteSkillId)}
        title={SKILLS_UI_COPY.confirmDeleteSkillTitle}
        description={SKILLS_UI_COPY.confirmDeleteSkillDesc}
        confirmLabel={SKILLS_UI_COPY.deleteSkill}
        destructive
        onOpenChange={(open) => {
          if (!open) setPendingDeleteSkillId(null)
        }}
        onConfirm={() => {
          if (pendingDeleteSkillId) {
            onDeleteSkill(pendingDeleteSkillId)
            setPendingDeleteSkillId(null)
          }
        }}
      />
    </div>
  )
}
