/**
 * 现代 IDE 级技能文档与规范检视器 (Skill Doc Inspector)。
 * Frontmatter 属性条下方叠规范软条带 + 问题 chip；allowed-tools 仅展示。
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
import {
  skillFrontmatterIssueChip,
  validateSkillFrontmatter
} from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import { SKILLS_UI_COPY } from "../../constants/skills-ui.constants"

export function SkillDocInspector({
  skill,
  onRevealFolder
}: {
  skill: SkillSourceSkill | null
  onRevealFolder?: (filePath: string) => void
}) {
  const t = useT()
  const [copied, setCopied] = useState(false)

  const { frontmatter, markdownBody } = useMemo(() => {
    if (!skill?.content) {
      return { frontmatter: null as Record<string, string> | null, markdownBody: "" }
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

  const issues = useMemo(() => {
    if (skill?.issues && skill.issues.length > 0) return skill.issues
    if (!frontmatter) return []
    return validateSkillFrontmatter({
      name: frontmatter.name ?? skill?.name,
      description: frontmatter.description,
      compatibility: frontmatter.compatibility
    }).issues
  }, [skill, frontmatter])

  const allowedTools = skill?.allowedTools || frontmatter?.["allowed-tools"]

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
    <div
      data-testid="skill-doc-inspector"
      className="flex flex-col rounded-3xl border border-separator-border/80 bg-background-primary-default overflow-hidden shadow-2xs lg:col-span-7 h-[620px]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-separator-border/70 bg-background-secondary-default/30 px-5 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-title-3-semibold font-semibold text-text-primary truncate tracking-tight">
              {skill.name}
            </h3>
            {skill.trigger ? (
              <span
                data-testid="skill-inspector-callsign"
                title={t("pages.skills.itemCard.localCallsign")}
                className="inline-flex items-center gap-1 rounded-md bg-accent-500/10 px-2 py-0.5 text-caption-2-medium font-mono font-medium text-accent-700 dark:text-accent-300 border border-accent-500/20"
              >
                <RiTerminalBoxLine className="size-3" />
                {skill.trigger}
                <span className="text-[9px] font-sans font-normal text-text-tertiary">
                  {t("pages.skills.itemCard.localCallsign")}
                </span>
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-caption-2-regular font-mono text-text-tertiary truncate">
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
                <RiCheckLine className="size-3.5 text-state-success-text" />
                <span>{t("pages.skills.docInspector.copied")}</span>
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

      {frontmatter ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-separator-border/50 bg-background-secondary-default/20 px-5 py-2.5 text-caption-2-regular">
          {frontmatter.version ? (
            <span className="inline-flex items-center gap-1 rounded bg-background-primary-default px-2 py-0.5 font-mono text-text-secondary border border-separator-border/40">
              <span className="text-text-tertiary">v</span>
              {frontmatter.version}
            </span>
          ) : null}
          {frontmatter["user-invocable"] ? (
            <span className="inline-flex items-center gap-1 rounded bg-state-success-text/10 px-2 py-0.5 font-mono text-state-success-text dark:text-state-success-text border border-state-success-text/20">
              {t("pages.skills.docInspector.userInvocable")}
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

      {/* 规范软条带：叠在 Frontmatter 条下方；禁绿已批徽 */}
      <div
        data-testid="skill-norm-strip"
        className="flex flex-wrap items-center gap-2 border-b border-[#E8E4DE] bg-[#F7F5F2]/80 px-5 py-2 text-caption-2-regular"
      >
        <span className="text-text-tertiary text-[10px] font-medium tracking-wide">
          {t("pages.skills.docInspector.normLabel")}
        </span>
        {issues.length === 0 ? (
          <span className="text-text-tertiary text-[10px]">{t("pages.skills.docInspector.normOk")}</span>
        ) : (
          issues.map((row) => (
            <span
              key={`${row.path}:${row.code}`}
              data-testid="skill-norm-chip"
              className="inline-flex items-center rounded-md bg-[#FFF7ED] px-2 py-0.5 text-[10px] font-medium text-[#C2410C] ring-1 ring-[#C2410C]/25"
            >
              {skillFrontmatterIssueChip(row)}
            </span>
          ))
        )}
        {allowedTools ? (
          <span
            data-testid="skill-allowed-tools-chip"
            title={t("pages.skills.docInspector.allowedToolsHint")}
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-[#F7F5F2] px-2 py-0.5 text-[10px] font-medium text-[#6B645C] ring-1 ring-[#E8E4DE]"
          >
            <span>{t("pages.skills.docInspector.allowedToolsLabel")}</span>
            <span className="truncate font-mono text-text-tertiary max-w-[12rem]">{allowedTools}</span>
          </span>
        ) : null}
      </div>

      {skill.description ? (
        <div className="border-b border-separator-border/50 bg-background-secondary-default/10 px-5 py-3">
          <p className="text-caption-1-regular text-text-secondary leading-relaxed">
            {skill.description}
          </p>
        </div>
      ) : null}

      <div className="flex-1 p-5 overflow-y-auto bg-background-secondary-default/15 font-mono text-caption-2-regular leading-relaxed">
        <pre className="text-text-primary whitespace-pre-wrap select-text">
          {markdownBody || skill.content}
        </pre>
      </div>
    </div>
  )
}
