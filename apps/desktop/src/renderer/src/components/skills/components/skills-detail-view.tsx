/**
 * 来源组详情工作台：Master-Detail 双栏检视、目标 Agent 切换矩阵与文档查看。
 */
import { useMemo, useState } from "react"
import {
  RiArrowLeftLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiFolderLine,
  RiGitRepositoryLine,
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
import {
  GLOBAL_TARGET_IDS,
  HEALTH_CONFIG,
  SKILLS_UI_COPY,
  TARGET_SHORT_LABELS,
  WORKSPACE_TARGET_IDS
} from "../constants/skills-ui.constants"
import { SkillDocumentViewer } from "./skill-document-viewer"

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

  return (
    <div className="flex flex-col gap-6">
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

          <div className="flex items-center gap-2 min-w-0">
            <div className="flex size-7 items-center justify-center rounded-lg bg-accent-500/10 text-accent-600 dark:text-accent-400">
              {source.kind === "git" ? (
                <RiGitRepositoryLine className="size-3.5" />
              ) : (
                <RiFolderLine className="size-3.5" />
              )}
            </div>
            <h2 className="text-title-3-semibold text-text-primary truncate">
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
            {busy ? <RiLoader4Line className="size-3.5 animate-spin" /> : <RiRefreshLine className="size-3.5" />}
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

      {/* 目标 Agent 部署开关矩阵 */}
      <section className="flex flex-col gap-2.5 rounded-2xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs">
        <div>
          <h3 className="text-caption-1-medium font-semibold text-text-primary">
            {SKILLS_UI_COPY.targetDeployments}
          </h3>
          <p className="text-[11px] text-text-tertiary">
            {SKILLS_UI_COPY.targetDeploymentsDesc}
          </p>
        </div>

        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
          {GLOBAL_TARGET_IDS.map((targetId) => {
            const isEnabled = source.enabledTargetIds.includes(targetId)
            return (
              <button
                key={targetId}
                type="button"
                onClick={() => onToggleTarget(source, targetId)}
                className={cx(
                  "flex items-center justify-between gap-1.5 rounded-xl border p-2.5 text-left transition-all cursor-pointer",
                  isEnabled
                    ? "border-accent-500/40 bg-accent-500/10 text-text-primary shadow-2xs"
                    : "border-separator-border/60 bg-background-secondary-default/40 text-text-secondary hover:border-separator-border"
                )}
              >
                <span className="text-caption-2-medium font-medium truncate">
                  {TARGET_SHORT_LABELS[targetId]}
                </span>
                <span
                  className={cx(
                    "flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold",
                    isEnabled
                      ? "bg-accent-500 text-text-white"
                      : "bg-separator-border/60 text-text-tertiary"
                  )}
                >
                  {isEnabled ? <RiCheckLine className="size-2.5" /> : null}
                </span>
              </button>
            )
          })}
        </div>

        {hasWorkspace ? (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-separator-border/40 text-[11px]">
            <span className="text-text-tertiary font-medium">工作区目标:</span>
            {WORKSPACE_TARGET_IDS.map((targetId) => {
              const isEnabled = source.enabledTargetIds.includes(targetId)
              return (
                <button
                  key={targetId}
                  type="button"
                  onClick={() => onToggleTarget(source, targetId)}
                  className={cx(
                    "rounded-lg border px-2 py-0.5 font-mono text-[10.5px] transition-colors cursor-pointer",
                    isEnabled
                      ? "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium"
                      : "border-separator-border/60 text-text-tertiary hover:text-text-secondary"
                  )}
                >
                  {isEnabled ? "✓ " : ""}{TARGET_SHORT_LABELS[targetId]}
                </button>
              )
            })}
          </div>
        ) : null}
      </section>

      {/* Master-Detail: 技能勾选列表 + SKILL.md 文档检视 */}
      <section className="grid gap-4 lg:grid-cols-12 items-start">
        {/* 左栏：技能清单 */}
        <div className="flex flex-col gap-2 rounded-2xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs lg:col-span-5 max-h-[600px] overflow-hidden">
          <div className="px-1 pb-1">
            <h4 className="text-caption-1-medium font-semibold text-text-primary">
              {SKILLS_UI_COPY.skillsListTitle} ({skills.length})
            </h4>
            <p className="text-[11px] text-text-tertiary">
              {SKILLS_UI_COPY.skillsListDesc}
            </p>
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto pr-1">
            {skills.map((skill) => {
              const isSelected = source.selectedSkillIds.includes(skill.id)
              const isActive = activeSkill?.id === skill.id

              return (
                <div
                  key={skill.id}
                  onClick={() => onSelectSkill(skill.id)}
                  className={cx(
                    "group flex items-center justify-between gap-2 rounded-xl p-2 transition-colors cursor-pointer border",
                    isActive
                      ? "border-accent-500/40 bg-accent-500/5 shadow-2xs"
                      : "border-transparent hover:bg-background-secondary-default/50"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleSkill(source, skill.id)
                      }}
                      className={cx(
                        "flex size-4.5 shrink-0 items-center justify-center rounded-md border transition-colors cursor-pointer",
                        isSelected
                          ? "border-accent-500 bg-accent-500 text-text-white"
                          : "border-separator-border hover:border-text-tertiary"
                      )}
                    >
                      {isSelected ? <RiCheckLine className="size-3" /> : null}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-caption-2-medium font-semibold text-text-primary">
                          {skill.name}
                        </span>
                        {skill.trigger ? (
                          <span className="rounded bg-background-secondary-default px-1 py-0.2 text-[9.5px] font-mono text-text-tertiary">
                            {skill.trigger}
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-[10.5px] font-mono text-text-tertiary">
                        {skill.relativeDir}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={(event) => {
                        event.stopPropagation()
                        setPendingDeleteSkillId(skill.id)
                      }}
                      className="rounded-md p-1 text-text-tertiary hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
                      aria-label={SKILLS_UI_COPY.deleteSkill}
                    >
                      <RiDeleteBinLine className="size-3.5" />
                    </button>
                    <span
                      className={cx(
                        "text-[9.5px] font-mono uppercase px-1 py-0.5 rounded",
                        isSelected
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium"
                          : "text-text-tertiary"
                      )}
                    >
                      {isSelected ? "ON" : "OFF"}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 右栏：SKILL.md 结构化元数据与正文 */}
        <div className="lg:col-span-7">
          <SkillDocumentViewer skill={activeSkill} />
        </div>
      </section>

      {/* 确认弹窗 */}
      <ConfirmDialog
        open={confirmDialog === "deploy"}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
        title={SKILLS_UI_COPY.confirmDeployTitle}
        description={SKILLS_UI_COPY.confirmDeployDesc}
        onConfirm={() => {
          setConfirmDialog(null)
          onDeploy()
        }}
      />

      <ConfirmDialog
        open={confirmDialog === "remove"}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
        title={SKILLS_UI_COPY.confirmRemoveTitle}
        description={SKILLS_UI_COPY.confirmRemoveDesc}
        destructive
        onConfirm={() => {
          setConfirmDialog(null)
          onRemove()
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDeleteSkillId)}
        onOpenChange={(open) => !open && setPendingDeleteSkillId(null)}
        title={SKILLS_UI_COPY.confirmDeleteSkillTitle}
        description={SKILLS_UI_COPY.confirmDeleteSkillDesc}
        destructive
        onConfirm={() => {
          const skillId = pendingDeleteSkillId
          setPendingDeleteSkillId(null)
          if (skillId) onDeleteSkill(skillId)
        }}
      />
    </div>
  )
}
