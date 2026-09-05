/**
 * 现代 IDE 级技能文档与规范检视器 (Skill Doc Inspector)。
 * 结构化解析 YAML Frontmatter 元数据看板，提供规范化排版与文件定位工具。
 */
import { useMemo, useState } from "react"
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
import { SKILLS_UI_COPY } from "../../constants/skills-ui.constants"

export function SkillDocInspector({
  skill,
  onRevealFolder
}: {
  skill: SkillSourceSkill | null
  onRevealFolder?: (filePath: string) => void
}) {
  const [copied, setCopied] = useState(false)

  // 解析 YAML Frontmatter 元数据
  const { frontmatter, markdownBody } = useMemo(() => {
    if (!skill?.content) {
      return { frontmatter: null, markdownBody: "" }
    }

    const content = skill.content
    if (content.startsWith("---")) {
      const secondFenceIndex = content.indexOf("---", 3)
      if (secondFenceIndex !== -1) {
        const yamlStr = content.slice(3, secondFenceIndex).trim()
        const bodyStr = content.slice(secondFenceIndex + 3).trim()

        const meta: Record<string, string> = {}
        for (const line of yamlStr.split("\n")) {
          const colonIdx = line.indexOf(":")
          if (colonIdx > 0) {
            const key = line.slice(0, colonIdx).trim()
            const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, "")
            if (key && val) meta[key] = val
          }
        }

        return { frontmatter: meta, markdownBody: bodyStr }
      }
    }

    return { frontmatter: null, markdownBody: content }
  }, [skill?.content])

  if (!skill) {
    return (
      <div className="flex h-[620px] flex-col items-center justify-center rounded-3xl border border-dashed border-separator-border/80 bg-background-secondary-default/20 p-8 text-center text-text-tertiary lg:col-span-7">
        <RiFileCodeLine className="size-10 mb-2 opacity-50" />
        <p className="text-caption-1-medium text-text-secondary">{SKILLS_UI_COPY.skillDocTitle}</p>
        <p className="max-w-xs text-caption-2-regular text-text-tertiary mt-1">
          {SKILLS_UI_COPY.selectSkillHint}
        </p>
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
    <div className="flex flex-col rounded-3xl border border-separator-border/80 bg-background-primary-default overflow-hidden shadow-2xs lg:col-span-7 h-[620px]">
      {/* 头部元数据栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-separator-border/70 bg-background-secondary-default/30 px-5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-title-3-semibold font-semibold text-text-primary truncate tracking-tight">
              {skill.name}
            </h3>
            {skill.trigger ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-accent-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-accent-700 dark:text-accent-300 border border-accent-500/20">
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
              className="gap-1 h-7.5 px-2.5 text-caption-2-medium"
            >
              <RiFolderOpenLine className="size-3.5 text-text-tertiary" />
              <span>{SKILLS_UI_COPY.revealFolder}</span>
            </Button>
          ) : null}

          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="gap-1 h-7.5 px-2.5 text-caption-2-medium"
          >
            {copied ? (
              <>
                <RiCheckLine className="size-3.5 text-emerald-500" />
                <span>已复制</span>
              </>
            ) : (
              <>
                <RiClipboardLine className="size-3.5" />
                <span>{SKILLS_UI_COPY.copyDefinition}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Frontmatter 结构化参数属性条 */}
      {frontmatter ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-separator-border/50 bg-background-secondary-default/20 px-5 py-2.5 text-[11px]">
          {frontmatter.version ? (
            <span className="inline-flex items-center gap-1 rounded bg-background-primary-default px-2 py-0.5 font-mono text-text-secondary border border-separator-border/40">
              <span className="text-text-tertiary">v</span>
              {frontmatter.version}
            </span>
          ) : null}
          {frontmatter["user-invocable"] ? (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              用户可直接调用
            </span>
          ) : null}
          {frontmatter["argument-hint"] ? (
            <span className="inline-flex items-center gap-1 rounded bg-background-primary-default px-2 py-0.5 font-mono text-text-secondary border border-separator-border/40 truncate max-w-sm">
              <span className="text-text-tertiary">args:</span>
              {frontmatter["argument-hint"]}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* 技能主要职责描述 */}
      {skill.description ? (
        <div className="border-b border-separator-border/50 bg-background-secondary-default/10 px-5 py-3">
          <p className="text-[12.5px] text-text-secondary leading-relaxed">
            {skill.description}
          </p>
        </div>
      ) : null}

      {/* 正文 Markdown 检视视口 */}
      <div className="flex-1 p-5 overflow-y-auto bg-background-secondary-default/15 font-mono text-[11.5px] leading-relaxed">
        <pre className="text-text-primary whitespace-pre-wrap select-text">
          {markdownBody || skill.content}
        </pre>
      </div>
    </div>
  )
}
