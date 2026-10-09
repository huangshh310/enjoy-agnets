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
import { useT } from "@renderer/i18n"
import { getHealthConfig, useSkillsUiCopy } from "../constants/skills-ui.constants"
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
  const t = useT()
  const copy = useSkillsUiCopy()
  const { source, skills } = detail
  const [confirmDialog, setConfirmDialog] = useState<"deploy" | "remove" | null>(null)
  const [pendingDeleteSkillId, setPendingDeleteSkillId] = useState<string | null>(null)
  const health = getHealthConfig(t)[source.health]

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
            variant="ghost"
            onClick={onBack}
            className="gap-1 h-8 px-2 text-caption-2-medium text-text-secondary hover:text-text-primary"
          >
            <RiArrowLeftLine className="size-3.5" />
            <span>{copy.backToList}</span>
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
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-caption-2-medium font-medium",
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
            <span>{copy.pullUpdates}</span>
          </Button>

          <Button
            size="sm"
            disabled={busy}
            onClick={() => setConfirmDialog("deploy")}
            className="gap-1 h-8 text-caption-2-medium shadow-xs"
          >
            <RiShieldCheckLine className="size-3.5" />
            <span>{copy.redeploySource}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setConfirmDialog("remove")}
            className="gap-1 h-8 text-caption-2-medium text-chart-danger-text hover:border-chart-danger/40"
          >
            <RiDeleteBinLine className="size-3.5" />
            <span>{copy.removeSource}</span>
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
        title={copy.confirmDeployTitle}
        description={copy.confirmDeployDesc}
        confirmLabel={copy.redeploySource}
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
        title={copy.confirmRemoveTitle}
        description={copy.confirmRemoveDesc}
        confirmLabel={copy.removeSource}
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
        title={copy.confirmDeleteSkillTitle}
        description={copy.confirmDeleteSkillDesc}
        confirmLabel={copy.deleteSkill}
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
