/**
 * 来源组 / 已安装技能 Bento 卡片：对标 Raycast / Figma Community 质感。
 * 专属高辨识度色彩微标、清晰的能力胶囊与一目了然的目标 Agent 激活状态。
 */
import { useState } from "react"
import {
  RiArrowRightSLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiMoreFill,
  RiRefreshLine,
  RiShieldCheckLine
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
import { useT } from "@renderer/i18n"
import {
  getHealthConfig,
  useSkillsUiCopy,
  TARGET_SHORT_LABELS
} from "../constants/skills-ui.constants"
import { resolveSkillTheme } from "../constants/skills-badge-theme"
import { hostEnabledTargetIds } from "../lib/skill-visible-for-target"

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
  const t = useT()
  const copy = useSkillsUiCopy()
  const health = getHealthConfig(t)[source.health]
  const hostTargets = hostEnabledTargetIds(source.enabledTargetIds)
  const enabledCount = hostTargets.length
  const previewSkills = source.selectedSkillIds.slice(0, 4)
  const theme = resolveSkillTheme(source.id || source.name, source.kind)
  const ThemeIcon = theme.icon
  const [confirmRemove, setConfirmRemove] = useState(false)

  return (
    <div
      onClick={onSelect}
      className={cx(
        "group relative flex flex-col justify-between rounded-2xl border p-4.5 transition-all cursor-pointer",
        "border-separator-border/70 bg-background-primary-default shadow-2xs hover:border-separator-border hover:shadow-card"
      )}
    >
      <div className="flex flex-col gap-3">
        {/* 卡片头部：专属图标微标 + 组名 + 状态 */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cx(
                "flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
                theme.badgeBg,
                theme.badgeText,
                theme.badgeBorder
              )}
            >
              <ThemeIcon className="size-5.5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-body-medium font-semibold text-text-primary tracking-tight">
                  {source.name}
                </h3>
                {theme.verified ? (
                  <span className="shrink-0 rounded-full bg-accent-500/10 px-1.5 py-0.2 text-caption-2-medium font-medium text-accent-500 dark:text-accent-500">
                    {t("pages.skills.card.verified")}
                  </span>
                ) : null}
              </div>
              <p className="truncate text-caption-2-regular text-text-tertiary">
                {source.origin}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <span
              className={cx(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption-2-medium font-medium",
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
                  className="size-7 text-text-tertiary hover:text-text-primary"
                >
                  <RiMoreFill className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={onUpdate} disabled={busy}>
                  <RiRefreshLine className="size-3.5 mr-1.5" />
                  <span>{copy.pullUpdates}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDeploy} disabled={busy}>
                  <RiShieldCheckLine className="size-3.5 mr-1.5 text-accent-500" />
                  <span>{copy.redeploySource}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmRemove(true)} className="text-chart-danger-text">
                  <RiDeleteBinLine className="size-3.5 mr-1.5" />
                  <span>{copy.removeSource}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 激活助手状态行 */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl bg-background-secondary-default/50 p-2 text-caption-2-medium">
          <span className="text-text-tertiary font-medium mr-1">{t("pages.skills.card.activatedAgents")}</span>
          {enabledCount === 0 ? (
            <span className="text-text-tertiary italic">{t("pages.skills.states.noneActive")}</span>
          ) : (
            hostTargets.map((targetId) => (
              <span
                key={targetId}
                className="inline-flex items-center gap-1 rounded-md bg-background-primary-default px-1.5 py-0.5 text-caption-2-medium font-medium text-text-primary border border-separator-border/40 shadow-2xs"
              >
                <RiCheckLine className="size-2.5 text-state-success-text" />
                {TARGET_SHORT_LABELS[targetId]}
              </span>
            ))
          )}
        </div>

        {/* 技能能力胶囊预览 */}
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap gap-1">
            {source.selectedSkillIds.length === 0 ? (
              <span className="text-caption-2-regular text-text-tertiary italic">
                {t("pages.skills.card.allUnselected")}
              </span>
            ) : (
              previewSkills.map((skillId) => {
                const cleanName = skillId === "." ? source.name : skillId.split("/").pop() || skillId
                return (
                  <span
                    key={skillId}
                    className="rounded-md border border-separator-border/60 bg-background-primary-default px-2 py-0.5 text-caption-2-regular font-mono text-text-secondary"
                  >
                    {cleanName}
                  </span>
                )
              })
            )}
            {source.selectedSkillIds.length > 4 ? (
              <span className="rounded-md bg-background-secondary-default px-1.5 py-0.5 text-caption-2-regular text-text-tertiary">
                +{source.selectedSkillIds.length - 4}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* 底栏详情引导 */}
      <div className="mt-3.5 flex items-center justify-between border-t border-separator-border/40 pt-2.5 text-caption-2-regular">
        <span className="font-mono text-text-tertiary">
          {t("pages.skills.card.countPrefix")}
          <b className="text-text-primary font-medium">{source.skillCount}</b>
          {t("pages.skills.card.countSuffix")}
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-accent-600 dark:text-accent-400 group-hover:translate-x-0.5 transition-transform">
          <span>{t("pages.skills.card.manage")}</span>
          <RiArrowRightSLine className="size-3.5" />
        </span>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={copy.confirmRemoveTitle}
        description={copy.confirmRemoveDesc}
        destructive
        onConfirm={() => {
          setConfirmRemove(false)
          onRemove()
        }}
      />
    </div>
  )
}
