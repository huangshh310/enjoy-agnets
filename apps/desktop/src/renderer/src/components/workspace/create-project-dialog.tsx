/**
 * 创建项目弹窗 (Create Project Dialog):
 * 本地项目：先 pickFolder 只选路径，创建时才 open({ path, name }) 落库。远程 SSH 已禁用。
 */
import { useState } from "react"
import { RiCheckLine, RiFolderAddLine, RiLoader4Line } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cx } from "@/utils/cx"
import { createAndOpenSession, loadWorkspace, refreshAllWorkspaces } from "@renderer/hooks/use-agent-session"
import { CreateProjectTypeStep } from "@renderer/components/workspace/create-project-type-step"
import { folderNameFromPath, nextProjectName } from "@renderer/components/workspace/project-name"
import { useT } from "@renderer/i18n"
import { getIde } from "@renderer/lib/ide"

export function CreateProjectDialog({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const t = useT()
  const [step, setStep] = useState<1 | 2>(1)
  const [projectType, setProjectType] = useState<"local" | "remote">("local")
  const [projectName, setProjectName] = useState("")
  const [nameTouched, setNameTouched] = useState(false)
  const [selectedPath, setSelectedPath] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetState() {
    setStep(1)
    setProjectType("local")
    setProjectName("")
    setNameTouched(false)
    setSelectedPath("")
    setError(null)
    setLoading(false)
  }

  async function handlePickFolder() {
    setError(null)
    try {
      const picked = (await getIde().workspace.pickFolder()) as { path: string; name: string }
      if (picked?.path) {
        const suggested = picked.name || folderNameFromPath(picked.path)
        setSelectedPath(picked.path)
        setProjectName((current) => nextProjectName(current, suggested, nameTouched))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes("No workspace folder selected")) {
        setError(msg)
      }
    }
  }

  async function handleCreateProject() {
    if (!selectedPath) {
      setError(t("pages.workspaces.createProject.pickFirst"))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const trimmedName = projectName.trim()
      const workspace = (await getIde().workspace.open({
        path: selectedPath,
        ...(trimmedName ? { name: trimmedName } : {})
      })) as {
        id: string
        name: string
        rootPath: string
      }
      await loadWorkspace(workspace)
      await createAndOpenSession(workspace.id, t("pages.workspaces.createProject.defaultSessionName"))
      await refreshAllWorkspaces()
      onOpenChange(false)
      resetState()
    } catch (err) {
      setError(err instanceof Error ? err.message : t("pages.workspaces.createProject.createFailed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetState()
        onOpenChange(isOpen)
      }}
    >
      <DialogContent className="max-w-md p-6 overflow-hidden rounded-3xl bg-background-primary-default shadow-card border border-border-button-default">
        <DialogHeader className="mb-2">
          <DialogTitle className="text-title-3-semibold text-text-primary">
            {t("pages.workspaces.createProject.title")}
          </DialogTitle>
          <DialogDescription className="text-body-medium text-text-secondary">
            {step === 1
              ? t("pages.workspaces.createProject.step1Desc")
              : t("pages.workspaces.createProject.step2Desc")}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-caption-1-medium text-destructive">
            {error}
          </div>
        ) : null}

        {step === 1 ? (
          <CreateProjectTypeStep
            projectType={projectType}
            onChangeType={setProjectType}
            onCancel={() => onOpenChange(false)}
            onNext={() => setStep(2)}
          />
        ) : (
          <div className="flex flex-col gap-4 py-2">
            {/* Project Name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-name" className="text-caption-1-medium font-semibold text-text-secondary">
                {t("pages.workspaces.createProject.nameLabel")}
              </Label>
              <div className="relative">
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => {
                    setNameTouched(true)
                    setProjectName(e.target.value)
                  }}
                  placeholder={t("pages.workspaces.createProject.namePlaceholder")}
                  className="rounded-xl"
                />
              </div>
            </div>

            {/* Source Folder Picker Box */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-caption-1-medium font-semibold text-text-secondary">
                {t("pages.workspaces.createProject.folderLabel")}
              </Label>
              <button
                type="button"
                onClick={() => void handlePickFolder()}
                className={cx(
                  "flex min-h-[108px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 text-center transition-all cursor-pointer",
                  selectedPath
                    ? "border-accent-500/40 bg-accent-500/[0.03] text-text-primary"
                    : "border-border-button-default bg-background-secondary-default/40 hover:border-accent-500/30 hover:bg-background-secondary-hover"
                )}
              >
                {selectedPath ? (
                  <>
                    <div className="flex size-9 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
                      <RiCheckLine className="size-5 text-accent-500" />
                    </div>
                    <div className="max-w-full px-2">
                      <p className="text-caption-1-medium font-semibold text-text-primary">
                        {t("pages.workspaces.createProject.folderPicked")}
                      </p>
                      <p className="mt-0.5 max-w-[340px] truncate font-mono text-caption-2-medium text-text-tertiary">
                        {selectedPath}
                      </p>
                    </div>
                    <span className="text-caption-2-medium text-accent-600 hover:underline">
                      {t("pages.workspaces.createProject.changeFolder")}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex size-9 items-center justify-center rounded-xl border border-border-button-default bg-background-primary-default text-text-secondary shadow-xs">
                      <RiFolderAddLine className="size-5 text-foreground-icon-secondary" />
                    </div>
                    <p className="text-caption-1-medium font-medium text-text-secondary">
                      {t("pages.workspaces.createProject.folderHint")}
                    </p>
                    <span className="text-caption-2-medium text-accent-600">
                      {t("pages.workspaces.createProject.browseHint")}
                    </span>
                  </>
                )}
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
              >
                {t("pages.workspaces.createProject.back")}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetState()
                    onOpenChange(false)
                  }}
                >
                  {t("pages.workspaces.createProject.cancel")}
                </Button>
                <Button
                  size="sm"
                  disabled={loading || !selectedPath}
                  onClick={() => void handleCreateProject()}
                  className="gap-1.5 shadow-xs"
                >
                  {loading ? <RiLoader4Line className="size-3.5 animate-spin" /> : null}
                  <span>{t("pages.workspaces.createProject.create")}</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
