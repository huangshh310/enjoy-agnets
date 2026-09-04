/**
 * SKILL.md 文档与元数据检视器。
 */
import { useState } from "react"
import {
  RiCheckLine,
  RiClipboardLine,
  RiFileCodeLine,
  RiFolderOpenLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import type { SkillSourceSkill } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { getIde, hasIde } from "@renderer/lib/ide"
import { SKILLS_UI_COPY } from "../constants/skills-ui.constants"

export function SkillDocumentViewer({
  skill,
  onRevealFolder
}: {
  skill: SkillSourceSkill | null
  onRevealFolder?: (filePath: string) => void
}) {
  const [copied, setCopied] = useState(false)

  if (!skill) {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-separator-border/80 bg-background-secondary-default/20 p-8 text-center text-text-tertiary">
        <RiFileCodeLine className="size-8 text-text-tertiary mb-2 opacity-50" />
        <p className="text-caption-1-medium text-text-secondary">{SKILLS_UI_COPY.skillDocTitle}</p>
        <p className="mt-1 max-w-xs text-[11px] text-text-tertiary">{SKILLS_UI_COPY.selectSkillHint}</p>
      </div>
    )
  }

  function handleCopy() {
    if (!skill?.content) return
    void navigator.clipboard.writeText(skill.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleReveal() {
    if (!skill?.skillFilePath || !hasIde()) return
    void getIde().skills.reveal(skill.skillFilePath)
    if (onRevealFolder) onRevealFolder(skill.skillFilePath)
  }

  return (
    <div className="flex flex-col rounded-2xl border border-separator-border/70 bg-background-primary-default overflow-hidden shadow-2xs">
      {/* 头部元数据栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-separator-border/70 bg-background-secondary-default/30 px-5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-caption-1-medium font-semibold text-text-primary truncate">
              {skill.name}
            </h3>
            {skill.trigger ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-accent-500/10 px-1.5 py-0.5 text-[10.5px] font-mono font-medium text-accent-600 dark:text-accent-400">
                <RiTerminalBoxLine className="size-3" />
                {skill.trigger}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] font-mono text-text-tertiary truncate">
            {skill.skillFilePath || skill.relativeDir}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {skill.skillFilePath ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReveal}
              className="gap-1 h-7 px-2 text-[11px]"
            >
              <RiFolderOpenLine className="size-3 text-text-tertiary" />
              <span>{SKILLS_UI_COPY.revealFolder}</span>
            </Button>
          ) : null}

          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="gap-1 h-7 px-2 text-[11px]"
          >
            {copied ? (
              <>
                <RiCheckLine className="size-3 text-emerald-500" />
                <span>已复制</span>
              </>
            ) : (
              <>
                <RiClipboardLine className="size-3" />
                <span>{SKILLS_UI_COPY.copyDefinition}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 参数说明条 */}
      {skill.description ? (
        <div className="border-b border-separator-border/50 bg-background-secondary-default/10 px-5 py-2.5">
          <p className="text-[11.5px] text-text-secondary leading-relaxed">
            {skill.description}
          </p>
        </div>
      ) : null}

      {/* Markdown 正文预览 */}
      <div className="p-5 max-h-[550px] overflow-y-auto">
        <pre className="font-mono text-[11.5px] text-text-primary whitespace-pre-wrap leading-relaxed">
          {skill.content || "# " + skill.name + "\n\n" + (skill.description || "")}
        </pre>
      </div>
    </div>
  )
}
