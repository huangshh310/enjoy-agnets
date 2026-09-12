/**
 * 新建技能创作工坊向导 (Create Skill Studio Dialog)。
 * 宽体工坊：工程模版、Markdown 规则编辑与 SKILL.md 实时预览。
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { RiCheckLine, RiLoader4Line, RiSparklingLine } from "@remixicon/react"
import type { SkillScope } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import {
  buildSkillMarkdownContent,
  CREATE_SKILL_PRESETS
} from "../constants/create-skill-presets"
import { ipcErrorMessage } from "../lib/ipc-error-message"
import { CreateSkillFormPane } from "./create-skill-form-pane"
import { CreateSkillPreviewPane } from "./create-skill-preview-pane"

const DEFAULT_PRESET = CREATE_SKILL_PRESETS[0]

export function CreateSkillDialog({
  open,
  hasWorkspace,
  workspacePath,
  onOpenChange,
  onCreated
}: {
  open: boolean
  hasWorkspace: boolean
  workspacePath?: string
  onOpenChange: (open: boolean) => void
  onCreated: () => Promise<void>
}) {
  const t = useT()
  const [selectedPresetId, setSelectedPresetId] = useState(DEFAULT_PRESET.id)
  const [name, setName] = useState(DEFAULT_PRESET.defaultSlug)
  const [trigger, setTrigger] = useState(DEFAULT_PRESET.defaultTrigger)
  const [description, setDescription] = useState(DEFAULT_PRESET.defaultDescription)
  const [body, setBody] = useState(DEFAULT_PRESET.skeletonBody)
  const [scope, setScope] = useState<SkillScope>("global")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef(0)

  useEffect(() => {
    if (!open) return
    applyPreset(DEFAULT_PRESET.id)
    setScope("global")
    setError(null)
    setCopied(false)
    setBusy(false)
  }, [open])

  useEffect(() => {
    return () => {
      clearTimeout(copyTimer.current)
    }
  }, [])

  function applyPreset(presetId: string) {
    const found = CREATE_SKILL_PRESETS.find((p) => p.id === presetId) ?? DEFAULT_PRESET
    setSelectedPresetId(found.id)
    setName(found.defaultSlug)
    setTrigger(found.defaultTrigger)
    setDescription(found.defaultDescription)
    setBody(found.skeletonBody)
  }

  function handleNameChange(raw: string) {
    const next = raw.toLowerCase().replace(/[^a-z0-9_-]/g, "")
    const autoTrigger = `/${name}`
    setName(next)
    if (!trigger || trigger === autoTrigger) {
      setTrigger(next ? `/${next}` : "")
    }
  }

  const liveMarkdownContent = useMemo(
    () =>
      buildSkillMarkdownContent({
        name: name || "my-custom-skill",
        description: description || t("pages.skills.createDialog.fallbackDescription"),
        trigger: trigger || `/${name || "my-skill"}`,
        body: body || t("pages.skills.createDialog.fallbackBody")
      }),
    [name, description, trigger, body, t]
  )

  function handleCopyPreview() {
    void navigator.clipboard.writeText(liveMarkdownContent)
    setCopied(true)
    clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopied(false), 2000)
  }

  async function handleCreate() {
    if (!hasIde() || !name.trim()) return
    if (scope === "workspace" && !workspacePath) {
      setError(t("pages.skills.createDialog.needWorkspace"))
      return
    }
    setBusy(true)
    setError(null)
    try {
      await getIde().skills.create({
        name: name.trim(),
        description: description.trim() || undefined,
        scope,
        workspacePath: scope === "workspace" ? workspacePath : undefined,
        content: liveMarkdownContent
      })
      await onCreated()
      onOpenChange(false)
    } catch (caught) {
      setError(ipcErrorMessage(caught))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl md:max-w-6xl w-[94vw] max-w-[1080px] h-[640px] max-h-[90vh] gap-0 overflow-hidden rounded-3xl p-0 border border-separator-border/80 bg-background-primary-default shadow-card flex flex-col">
        <div className="flex items-center justify-between border-b border-separator-border/70 px-6 py-4 bg-background-secondary-default/30 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-600 dark:text-accent-400 border border-accent-500/20 shadow-2xs">
              <RiSparklingLine className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-title-3-semibold text-text-primary tracking-tight">
                {t("pages.skills.createDialog.title")}
              </DialogTitle>
              <p className="text-caption-1-regular text-text-tertiary">
                {t("pages.skills.createDialog.subtitle")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-0 md:grid-cols-12 flex-1 min-h-0 overflow-hidden">
          <CreateSkillFormPane
            selectedPresetId={selectedPresetId}
            name={name}
            trigger={trigger}
            description={description}
            body={body}
            scope={scope}
            hasWorkspace={hasWorkspace}
            error={error}
            onSelectPreset={applyPreset}
            onNameChange={handleNameChange}
            onTriggerChange={setTrigger}
            onDescriptionChange={setDescription}
            onBodyChange={setBody}
            onScopeChange={setScope}
          />
          <CreateSkillPreviewPane
            markdown={liveMarkdownContent}
            copied={copied}
            onCopy={handleCopyPreview}
          />
        </div>

        <div className="flex items-center justify-between border-t border-separator-border/70 px-6 py-4 bg-background-secondary-default/30 shrink-0">
          <span className="text-caption-2-regular text-text-tertiary">
            {t("pages.skills.createDialog.footerHint")}
          </span>
          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-8 px-3 text-caption-2-medium"
            >
              {t("pages.skills.createDialog.cancel")}
            </Button>
            <Button
              size="sm"
              disabled={!name.trim() || busy}
              onClick={() => void handleCreate()}
              className="h-8 px-4 text-caption-2-medium gap-1.5 shadow-xs"
            >
              {busy ? <RiLoader4Line className="size-3.5 animate-spin" /> : <RiCheckLine className="size-3.5" />}
              <span>{t("pages.skills.createDialog.create")}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
