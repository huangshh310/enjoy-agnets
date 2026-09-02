/**
 * 供应商编辑/添加模态弹窗：
 * 精致的弹层对话框，带有供应商图标、协议说明、表单与主保存动作。
 */
import { RiExternalLinkLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import type { ProviderKind, ProviderPreset } from "@enjoy-agents/providers/presets"
import { ProviderEditorFields } from "./provider-editor-fields"
import { ProviderIcon } from "./provider-icons"
import type { EditorState, ProbeState } from "./providers.types"
import { useT } from "@renderer/i18n"

export function ProviderEditorDialog({
  editor,
  preset,
  probe,
  modelChoices,
  keyHint,
  canSave,
  onClose,
  onChangeKind,
  onChange,
  onFetchModels,
  onSave
}: {
  editor: EditorState | null
  preset: ProviderPreset | null
  probe: ProbeState
  modelChoices: Array<{ id: string; label: string }>
  keyHint?: string
  canSave: boolean
  onClose: () => void
  onChangeKind: (kind: ProviderKind) => void
  onChange: (patch: Partial<EditorState>) => void
  onFetchModels: () => void
  onSave: () => void
}) {
  return (
    <Dialog open={Boolean(editor && preset)} onOpenChange={(open) => { if (!open) onClose() }}>
      {editor && preset ? (
        <DialogContent className="sm:max-w-xl overflow-hidden rounded-2xl p-6" showCloseButton>
          <EditorDialogForm
            editor={editor}
            preset={preset}
            probe={probe}
            modelChoices={modelChoices}
            keyHint={keyHint}
            canSave={canSave}
            onClose={onClose}
            onChangeKind={onChangeKind}
            onChange={onChange}
            onFetchModels={onFetchModels}
            onSave={onSave}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  )
}

function EditorDialogForm({
  editor,
  preset,
  probe,
  modelChoices,
  keyHint,
  canSave,
  onClose,
  onChangeKind,
  onChange,
  onFetchModels,
  onSave
}: {
  editor: EditorState
  preset: ProviderPreset
  probe: ProbeState
  modelChoices: Array<{ id: string; label: string }>
  keyHint?: string
  canSave: boolean
  onClose: () => void
  onChangeKind: (kind: ProviderKind) => void
  onChange: (patch: Partial<EditorState>) => void
  onFetchModels: () => void
  onSave: () => void
}) {
  const t = useT()
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (canSave) onSave()
      }}
      className="flex flex-col gap-4"
    >
      <DialogHeader className="gap-1.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default p-1 text-text-primary shadow-xs">
            <ProviderIcon kind={preset.kind} name={editor.name || preset.name} apiStyle={editor.apiStyle} size={22} />
          </div>
          <DialogTitle className="text-title-3-semibold text-text-primary">
            {editor.id
              ? t("settings.providers.editTitle", { name: preset.name })
              : t("settings.providers.addTitle", { name: preset.name })}
          </DialogTitle>
        </div>
        <DialogDescription className="text-caption-1-medium text-text-secondary">
          {preset.description}
        </DialogDescription>
      </DialogHeader>

      <div className="py-1">
        <ProviderEditorFields
          editor={editor}
          preset={preset}
          keyHint={keyHint}
          modelChoices={modelChoices}
          probe={probe}
          onChangeKind={onChangeKind}
          onChange={onChange}
          onFetchModels={onFetchModels}
        />
      </div>

      <DialogFooter className="mt-2 flex items-center justify-between sm:justify-between border-t border-separator-border pt-4">
        <div>
          {preset.docsURL ? (
            <a
              href={preset.docsURL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-caption-1-medium text-text-tertiary hover:text-text-primary transition-colors"
            >
              {t("settings.providers.apiDocs")}
              <RiExternalLinkLine className="size-3" />
            </a>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" size="sm" disabled={!canSave}>
            {t("settings.providers.saveActivate")}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}
