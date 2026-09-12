/**
 * 技能详情抽屉：对标 shadcn Drawer 的内缩悬浮面板（圆角四边、顶栏、滚动、底栏主操作）。
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { RiCheckLine, RiCloseLine, RiDeleteBinLine, RiFolderOpenLine } from "@remixicon/react"
import type { InstalledSkillItem, SkillSource, SkillTargetId } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { ConfirmDialog } from "@renderer/components/app-pages/confirm-dialog"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import { resolveSkillTheme } from "../constants/skills-badge-theme"
import { SKILLS_UI_COPY } from "../constants/skills-ui.constants"
import { SkillDrawerBody } from "./skill-drawer-body"

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
  const t = useT()
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const copyTimer = useRef(0)

  const theme = useMemo(() => {
    if (!skill) return null
    return resolveSkillTheme(`${skill.name} ${skill.description || ""}`)
  }, [skill])

  const trigger = useMemo(() => {
    if (!skill) return ""
    return skill.trigger || (skill.name.includes(" ") ? `@${skill.id}` : `@${skill.name}`)
  }, [skill])

  const { metadata, bodyText } = useMemo(() => parseSkillMarkdown(skill), [skill])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("keydown", onKey)
      clearTimeout(copyTimer.current)
    }
  }, [onClose])

  if (!skill || !theme) return null

  const ThemeIcon = theme.icon

  function handleCopy() {
    void navigator.clipboard.writeText(trigger)
    setCopied(true)
    clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopied(false), 2000)
  }

  function handleReveal() {
    const path = skill?.skillFilePath
    if (!path || !hasIde()) return
    void getIde().skills.reveal(path)
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
        onClick={onClose}
        aria-label={t("pages.skills.drawer.closeDetail")}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="skill-drawer-title"
        className="absolute inset-y-3 right-3 flex w-[min(28rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card animate-in slide-in-from-right duration-200"
      >
        <header className="flex items-center justify-between gap-3 border-b border-separator-border/60 px-5 py-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cx(
                "flex size-10 shrink-0 items-center justify-center rounded-2xl border",
                theme.badgeBg,
                theme.badgeText,
                theme.badgeBorder
              )}
            >
              <ThemeIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <h3 id="skill-drawer-title" className="truncate text-title-3-semibold text-text-primary tracking-tight">
                {skill.name}
              </h3>
              <p className="truncate text-caption-2-regular text-text-tertiary">
                {skill.sourceName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-tertiary hover:bg-background-secondary-default hover:text-text-primary cursor-pointer"
            aria-label={t("pages.skills.drawer.close")}
          >
            <RiCloseLine className="size-5" />
          </button>
        </header>

        <SkillDrawerBody
          skill={skill}
          source={source}
          hasWorkspace={hasWorkspace}
          busy={busy}
          metadata={metadata}
          bodyText={bodyText}
          onToggleTarget={onToggleTarget}
        />

        <footer className="shrink-0 border-t border-separator-border/60 px-5 py-4 flex flex-col gap-2.5 bg-background-primary-default">
          <Button size="default" onClick={handleCopy} className="w-full h-10 text-caption-1-medium gap-1.5 shadow-xs">
            {copied ? <RiCheckLine className="size-4" /> : null}
            <span>{copied ? t("pages.skills.drawer.copiedTrigger") : t("pages.skills.drawer.copyTrigger", { trigger })}</span>
          </Button>
          <div className="flex items-center gap-2">
            {skill.skillFilePath ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleReveal}
                className="flex-1 h-8 gap-1.5 text-caption-2-medium"
              >
                <RiFolderOpenLine className="size-3.5 text-text-tertiary" />
                <span>{t("pages.skills.drawer.revealFile")}</span>
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
              className="h-8 gap-1.5 text-caption-2-medium text-rose-600 dark:text-rose-400 hover:border-rose-500/40"
            >
              <RiDeleteBinLine className="size-3.5" />
              <span>{t("pages.skills.drawer.delete")}</span>
            </Button>
          </div>
        </footer>
      </aside>

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
  )
}

function parseSkillMarkdown(skill: InstalledSkillItem | null): {
  metadata: Record<string, string> | null
  bodyText: string
} {
  if (!skill?.content) return { metadata: null, bodyText: skill?.description || "" }
  const match = skill.content.match(/^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/)
  if (!match) return { metadata: null, bodyText: skill.content }

  const meta: Record<string, string> = {}
  for (const line of (match[1] ?? "").split("\n")) {
    const idx = line.indexOf(":")
    if (idx <= 0) continue
    const k = line.slice(0, idx).trim()
    const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "")
    if (k && v) meta[k] = v
  }
  return { metadata: meta, bodyText: match[2]?.trim() || skill.content }
}
