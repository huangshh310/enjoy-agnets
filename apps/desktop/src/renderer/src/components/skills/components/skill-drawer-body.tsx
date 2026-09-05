/**
 * 技能详情抽屉滚动区：助手挂载行、元数据与指令正文。
 */
import { RiCheckLine } from "@remixicon/react"
import type { InstalledSkillItem, SkillSource, SkillTargetId } from "@enjoy-agents/ipc-contract"
import { cx } from "@/utils/cx"
import { AGENT_ARMORY_PROFILES } from "../constants/agent-armory.constants"
import {
  GLOBAL_TARGET_IDS,
  TARGET_SHORT_LABELS,
  WORKSPACE_TARGET_IDS
} from "../constants/skills-ui.constants"

export function SkillDrawerBody({
  skill,
  source,
  hasWorkspace,
  busy,
  metadata,
  bodyText,
  onToggleTarget
}: {
  skill: InstalledSkillItem
  source?: SkillSource
  hasWorkspace: boolean
  busy: boolean
  metadata: Record<string, string> | null
  bodyText: string
  onToggleTarget: (source: SkillSource, targetId: SkillTargetId) => void
}) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5 [scrollbar-width:thin]">
      {skill.description ? (
        <p className="text-body-regular text-text-secondary leading-relaxed">
          {skill.description}
        </p>
      ) : null}

      {source ? (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="text-caption-1-medium font-semibold text-text-primary">
              生效目标助手
            </h4>
            <span className="text-caption-2-regular text-text-tertiary">
              点击行切换来源组投影
            </span>
          </div>
          <div className="flex flex-col rounded-2xl border border-separator-border/70 overflow-hidden">
            {GLOBAL_TARGET_IDS.map((targetId, index) => {
              const isEnabled = source.enabledTargetIds.includes(targetId)
              const profile = AGENT_ARMORY_PROFILES[targetId]
              const Icon = profile?.icon
              return (
                <button
                  key={targetId}
                  type="button"
                  disabled={busy}
                  onClick={() => onToggleTarget(source, targetId)}
                  className={cx(
                    "flex items-center gap-3 px-3.5 py-3 text-left transition-colors cursor-pointer",
                    index > 0 && "border-t border-separator-border/50",
                    isEnabled
                      ? "bg-background-secondary-default/40"
                      : "hover:bg-background-secondary-default/30"
                  )}
                >
                  <span
                    className={cx(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl border",
                      isEnabled
                        ? cx(profile?.themeColor.bg, profile?.themeColor.border, profile?.themeColor.text)
                        : "border-separator-border/60 bg-background-secondary-default text-text-tertiary"
                    )}
                  >
                    {Icon ? <Icon className="size-4" /> : null}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-caption-1-medium font-semibold text-text-primary truncate">
                      {TARGET_SHORT_LABELS[targetId]}
                    </span>
                    <span className="block text-caption-2-regular text-text-tertiary truncate">
                      {isEnabled ? "已随来源组投影" : "未挂载"}
                    </span>
                  </span>
                  <span
                    className={cx(
                      "flex size-5 items-center justify-center rounded-full border",
                      isEnabled
                        ? "border-accent-500 bg-accent-500 text-text-white"
                        : "border-separator-border/80 text-transparent"
                    )}
                  >
                    <RiCheckLine className="size-3" />
                  </span>
                </button>
              )
            })}
          </div>

          {hasWorkspace ? (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-caption-2-regular text-text-tertiary">工作区:</span>
              {WORKSPACE_TARGET_IDS.map((targetId) => {
                const isEnabled = source.enabledTargetIds.includes(targetId)
                return (
                  <button
                    key={targetId}
                    type="button"
                    disabled={busy}
                    onClick={() => onToggleTarget(source, targetId)}
                    className={cx(
                      "rounded-lg border px-2 py-0.5 text-caption-2-regular font-mono cursor-pointer",
                      isEnabled
                        ? "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        : "border-separator-border/50 text-text-tertiary hover:text-text-secondary"
                    )}
                  >
                    {TARGET_SHORT_LABELS[targetId]}
                  </button>
                )
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {metadata && (metadata.version || skill.relativeDir) ? (
        <div className="flex flex-wrap gap-1.5">
          {metadata.version ? (
            <span className="rounded-lg border border-separator-border/50 bg-background-secondary-default/50 px-2.5 py-1 text-caption-2-regular font-mono text-text-secondary">
              v{metadata.version}
            </span>
          ) : null}
          {skill.relativeDir ? (
            <span className="rounded-lg border border-separator-border/50 bg-background-secondary-default/50 px-2.5 py-1 text-caption-2-regular font-mono text-text-secondary">
              {skill.relativeDir}
            </span>
          ) : null}
        </div>
      ) : null}

      <section className="flex flex-col gap-2">
        <h4 className="text-caption-1-medium font-semibold text-text-primary">
          指令说明
        </h4>
        <pre className="rounded-2xl border border-separator-border/60 bg-background-secondary-default/30 p-4 font-mono text-caption-2-regular text-text-primary whitespace-pre-wrap leading-relaxed">
          {bodyText}
        </pre>
      </section>
    </div>
  )
}
