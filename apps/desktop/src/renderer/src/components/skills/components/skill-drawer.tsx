/**
 * 技能能力画卷抽屉 (Skill Drawer)：对标现代桌面应用的平滑侧边抽屉。
 * 优雅解析元数据、一键复制触发词、直接切换生效助手，并呈现排版清爽的 Markdown 指令文档。
 */
import { useMemo, useState } from "react"
import {
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiFolderOpenLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import type { InstalledSkillItem, SkillSource, SkillTargetId } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { getIde, hasIde } from "@renderer/lib/ide"
import {
  GLOBAL_TARGET_IDS,
  SKILLS_UI_COPY,
  TARGET_SHORT_LABELS,
  WORKSPACE_TARGET_IDS
} from "../constants/skills-ui.constants"
import { resolveSkillTheme } from "../constants/skills-badge-theme"

export function SkillDrawer({
  skill,
  source,
  hasWorkspace,
  busy,
  onClose,
  onToggleTarget,
  onDeleteSkill
}: {
  skill: InstalledSkillItem | null
  source?: SkillSource
  hasWorkspace: boolean
  busy: boolean
  onClose: () => void
  onToggleTarget: (source: SkillSource, targetId: SkillTargetId) => void
  onDeleteSkill: (sourceId: string, skillId: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const theme = useMemo(() => {
    if (!skill) return null
    return resolveSkillTheme(skill.name + " " + (skill.description || ""))
  }, [skill])

  const trigger = useMemo(() => {
    if (!skill) return ""
    return skill.trigger || (skill.name.includes(" ") ? `@${skill.id}` : `@${skill.name}`)
  }, [skill])

  // 解析并剥离原始 YAML Frontmatter，提取纯正文
  const { metadata, bodyText } = useMemo(() => {
    if (!skill?.content) return { metadata: null, bodyText: skill?.description || "" }
    const match = skill.content.match(/^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/)
    if (!match) return { metadata: null, bodyText: skill.content }

    const rawYaml = match[1] ?? ""
    const cleanBody = match[2]?.trim() ?? ""
    const meta: Record<string, string> = {}
    for (const line of rawYaml.split("\n")) {
      const idx = line.indexOf(":")
      if (idx > 0) {
        const k = line.slice(0, idx).trim()
        const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "")
        if (k && v) meta[k] = v
      }
    }
    return { metadata: meta, bodyText: cleanBody || skill.content }
  }, [skill])

  if (!skill || !theme) return null

  const ThemeIcon = theme.icon

  function handleCopy() {
    void navigator.clipboard.writeText(trigger)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleReveal() {
    if (!skill?.skillFilePath || !hasIde()) return
    void getIde().skills.reveal(skill.skillFilePath)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative flex h-full w-full max-w-xl flex-col border-l border-separator-border/80 bg-background-primary-default shadow-2xl animate-in slide-in-from-right duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 抽屉顶栏控制 */}
        <header className="flex items-center justify-between border-b border-separator-border/60 px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cx(
                "flex size-11 shrink-0 items-center justify-center rounded-xl border shadow-xs",
                theme.badgeBg,
                theme.badgeText,
                theme.badgeBorder
              )}
            >
              <ThemeIcon className="size-6" />
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-title-3-semibold text-text-primary tracking-tight">
                {skill.name}
              </h3>
              <p className="truncate text-caption-2-regular text-text-tertiary">
                所属合集：{skill.sourceName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-text-tertiary hover:bg-background-secondary-default hover:text-text-primary transition-colors cursor-pointer"
          >
            <RiCloseLine className="size-5" />
          </button>
        </header>

        {/* 抽屉主滚动区域 */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* 快捷动作条 */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={handleCopy}
              className="gap-1.5 h-8 text-caption-2-medium shadow-xs"
            >
              {copied ? <RiCheckLine className="size-3.5 text-emerald-400" /> : <RiTerminalBoxLine className="size-3.5" />}
              <span>{copied ? "已复制触发词" : `复制触发指令 ${trigger}`}</span>
            </Button>

            {skill.skillFilePath ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReveal}
                className="gap-1.5 h-8 text-caption-2-medium"
              >
                <RiFolderOpenLine className="size-3.5 text-text-tertiary" />
                <span>定位源文件</span>
              </Button>
            ) : null}

            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
              className="gap-1 h-8 text-caption-2-medium text-rose-600 dark:text-rose-400 hover:border-rose-500/40 ml-auto"
            >
              <RiDeleteBinLine className="size-3.5" />
              <span>删除技能</span>
            </Button>
          </div>

          {/* 生效的 AI 助手矩阵 */}
          {source ? (
            <div className="flex flex-col gap-2 rounded-2xl border border-separator-border/70 bg-background-secondary-default/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-caption-1-medium font-semibold text-text-primary">
                  生效目标助手 (Active Agents)
                </span>
                <span className="text-[11px] text-text-tertiary">点击直接开启或关闭</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {GLOBAL_TARGET_IDS.map((targetId) => {
                  const isEnabled = source.enabledTargetIds.includes(targetId)
                  return (
                    <button
                      key={targetId}
                      type="button"
                      disabled={busy}
                      onClick={() => onToggleTarget(source, targetId)}
                      className={cx(
                        "flex items-center justify-between rounded-xl border p-2.5 text-left transition-all cursor-pointer",
                        isEnabled
                          ? "border-accent-500/40 bg-background-primary-default text-text-primary shadow-2xs"
                          : "border-separator-border/60 bg-transparent text-text-tertiary hover:border-separator-border"
                      )}
                    >
                      <span className="text-caption-2-medium font-medium">
                        {TARGET_SHORT_LABELS[targetId]}
                      </span>
                      <span
                        className={cx(
                          "flex size-4 items-center justify-center rounded-full text-[9px] font-bold",
                          isEnabled ? "bg-emerald-500 text-white" : "bg-separator-border/50 text-text-tertiary"
                        )}
                      >
                        {isEnabled ? "✓" : ""}
                      </span>
                    </button>
                  )
                })}
              </div>

              {hasWorkspace ? (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-separator-border/40 text-[11px]">
                  <span className="text-text-tertiary font-medium">工作区目录:</span>
                  {WORKSPACE_TARGET_IDS.map((targetId) => {
                    const isEnabled = source.enabledTargetIds.includes(targetId)
                    return (
                      <button
                        key={targetId}
                        type="button"
                        onClick={() => onToggleTarget(source, targetId)}
                        className={cx(
                          "rounded-md border px-2 py-0.5 text-[10px] font-mono transition-colors cursor-pointer",
                          isEnabled
                            ? "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium"
                            : "border-separator-border/50 text-text-tertiary hover:text-text-secondary"
                        )}
                      >
                        {isEnabled ? "✓ " : ""}{TARGET_SHORT_LABELS[targetId]}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* 结构化元数据胶囊 */}
          {metadata ? (
            <div className="flex flex-wrap gap-2">
              {metadata.version ? (
                <span className="rounded-lg bg-background-secondary-default px-2.5 py-1 text-[11px] font-mono text-text-secondary border border-separator-border/40">
                  版本: v{metadata.version}
                </span>
              ) : null}
              {metadata.author ? (
                <span className="rounded-lg bg-background-secondary-default px-2.5 py-1 text-[11px] font-mono text-text-secondary border border-separator-border/40">
                  作者: {metadata.author}
                </span>
              ) : null}
              {skill.relativeDir ? (
                <span className="rounded-lg bg-background-secondary-default px-2.5 py-1 text-[11px] font-mono text-text-secondary border border-separator-border/40">
                  目录: {skill.relativeDir}
                </span>
              ) : null}
            </div>
          ) : null}

          {/* 功能介绍 */}
          {skill.description ? (
            <div className="flex flex-col gap-1.5 rounded-2xl border border-separator-border/70 bg-background-secondary-default/20 p-4">
              <h4 className="text-caption-1-medium font-semibold text-text-primary">
                功能概述
              </h4>
              <p className="text-[12.5px] text-text-secondary leading-relaxed">
                {skill.description}
              </p>
            </div>
          ) : null}

          {/* 清爽的 Markdown 指令正文（无生硬 Frontmatter） */}
          <div className="flex flex-col gap-2 rounded-2xl border border-separator-border/70 bg-background-primary-default p-5 shadow-2xs">
            <h4 className="text-caption-1-medium font-semibold text-text-primary pb-2 border-b border-separator-border/40">
              指令说明与范例 (Prompt Instructions)
            </h4>
            <pre className="font-mono text-[11.5px] text-text-primary whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {bodyText}
            </pre>
          </div>
        </div>

        {/* 确认删除对话框 */}
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={SKILLS_UI_COPY.confirmDeleteSkillTitle}
          description={SKILLS_UI_COPY.confirmDeleteSkillDesc}
          destructive
          onConfirm={() => {
            setConfirmDelete(false)
            onDeleteSkill(skill.sourceId, skill.id)
            onClose()
          }}
        />
      </div>
    </div>
  )
}
