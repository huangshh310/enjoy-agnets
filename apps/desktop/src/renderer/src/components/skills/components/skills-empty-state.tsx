/**
 * 空态与精选推荐工作流组：内嵌快捷 Git/本地导入条与热门库一键安装。
 */
import { useState } from "react"
import {
  RiDownloadLine,
  RiFolderOpenLine,
  RiGitRepositoryLine,
  RiLoader4Line,
  RiSparklingLine,
  RiStarLine
} from "@remixicon/react"
import type { CuratedSkillSource, SkillTargetId } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SKILLS_UI_COPY, TARGET_SHORT_LABELS } from "../constants/skills-ui.constants"

export function SkillsEmptyState({
  curated,
  busy,
  activeTargetId,
  onClearTargetFilter,
  onAddGit,
  onPickFolder,
  onInstallCurated
}: {
  curated: CuratedSkillSource[]
  busy: boolean
  activeTargetId?: SkillTargetId | null
  onClearTargetFilter?: () => void
  onAddGit: (origin: string) => void
  onPickFolder: () => void
  onInstallCurated: (source: CuratedSkillSource) => void
}) {
  const [gitInput, setGitInput] = useState("")

  function handleGitSubmit() {
    if (!gitInput.trim() || busy) return
    onAddGit(gitInput.trim())
    setGitInput("")
  }

  return (
    <div className="flex flex-col gap-6">
      {activeTargetId ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-500/30 bg-accent-500/10 p-4">
          <div className="flex items-center gap-2">
            <span className="text-caption-1-medium font-semibold text-text-primary">
              当前目标筛选：{TARGET_SHORT_LABELS[activeTargetId]}
            </span>
            <span className="text-[11.5px] text-text-tertiary">
              （暂无关联或投影到该 Agent 的技能组）
            </span>
          </div>
          {onClearTargetFilter ? (
            <Button size="sm" variant="outline" onClick={onClearTargetFilter} className="h-7.5 text-caption-2-medium">
              查看全部来源
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* 顶部快速导入条 */}
      <div className="flex flex-col gap-3 rounded-2xl border border-separator-border/80 bg-background-secondary-default/30 p-5 shadow-2xs">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-caption-1-medium font-semibold text-text-primary">
            {activeTargetId
              ? `没有投影到 ${TARGET_SHORT_LABELS[activeTargetId]} 的来源组`
              : SKILLS_UI_COPY.emptyTitle}
          </h2>
          <p className="text-caption-2-regular text-text-tertiary">
            {activeTargetId
              ? "点「查看全部来源」看本机已有技能组，或从下方精选库导入并投影到该 Agent。"
              : SKILLS_UI_COPY.emptyDesc}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <RiGitRepositoryLine className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
            <Input
              value={gitInput}
              onChange={(e) => setGitInput(e.target.value)}
              placeholder={SKILLS_UI_COPY.quickGitPlaceholder}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleGitSubmit()
              }}
              className="pl-9 h-8.5 font-mono text-caption-2-medium bg-background-primary-default"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              disabled={busy || !gitInput.trim()}
              onClick={handleGitSubmit}
              className="gap-1.5 h-8.5 text-caption-2-medium"
            >
              {busy ? <RiLoader4Line className="size-3.5 animate-spin" /> : <RiDownloadLine className="size-3.5" />}
              <span>{SKILLS_UI_COPY.addGitBtn}</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={onPickFolder}
              className="gap-1.5 h-8.5 text-caption-2-medium"
            >
              <RiFolderOpenLine className="size-3.5 text-text-tertiary" />
              <span>{SKILLS_UI_COPY.pickFolderBtn}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 精选工作流库推荐矩阵 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-lg bg-accent-500/10 text-accent-600 dark:text-accent-400">
              <RiSparklingLine className="size-3.5" />
            </div>
            <div>
              <h3 className="text-caption-1-medium font-semibold text-text-primary">
                {SKILLS_UI_COPY.featuredTitle}
              </h3>
              <p className="text-[11px] text-text-tertiary">
                {SKILLS_UI_COPY.featuredSubtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {curated.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-2xl border border-separator-border/70 bg-background-primary-default p-4 shadow-2xs transition-all hover:border-separator-border hover:shadow-card"
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-caption-1-medium font-semibold text-text-primary">
                      {item.title}
                    </h4>
                    <span className="text-[11px] font-mono text-text-tertiary">
                      {item.name}
                    </span>
                  </div>
                  {item.stars ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-amber-600 dark:text-amber-400 shrink-0">
                      <RiStarLine className="size-3" />
                      {item.stars.toLocaleString()}
                    </span>
                  ) : null}
                </div>

                <p className="text-[11.5px] text-text-secondary leading-relaxed line-clamp-2">
                  {item.description}
                </p>

                <div className="flex flex-wrap gap-1 pt-1">
                  {item.featuredSkills.slice(0, 3).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-md bg-background-secondary-default px-1.5 py-0.5 text-[10px] font-mono text-text-secondary"
                    >
                      {skill}
                    </span>
                  ))}
                  {item.featuredSkills.length > 3 ? (
                    <span className="rounded-md bg-background-secondary-default px-1 py-0.5 text-[10px] text-text-tertiary">
                      +{item.featuredSkills.length - 3}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-separator-border/40 flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-mono text-text-tertiary">
                  {item.skillCount} 个预置技能
                </span>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => onInstallCurated(item)}
                  className="gap-1 h-7 text-[11px] font-medium"
                >
                  {busy ? (
                    <RiLoader4Line className="size-3 animate-spin text-accent-500" />
                  ) : (
                    <RiDownloadLine className="size-3 text-accent-500" />
                  )}
                  <span>{busy ? "导入中…" : SKILLS_UI_COPY.oneClickInstall}</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
