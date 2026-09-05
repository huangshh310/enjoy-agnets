import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  RiAddLine,
  RiCloseCircleLine,
  RiFileAddLine,
  RiFileLine,
  RiFileTextLine,
  RiFolder6Line,
  RiFolderLine,
  RiFolderOpenLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cx } from "@/utils/cx"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useT } from "@renderer/i18n"
import { useChatStore } from "@renderer/stores/chat-store"
import { getKnowledgePresetFolders } from "./knowledge-constants"
import { knowledgeActionErrorKey } from "./lib/derive-knowledge-stats"
import { isIndexableKnowledgeFile, presetExistsInWorkspace } from "./lib/knowledge-source-resolve"
import { pickWorkspaceRelativePath } from "./knowledge-pick-source"

interface KnowledgeAddModalProps {
  isOpen: boolean
  onClose: () => void
  onAddAndIndex: (path: string) => Promise<void>
  isAdding: boolean
}

interface WorkspaceDirEntry {
  name: string
  kind: "file" | "directory"
  path: string
}

export function KnowledgeAddModal({
  isOpen,
  onClose,
  onAddAndIndex,
  isAdding
}: KnowledgeAddModalProps) {
  const t = useT()
  const workspaceId = useChatStore((state) => state.workspaceId)
  const [activeTab, setActiveTab] = useState<"folder" | "file">("folder")
  const [path, setPath] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  // Query workspace real directory entries to show live folder/file browser
  const workspaceFilesQuery = useQuery({
    queryKey: ["workspace-files-root", workspaceId],
    enabled: hasIde() && Boolean(workspaceId) && isOpen,
    queryFn: async () => {
      if (!workspaceId) return []
      const entries = (await getIde().workspace.files({
        workspaceId,
        path: "."
      })) as WorkspaceDirEntry[]
      return entries.filter(
        (e) =>
          !e.name.startsWith(".") &&
          e.name !== "node_modules" &&
          e.name !== "dist" &&
          e.name !== "build"
      )
    }
  })

  const workspaceEntries = workspaceFilesQuery.data ?? []
  const workspaceDirs = workspaceEntries.filter((e) => e.kind === "directory")
  const workspaceFiles = workspaceEntries.filter(
    (e) => e.kind === "file" && isIndexableKnowledgeFile(e.path)
  )
  const workspaceDirPaths = workspaceDirs.map((dir) => dir.path)

  async function handlePickNative(kind: "folder" | "file") {
    if (!hasIde() || !workspaceId) return
    setFormError(null)
    const result = await pickWorkspaceRelativePath(workspaceId, kind)
    if (result.status === "ok") {
      if (kind === "file" && !isIndexableKnowledgeFile(result.path)) {
        setFormError(t("pages.knowledge.unsupportedFile"))
        return
      }
      setPath(result.path)
      return
    }
    if (result.status === "outside") setFormError(t("pages.knowledge.pickOutsideWorkspace"))
  }

  async function handleAdd() {
    if (!path.trim() || isAdding) return
    if (activeTab === "file" && !isIndexableKnowledgeFile(path.trim())) {
      setFormError(t("pages.knowledge.unsupportedFile"))
      return
    }
    setFormError(null)
    try {
      await onAddAndIndex(path.trim())
      setPath("")
      onClose()
    } catch (error) {
      setFormError(t(`pages.knowledge.${knowledgeActionErrorKey(error)}`))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500 shadow-2xs">
              <RiFolder6Line className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-body-medium font-semibold text-text-primary">
                {t("pages.knowledge.addTitle")}
              </DialogTitle>
              <DialogDescription className="text-[12px] text-text-secondary">
                {t("pages.knowledge.addDesc")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Switcher: Folder vs File */}
        <div className="flex items-center gap-1 rounded-xl border border-border-button-default bg-background-secondary-default p-1 mt-1">
          <button
            type="button"
            onClick={() => setActiveTab("folder")}
            className={cx(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all",
              activeTab === "folder"
                ? "bg-background-primary-default text-text-primary shadow-xs"
                : "text-text-tertiary hover:text-text-primary"
            )}
          >
            <RiFolderLine className="size-4" />
            <span>{t("pages.knowledge.tabFolder")}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("file")}
            className={cx(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-semibold transition-all",
              activeTab === "file"
                ? "bg-background-primary-default text-text-primary shadow-xs"
                : "text-text-tertiary hover:text-text-primary"
            )}
          >
            <RiFileTextLine className="size-4" />
            <span>{t("pages.knowledge.tabFile")}</span>
          </button>
        </div>

        <div className="flex flex-col gap-4 py-2">
          {/* Target Relative Path with Browse & Clear buttons */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-caption-1-medium text-text-secondary">
              {activeTab === "folder" ? t("pages.knowledge.targetFolderPath") : t("pages.knowledge.targetFilePath")}
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                {activeTab === "folder" ? (
                  <RiFolderLine className="absolute left-3 top-2.5 size-4 text-text-tertiary" />
                ) : (
                  <RiFileLine className="absolute left-3 top-2.5 size-4 text-text-tertiary" />
                )}
                <Input
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder={
                    activeTab === "folder"
                      ? t("pages.knowledge.placeholderFolder")
                      : t("pages.knowledge.placeholderFile")
                  }
                  className="pl-9 pr-8 bg-background-secondary-default font-mono text-body-medium focus-visible:bg-background-primary-default"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleAdd()
                  }}
                  autoFocus
                />
                {path ? (
                  <button
                    type="button"
                    onClick={() => setPath("")}
                    title={t("pages.knowledge.clearInput")}
                    className="absolute right-2.5 top-2.5 text-text-tertiary hover:text-text-primary"
                  >
                    <RiCloseCircleLine className="size-4" />
                  </button>
                ) : null}
              </div>

              {/* Native Picker Button */}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void handlePickNative(activeTab === "folder" ? "folder" : "file")
                }
                className="gap-1.5 shrink-0 h-9"
                title={
                  activeTab === "folder"
                    ? t("pages.knowledge.browseDirectory")
                    : t("pages.knowledge.selectDocument")
                }
              >
                {activeTab === "folder" ? (
                  <RiFolderOpenLine className="size-4 text-accent-500" />
                ) : (
                  <RiFileAddLine className="size-4 text-accent-500" />
                )}
                <span>{activeTab === "folder" ? t("pages.knowledge.browseFolder") : t("pages.knowledge.chooseFile")}</span>
              </Button>
            </div>
            <span className="text-caption-2-regular text-text-tertiary">
              {activeTab === "folder"
                ? t("pages.knowledge.folderHint")
                : t("pages.knowledge.fileHint")}
            </span>
            {formError ? (
              <span className="text-caption-2-medium text-rose-600 dark:text-rose-400">{formError}</span>
            ) : null}
          </div>

          {activeTab === "folder" && workspaceDirs.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <Label className="text-caption-2-medium text-text-tertiary">
                {t("pages.knowledge.workspaceFoldersFound")}
              </Label>
              <div className="flex max-h-24 flex-wrap items-center gap-1.5 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setPath(".")}
                  className="inline-flex items-center gap-1 rounded-lg border border-border-button-default bg-background-secondary-default px-2 py-1 font-mono text-caption-2-medium text-text-primary"
                >
                  <RiFolderLine className="size-3 text-accent-500" />
                  <span>{t("pages.knowledge.entireProject")}</span>
                </button>
                {workspaceDirs.map((dir) => (
                  <button
                    key={dir.path}
                    type="button"
                    onClick={() => setPath(dir.path)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border-button-default bg-background-secondary-default px-2 py-1 font-mono text-caption-2-medium text-text-primary"
                  >
                    <RiFolderLine className="size-3 text-accent-500" />
                    <span>{dir.name}/</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "file" && workspaceFiles.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <Label className="text-caption-2-medium text-text-tertiary">
                {t("pages.knowledge.workspaceRootFiles")}
              </Label>
              <div className="flex max-h-24 flex-wrap items-center gap-1.5 overflow-y-auto">
                {workspaceFiles.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => setPath(file.path)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border-button-default bg-background-secondary-default px-2 py-1 font-mono text-caption-2-medium text-text-primary"
                  >
                    <RiFileLine className="size-3 text-accent-500" />
                    <span>{file.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "folder" ? (
            <div className="flex flex-col gap-2">
              <Label className="text-caption-2-medium text-text-tertiary">
                {t("pages.knowledge.quickPresets")}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {getKnowledgePresetFolders(t).map((preset) => {
                  const exists = presetExistsInWorkspace(preset.path, workspaceDirPaths)
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={!exists}
                      title={exists ? preset.path : t("pages.knowledge.presetMissing")}
                      onClick={() => {
                        if (!exists) return
                        setFormError(null)
                        setPath(preset.path)
                      }}
                      className={cx(
                        "flex items-center gap-2.5 rounded-xl border p-2.5 text-left text-caption-2-medium",
                        exists
                          ? "border-border-button-default bg-background-secondary-default text-text-primary"
                          : "cursor-not-allowed border-separator-border/50 bg-background-secondary-default/40 text-text-tertiary opacity-50"
                      )}
                    >
                      <preset.icon className="size-4 shrink-0 text-accent-500" />
                      <div className="min-w-0">
                        <div className="truncate text-caption-1-medium">{preset.name}</div>
                        <div className="truncate font-mono text-caption-2-regular text-text-tertiary">
                          {exists ? preset.path : t("pages.knowledge.presetMissing")}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!path.trim() || isAdding}
            aria-busy={isAdding}
            onClick={() => void handleAdd()}
            className={cx("gap-1.5 shadow-xs", isAdding && "opacity-60")}
          >
            {isAdding ? null : <RiAddLine className="size-4" />}
            <span>{activeTab === "folder" ? t("pages.knowledge.indexFolder") : t("pages.knowledge.indexFile")}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
