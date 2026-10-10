/**
 * 创建项目弹窗 (Create Project Dialog):
 * 本地项目：先 pickFolder 只选路径，创建时才 open({ path, name }) 落库。
 * 远程：选主机 + 已有远端路径，走 openSsh + connect。
 */
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { createAndOpenSession, loadWorkspace, refreshAllWorkspaces } from "@renderer/hooks/use-agent-session"
import { CreateProjectLocalStep } from "@renderer/components/workspace/create-project-local-step"
import { CreateProjectRemoteStep } from "@renderer/components/workspace/create-project-remote-step"
import { CreateProjectTypeStep } from "@renderer/components/workspace/create-project-type-step"
import { folderNameFromPath, nextProjectName } from "@renderer/components/workspace/project-name"
import type { RemoteConnectInput } from "@renderer/components/workspace/remote-connect.types"
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

  async function handleConnectRemote(input: RemoteConnectInput) {
    setLoading(true)
    setError(null)
    try {
      const workspace = (await getIde().workspace.openSsh(input)) as {
        id: string
        name: string
        rootPath: string
        kind?: "local" | "ssh"
      }
      await loadWorkspace({ ...workspace, kind: "ssh" })
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
      <DialogContent
        data-testid="create-project-dialog"
        className={`${step === 2 && projectType === "remote" ? "max-w-[380px]" : "max-w-md"} p-6 overflow-hidden rounded-3xl bg-background-primary-default shadow-card border border-border-button-default`}
      >
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

        {error && projectType !== "remote" ? (
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
        ) : projectType === "remote" ? (
          <CreateProjectRemoteStep
            projectName={projectName}
            onNameChange={(value) => {
              setNameTouched(true)
              setProjectName(value)
            }}
            loading={loading}
            error={error}
            onBack={() => setStep(1)}
            onCancel={() => {
              resetState()
              onOpenChange(false)
            }}
            onConnect={(input) => void handleConnectRemote(input)}
          />
        ) : (
          <CreateProjectLocalStep
            projectName={projectName}
            selectedPath={selectedPath}
            loading={loading}
            onNameChange={(value) => {
              setNameTouched(true)
              setProjectName(value)
            }}
            onPickFolder={() => void handlePickFolder()}
            onBack={() => setStep(1)}
            onCancel={() => {
              resetState()
              onOpenChange(false)
            }}
            onCreate={() => void handleCreateProject()}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
