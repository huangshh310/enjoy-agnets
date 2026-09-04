/**
 * 导入来源：Git HTTPS、本地文件夹、精选模版与新建技能。
 */
import { useState } from "react"
import { RiCheckLine, RiFolderLine, RiLoader4Line } from "@remixicon/react"
import type { SkillScope } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import { getCuratedSkills, type CuratedSkill } from "@renderer/components/customize/constants/customize-presets"
import { SKILLS_UI_COPY } from "../constants/skills-ui.constants"
import { ipcErrorMessage } from "../lib/ipc-error-message"

export function ImportDialog({
  open,
  onOpenChange,
  onImported
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => Promise<void>
}) {
  const t = useT()
  const curated = getCuratedSkills(t)
  const [gitOrigin, setGitOrigin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newScope, setNewScope] = useState<SkillScope>("global")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-xl p-0">
        <div className="border-b border-separator-border/70 px-5 py-3.5">
          <DialogTitle className="text-body-medium text-text-primary">{SKILLS_UI_COPY.importDialogTitle}</DialogTitle>
        </div>
        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-5">
          {error ? <p className="text-caption-2-medium text-rose-600 dark:text-rose-400">{error}</p> : null}
          <GitImport
            gitOrigin={gitOrigin}
            busy={Boolean(busy)}
            onChange={setGitOrigin}
            onAdd={() => void addGit()}
          />
          <Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => void addLocal()} className="w-fit gap-1">
            <RiFolderLine className="size-3.5" />
            {SKILLS_UI_COPY.pickFolderBtn}
          </Button>
          <TemplateList
            curated={curated}
            busyKey={busy}
            onInstall={(preset, scope) => void installPreset(preset, scope)}
          />
          <CreateSkillForm
            name={newName}
            desc={newDesc}
            scope={newScope}
            busy={busy === "create"}
            onName={setNewName}
            onDesc={setNewDesc}
            onScope={setNewScope}
            onCreate={() => void createCustom()}
          />
        </div>
      </DialogContent>
    </Dialog>
  )

  async function addGit() {
    if (!hasIde() || !gitOrigin.trim()) return
    await run("git", async () => {
      await getIde().skills.sources.add({ kind: "git", origin: gitOrigin.trim() })
      setGitOrigin("")
    })
  }

  async function addLocal() {
    if (!hasIde()) return
    await run("local", async () => {
      const picked = await getIde().workspace.pickFolder()
      if (!isPickedFolder(picked)) return
      await getIde().skills.sources.add({ kind: "local", origin: picked.path, name: picked.name })
    })
  }

  async function installPreset(preset: CuratedSkill, scope: SkillScope) {
    if (!hasIde()) return
    await run(`${preset.id}:${scope}`, async () => {
      await getIde().skills.create({
        name: preset.id,
        description: preset.description,
        scope,
        content: preset.templateMarkdown
      })
    })
  }

  async function createCustom() {
    if (!hasIde() || !newName.trim()) return
    await run("create", async () => {
      await getIde().skills.create({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        scope: newScope
      })
      setNewName("")
      setNewDesc("")
    })
  }

  async function run(key: string, task: () => Promise<void>) {
    setBusy(key)
    setError(null)
    try {
      await task()
      await onImported()
    } catch (caught) {
      setError(ipcErrorMessage(caught))
    } finally {
      setBusy(null)
    }
  }
}

function GitImport({
  gitOrigin,
  busy,
  onChange,
  onAdd
}: {
  gitOrigin: string
  busy: boolean
  onChange: (value: string) => void
  onAdd: () => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-caption-2-medium text-text-secondary">{SKILLS_UI_COPY.gitLabel}</Label>
      <div className="flex gap-2">
        <Input
          value={gitOrigin}
          onChange={(event) => onChange(event.target.value)}
          placeholder={SKILLS_UI_COPY.gitPlaceholder}
          className="h-8 font-mono text-caption-2-medium"
        />
        <Button size="sm" disabled={busy || !gitOrigin.trim()} onClick={onAdd} className="shrink-0">
          {SKILLS_UI_COPY.gitAdd}
        </Button>
      </div>
    </div>
  )
}

function TemplateList({
  curated,
  busyKey,
  onInstall
}: {
  curated: CuratedSkill[]
  busyKey: string | null
  onInstall: (preset: CuratedSkill, scope: SkillScope) => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-caption-1-medium text-text-primary">{SKILLS_UI_COPY.templates}</h4>
      <div className="flex flex-col gap-2">
        {curated.map((preset) => (
          <div key={preset.id} className="flex items-center justify-between gap-2 rounded-lg border border-separator-border/70 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-caption-1-medium text-text-primary">{preset.name}</p>
              <p className="truncate text-caption-2-regular text-text-tertiary">{preset.description}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={Boolean(busyKey)}
                onClick={() => onInstall(preset, "global")}
              >
                {busyKey === `${preset.id}:global` ? <RiLoader4Line className="size-3 animate-spin" /> : t("studio.skills.installGlobal")}
              </Button>
              <Button size="sm" disabled={Boolean(busyKey)} onClick={() => onInstall(preset, "workspace")}>
                {busyKey === `${preset.id}:workspace` ? <RiLoader4Line className="size-3 animate-spin" /> : t("studio.skills.installWorkspace")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CreateSkillForm({
  name,
  desc,
  scope,
  busy,
  onName,
  onDesc,
  onScope,
  onCreate
}: {
  name: string
  desc: string
  scope: SkillScope
  busy: boolean
  onName: (value: string) => void
  onDesc: (value: string) => void
  onScope: (value: SkillScope) => void
  onCreate: () => void
}) {
  const t = useT()
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-caption-1-medium text-text-primary">{SKILLS_UI_COPY.createCustom}</h4>
      <Input value={name} onChange={(event) => onName(event.target.value)} placeholder={t("studio.skills.namePlaceholder")} className="h-8 text-caption-2-medium" />
      <Input value={desc} onChange={(event) => onDesc(event.target.value)} placeholder={t("studio.skills.descPlaceholder")} className="h-8 text-caption-2-medium" />
      <div className="grid h-8 grid-cols-2 gap-1 rounded-lg bg-background-secondary-default/60 p-0.5">
        {(["global", "workspace"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onScope(value)}
            className={cx(
              "rounded text-caption-2-medium",
              scope === value ? "bg-background-primary-default text-text-primary shadow-2xs" : "text-text-secondary"
            )}
          >
            {value === "global" ? t("studio.skills.scopeGlobal") : t("studio.skills.scopeWorkspace")}
          </button>
        ))}
      </div>
      <Button size="sm" disabled={!name.trim() || busy} onClick={onCreate} className="w-fit gap-1">
        {busy ? <RiLoader4Line className="size-3.5 animate-spin" /> : <RiCheckLine className="size-3.5" />}
        {t("studio.skills.create")}
      </Button>
    </div>
  )
}

function isPickedFolder(value: unknown): value is { path: string; name?: string } {
  if (!value || typeof value !== "object" || !("path" in value)) return false
  return typeof value.path === "string" && value.path.length > 0
}

