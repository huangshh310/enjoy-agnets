import { useEffect, useState } from "react"
import {
  RiCheckLine,
  RiEditLine,
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
import type { KnowledgeSource } from "@enjoy-agents/ipc-contract"
import { hasIde } from "@renderer/lib/ide"
import { useChatStore } from "@renderer/stores/chat-store"
import { canSaveKnowledgeSourcePath, isSameKnowledgeSourcePath } from "./knowledge-edit-path"
import { pickWorkspaceRelativePath } from "./knowledge-pick-source"

interface KnowledgeEditModalProps {
  isOpen: boolean
  onClose: () => void
  source: KnowledgeSource | null
  onSaveAndReindex: (oldSourceId: string, newPath: string) => Promise<void>
  isSaving: boolean
}

export function KnowledgeEditModal({
  isOpen,
  onClose,
  source,
  onSaveAndReindex,
  isSaving
}: KnowledgeEditModalProps) {
  const workspaceId = useChatStore((state) => state.workspaceId)
  const [path, setPath] = useState("")

  useEffect(() => {
    if (source) {
      setPath(source.path)
    }
  }, [source])

  async function handlePickNativeFolder() {
    if (!hasIde() || !workspaceId) return
    const relative = await pickWorkspaceRelativePath(workspaceId, "folder")
    if (relative) setPath(relative)
  }

  async function handleSave() {
    if (!source || !path.trim() || isSaving) return
    await onSaveAndReindex(source.id, path.trim())
    onClose()
  }

  if (!source) return null
  const samePath = isSameKnowledgeSourcePath(path, source.path)
  const canSave = canSaveKnowledgeSourcePath(path, isSaving)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
              <RiEditLine className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-body-medium font-semibold text-text-primary">
                Edit Knowledge Source Path
              </DialogTitle>
              <DialogDescription className="text-caption-1-medium text-text-secondary">
                Update the target path and rebuild vector index for this source
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-caption-1-medium text-text-secondary">
              Current Source Path
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <RiFolderLine className="absolute left-3 top-2.5 size-4 text-text-tertiary" />
                <Input
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="e.g. src or docs/specs"
                  className="pl-9 bg-background-secondary-default font-mono text-body-medium focus-visible:bg-background-primary-default"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleSave()
                  }}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => void handlePickNativeFolder()}
                className="gap-1 shrink-0 h-9"
                title="Browse system directory..."
              >
                <RiFolderOpenLine className="size-4 text-text-secondary" />
                <span className="text-caption-1-medium">Browse...</span>
              </Button>
            </div>
            <span className="text-caption-2-medium text-text-tertiary">
              Same path rebuilds the index. A new path replaces this source and re-indexes.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canSave}
            aria-busy={isSaving}
            onClick={() => void handleSave()}
            className={cx("gap-1.5 shadow-xs", isSaving && "opacity-60")}
          >
            {isSaving ? null : <RiCheckLine className="size-4" />}
            <span>{samePath ? "Rebuild Index" : "Update & Rebuild"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
