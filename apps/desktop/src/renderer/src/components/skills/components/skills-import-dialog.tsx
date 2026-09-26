/**
 * 导入技能来源弹窗 (Import Skills Dialog)。
 * 专注于导入已有技能资源：Git 仓库拉取、本地文件夹挂载与官方预置模版一键安装。
 */
import { useState } from "react"
import {
  RiDownloadLine,
  RiFolderLine,
  RiGitRepositoryLine,
  RiLoader4Line
} from "@remixicon/react"
import type { SkillScope } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { getCuratedSkills, type CuratedSkill } from "@renderer/components/customize/constants/customize-presets"
import { useT } from "@renderer/i18n"
import { getIde, hasIde } from "@renderer/lib/ide"
import { ipcErrorMessage } from "../lib/ipc-error-message"
export function ImportDialog({
  open,
  onOpenChange,
  onImported,
  workspacePath
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => Promise<void>
  workspacePath?: string
}) {
  const t = useT()
  const curated = getCuratedSkills(t)
  const [gitOrigin, setGitOrigin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function addGit() {
    if (!hasIde() || !gitOrigin.trim()) return
    await run("git", async () => {
      await getIde().skills.sources.add({ kind: "git", origin: gitOrigin.trim() })
      setGitOrigin("")
      onOpenChange(false)
    })
  }

  async function addLocal() {
    if (!hasIde()) return
    await run("local", async () => {
      const picked = await getIde().workspace.pickFolder()
      if (!isPickedFolder(picked)) return
      await getIde().skills.sources.add({ kind: "local", origin: picked.path, name: picked.name })
      onOpenChange(false)
    })
  }

  async function installPreset(preset: CuratedSkill, scope: SkillScope) {
    if (!hasIde()) return
    if (scope === "workspace" && !workspacePath) {
      setError(t("pages.skills.importDialog.needWorkspace"))
      return
    }
    await run(`${preset.id}:${scope}`, async () => {
      await getIde().skills.create({
        name: preset.id,
        description: preset.description,
        scope,
        workspacePath: scope === "workspace" ? workspacePath : undefined,
        content: preset.templateMarkdown
      })
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden rounded-3xl p-0 border border-separator-border/80 bg-background-primary-default shadow-card">
        {/* 头部标题 */}
        <div className="flex items-center justify-between border-b border-separator-border/70 px-6 py-4 bg-background-secondary-default/30">
          <div className="flex items-center gap-2">
            <RiDownloadLine className="size-5 text-accent-600 dark:text-accent-400" />
            <DialogTitle className="text-title-3-semibold text-text-primary tracking-tight">
              {t("pages.skills.importDialog.title")}
            </DialogTitle>
          </div>
        </div>

        <div className="flex max-h-[75vh] flex-col gap-5 overflow-y-auto p-6">
          {error ? (
            <div className="rounded-xl border border-border-error-default/30 bg-background-tertiary-error/10 px-3.5 py-2 text-caption-2-medium text-text-error-primary dark:text-text-error-primary">
              {error}
            </div>
          ) : null}

          {/* 1. Git 仓库导入 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-caption-2-medium font-semibold text-text-primary">
              <RiGitRepositoryLine className="size-4 text-text-tertiary" />
              <span>{t("pages.skills.importDialog.gitTitle")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={gitOrigin}
                onChange={(e) => setGitOrigin(e.target.value)}
                placeholder={t("pages.skills.importDialog.gitPlaceholder")}
                className="h-8.5 text-caption-2-medium"
              />
              <Button
                size="sm"
                disabled={!gitOrigin.trim() || Boolean(busy)}
                onClick={() => void addGit()}
                className="h-8.5 px-3 text-caption-2-medium shrink-0 shadow-2xs"
              >
                {busy === "git" ? <RiLoader4Line className="size-3.5 animate-spin" /> : null}
                <span>{t("pages.skills.importDialog.gitFetch")}</span>
              </Button>
            </div>
          </div>

          {/* 2. 本地文件夹选择 */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-separator-border/70 bg-background-secondary-default/30">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-background-primary-default border border-separator-border/60 text-text-tertiary shadow-2xs">
                <RiFolderLine className="size-4.5" />
              </div>
              <div>
                <h4 className="text-caption-1-medium font-semibold text-text-primary">
                  {t("pages.skills.importDialog.localTitle")}
                </h4>
                <p className="text-caption-2-regular text-text-tertiary">
                  {t("pages.skills.importDialog.localDesc")}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={Boolean(busy)}
              onClick={() => void addLocal()}
              className="h-8 text-caption-2-medium"
            >
              {busy === "local" ? <RiLoader4Line className="size-3.5 animate-spin" /> : null}
              <span>{t("pages.skills.importDialog.pickFolder")}</span>
            </Button>
          </div>

          {/* 3. 官方精选模版快速安装 */}
          <div className="flex flex-col gap-2.5 pt-2 border-t border-separator-border/40">
            <h4 className="text-caption-2-medium font-semibold text-text-primary">
              {t("pages.skills.importDialog.presetsTitle")}
            </h4>
            <div className="flex flex-col gap-2">
              {curated.map((preset) => {
                const isCurrentBusy = busy?.startsWith(`${preset.id}:`)
                return (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-separator-border/60 bg-background-primary-default hover:border-separator-border transition-colors shadow-2xs"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="text-caption-2-medium font-semibold text-text-primary block truncate">
                        {preset.name}
                      </span>
                      <p className="text-caption-2-regular text-text-tertiary truncate">
                        {preset.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={Boolean(busy)}
                        onClick={() => void installPreset(preset, "global")}
                        className="h-7 px-2 text-caption-2-regular"
                      >
                        {isCurrentBusy ? <RiLoader4Line className="size-3 animate-spin" /> : null}
                        <span>{t("pages.skills.importDialog.installGlobal")}</span>
                      </Button>
                      <Button
                        size="sm"
                        disabled={Boolean(busy)}
                        onClick={() => void installPreset(preset, "workspace")}
                        className="h-7 px-2 text-caption-2-regular shadow-2xs"
                      >
                        <span>{t("pages.skills.importDialog.installWorkspace")}</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function isPickedFolder(value: unknown): value is { path: string; name?: string } {
  if (!value || typeof value !== "object" || !("path" in value)) return false
  return typeof value.path === "string" && value.path.length > 0
}
