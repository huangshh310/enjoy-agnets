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
import { useChatStore } from "@renderer/stores/chat-store"
import { KNOWLEDGE_PRESET_FOLDERS } from "./knowledge-constants"
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
  const workspaceId = useChatStore((state) => state.workspaceId)
  const [activeTab, setActiveTab] = useState<"folder" | "file">("folder")
  const [path, setPath] = useState("")

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
  const workspaceFiles = workspaceEntries.filter((e) => e.kind === "file")

  async function handlePickNative(kind: "folder" | "file") {
    if (!hasIde() || !workspaceId) return
    const relative = await pickWorkspaceRelativePath(workspaceId, kind)
    if (relative) setPath(relative)
  }

  async function handleAdd() {
    if (!path.trim() || isAdding) return
    await onAddAndIndex(path.trim())
    setPath("")
    onClose()
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
                Add / Import Knowledge Source
              </DialogTitle>
              <DialogDescription className="text-[12px] text-text-secondary">
                Index folders, documents, or code files into local vector memory
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
            <span>Folder / Directory</span>
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
            <span>Single / Specific File</span>
          </button>
        </div>

        <div className="flex flex-col gap-4 py-2">
          {/* Target Relative Path with Browse & Clear buttons */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-caption-1-medium text-text-secondary">
              {activeTab === "folder" ? "Target Folder Path" : "Target File Path"}
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
                      ? "e.g. . or src or docs/specs"
                      : "e.g. README.md or design/specs/ui.md"
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
                    title="Clear input"
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
                    ? "Browse local directory..."
                    : "Select document file..."
                }
              >
                {activeTab === "folder" ? (
                  <RiFolderOpenLine className="size-4 text-accent-500" />
                ) : (
                  <RiFileAddLine className="size-4 text-accent-500" />
                )}
                <span>{activeTab === "folder" ? "Browse Folder..." : "Choose File..."}</span>
              </Button>
            </div>
            <span className="text-[11px] text-text-tertiary">
              {activeTab === "folder"
                ? "Directories are recursively scanned and chunked into SQLite vector memory."
                : "Single file will be parsed and embedded directly for semantic recall."}
            </span>
          </div>

          {/* Real Workspace Project Items */}
          {activeTab === "folder" && workspaceDirs.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <Label className="text-caption-2-medium text-text-tertiary uppercase tracking-wider">
                Workspace Folders Found
              </Label>
              <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setPath(".")}
                  className="inline-flex items-center gap-1 rounded-lg border border-border-button-default bg-background-secondary-default px-2 py-1 text-[11px] font-mono font-medium text-text-primary hover:border-accent-500/50 hover:bg-background-secondary-hover hover:text-accent-500 transition-all"
                >
                  <RiFolderLine className="size-3 text-accent-500" />
                  <span>. (Entire Project)</span>
                </button>
                {workspaceDirs.map((dir) => (
                  <button
                    key={dir.path}
                    type="button"
                    onClick={() => setPath(dir.path)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border-button-default bg-background-secondary-default px-2 py-1 text-[11px] font-mono font-medium text-text-primary hover:border-accent-500/50 hover:bg-background-secondary-hover hover:text-accent-500 transition-all"
                  >
                    <RiFolderLine className="size-3 text-accent-500" />
                    <span>{dir.name}/</span>
                  </button>
                ))}
              </div>
            </div>
          ) : activeTab === "file" && workspaceFiles.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <Label className="text-caption-2-medium text-text-tertiary uppercase tracking-wider">
                Workspace Root Files
              </Label>
              <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto">
                {workspaceFiles.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => setPath(file.path)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border-button-default bg-background-secondary-default px-2 py-1 text-[11px] font-mono font-medium text-text-primary hover:border-accent-500/50 hover:bg-background-secondary-hover hover:text-accent-500 transition-all"
                  >
                    <RiFileLine className="size-3 text-accent-500" />
                    <span>{file.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Quick Preset Selector Cards (for folder mode) */}
          {activeTab === "folder" ? (
            <div className="flex flex-col gap-2">
              <Label className="text-caption-2-medium text-text-tertiary uppercase tracking-wider">
                Quick Preset Suggestions
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {KNOWLEDGE_PRESET_FOLDERS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setPath(preset.path)}
                    className="flex items-center gap-2.5 rounded-xl border border-border-button-default bg-background-secondary-default p-2.5 text-left text-[11px] text-text-primary hover:border-accent-500/40 hover:bg-background-secondary-hover transition-all"
                  >
                    <preset.icon className="size-4 text-accent-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{preset.name}</div>
                      <div className="text-[10px] font-mono text-text-tertiary truncate">
                        {preset.path}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
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
            <span>{activeTab === "folder" ? "Index Folder" : "Index File"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
