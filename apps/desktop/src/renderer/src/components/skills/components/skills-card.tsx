/**
 * 来源组 Bento 卡片：对标 技能来源 主页卡片。
 */
import { useState } from "react"
import {
  RiArrowRightSLine,
  RiDeleteBinLine,
  RiFolderLine,
  RiGitRepositoryLine,
  RiMoreFill,
  RiRefreshLine
} from "@remixicon/react"
import type { SkillSource } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { cx } from "@/utils/cx"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import {
  HEALTH_CONFIG,
  SKILLS_UI_COPY,
  TARGET_SHORT_LABELS
} from "../constants/skills-ui.constants"

export function SkillsCard({
  source,
  busy,
  onSelect,
  onUpdate,
  onDeploy,
  onRemove
}: {
  source: SkillSource
  busy: boolean
  onSelect: () => void
  onUpdate: () => void
  onDeploy: () => void
  onRemove: () => void
}) {
  const health = HEALTH_CONFIG[source.health]
  const enabledCount = source.enabledTargetIds.length
  const previewSkills = source.selectedSkillIds.slice(0, 3)
  const [confirmRemove, setConfirmRemove] = useState(false)

  return (
    <div
      onClick={onSelect}
      className="group relative flex flex-col justify-between rounded-2xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs transition-all duration-200 hover:border-separator-border hover:shadow-card cursor-pointer"
    >
      <div className="flex flex-col gap-3">
        {/* 顶部标题与状态 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
              {source.kind === "git" ? (
                <RiGitRepositoryLine className="size-4" />
              ) : (
                <RiFolderLine className="size-4" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-caption-1-medium font-semibold text-text-primary group-hover:text-accent-500 transition-colors">
                {source.name}
              </h3>
              <p className="truncate text-caption-2-regular text-text-tertiary">
                {source.origin}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span
              className={cx(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                health.badgeClass
              )}
            >
              <span className={cx("size-1.5 rounded-full", health.dotClass)} />
              {health.label}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="size-6 text-text-tertiary hover:text-text-primary"
                >
                  <RiMoreFill className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={onUpdate} disabled={busy}>
                  <RiRefreshLine className="size-3.5 mr-1.5" />
                  <span>{SKILLS_UI_COPY.pullUpdates}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDeploy} disabled={busy}>
                  <RiRefreshLine className="size-3.5 mr-1.5 text-accent-500" />
                  <span>{SKILLS_UI_COPY.redeploySource}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmRemove(true)} className="text-rose-600 dark:text-rose-400">
                  <RiDeleteBinLine className="size-3.5 mr-1.5" />
                  <span>{SKILLS_UI_COPY.removeSource}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* AGENTS 目标行 */}
        <div className="flex flex-col gap-1 rounded-xl bg-background-secondary-default/40 p-2.5">
          <div className="flex items-center justify-between text-[10.5px] font-medium text-text-tertiary">
            <span>AGENTS 目标 ({enabledCount})</span>
            <span
              className={cx(
                "font-mono uppercase text-[9.5px] px-1 py-0.2 rounded",
                enabledCount > 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-background-secondary-default text-text-tertiary"
              )}
            >
              {enabledCount > 0 ? "Active" : "Off"}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {source.enabledTargetIds.length === 0 ? (
              <span className="text-[11px] text-text-tertiary italic">未启用任何目标 Agent</span>
            ) : (
              source.enabledTargetIds.map((targetId) => (
                <span
                  key={targetId}
                  className="rounded-md border border-separator-border/60 bg-background-primary-default px-1.5 py-0.5 text-[10.5px] font-medium text-text-secondary"
                >
                  {TARGET_SHORT_LABELS[targetId]}
                </span>
              ))
            )}
          </div>
        </div>

        {/* SKILLS 技能胶囊行 */}
        <div className="flex flex-col gap-1">
          <span className="text-[10.5px] font-medium text-text-tertiary">
            SKILLS 技能 ({source.skillCount})
          </span>
          <div className="flex flex-wrap gap-1">
            {source.selectedSkillIds.length === 0 ? (
              <span className="text-[11px] text-text-tertiary italic">未选择技能</span>
            ) : (
              previewSkills.map((skillId) => {
                const name = skillId.split("/").at(-1) || skillId
                return (
                  <span
                    key={skillId}
                    className="inline-flex items-center gap-1 rounded-md bg-accent-500/10 px-1.5 py-0.5 text-[10.5px] font-medium text-accent-600 dark:text-accent-400 truncate max-w-[120px]"
                  >
                    <span className="text-[9px] font-bold opacity-75">ON</span>
                    <span className="truncate">{name}</span>
                  </span>
                )
              })
            )}
            {source.selectedSkillIds.length > 3 ? (
              <span className="rounded-md bg-background-secondary-default px-1.5 py-0.5 text-[10px] text-text-tertiary">
                +{source.selectedSkillIds.length - 3}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-separator-border/40 pt-2 text-[11px] text-text-tertiary">
        <span>点击展开技能清单与文档检视</span>
        <RiArrowRightSLine className="size-4 text-text-tertiary group-hover:translate-x-0.5 transition-transform" />
      </div>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={SKILLS_UI_COPY.confirmRemoveTitle}
        description={SKILLS_UI_COPY.confirmRemoveDesc}
        destructive
        onConfirm={() => {
          setConfirmRemove(false)
          onRemove()
        }}
      />
    </div>
  )
}
