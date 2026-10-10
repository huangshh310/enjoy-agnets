/**
 * 供应商添加 / 编辑：右侧抽屉，与智能体配置同一套壳。
 */
import type { AgentBindRef } from "@enjoy-agents/ipc-contract"
import type { ProviderPreset } from "@enjoy-agents/providers/presets"
import { useT } from "@renderer/i18n"
import { SettingsSideDrawer } from "../settings-side-drawer"
import { SecretWritePreflight } from "../secret-write-notice"
import { EditorDrawerFooter, EditorDrawerHeader } from "./provider-editor-drawer-chrome"
import { ProviderEditorFields } from "./provider-editor-fields"
import { ProviderSimpleFields } from "./provider-simple-fields"
import type { SecretWriteErrorCode } from "@renderer/lib/secret-write"
import type { EditorState, ProbeState } from "./providers.types"

export function ProviderEditorDrawer({
  editor,
  preset,
  probe,
  modelChoices,
  refs,
  canSave,
  detecting,
  saving = false,
  saveError = null,
  secretBlocked = false,
  onClose,
  onChange,
  onFetchModels,
  onDetect,
  onSave,
  onOpenAgent,
  saveLabel,
  layer = "base",
  simple = false,
  focusKey = false,
  motion = true
}: {
  editor: EditorState | null
  preset: ProviderPreset | null
  probe: ProbeState
  modelChoices: Array<{ id: string; label: string }>
  refs?: AgentBindRef[]
  canSave: boolean
  detecting: boolean
  saving?: boolean
  saveError?: SecretWriteErrorCode | null
  secretBlocked?: boolean
  onClose: () => void
  onChange: (patch: Partial<EditorState>) => void
  onFetchModels: () => void
  onDetect: () => void
  onSave: () => void
  onOpenAgent?: (runtimeId: string) => void
  saveLabel?: string
  layer?: "base" | "nested"
  simple?: boolean
  focusKey?: boolean
  motion?: boolean
}) {
  const t = useT()
  const open = Boolean(editor && preset)
  return (
    <SettingsSideDrawer
      open={open}
      onClose={onClose}
      labelledBy="provider-editor-title"
      closeLabel={t("common.close")}
      layer={layer}
      motion={motion}
    >
      {editor && preset ? (
        <EditorDrawerForm
          editor={editor}
          preset={preset}
          probe={probe}
          modelChoices={modelChoices}
          refs={refs ?? []}
          canSave={canSave}
          detecting={detecting}
          saving={saving}
          saveError={saveError}
          secretBlocked={secretBlocked}
          onClose={onClose}
          onChange={onChange}
          onFetchModels={onFetchModels}
          onDetect={onDetect}
          onSave={onSave}
          onOpenAgent={onOpenAgent}
          saveLabel={saveLabel}
          simple={simple}
          focusKey={focusKey}
        />
      ) : null}
    </SettingsSideDrawer>
  )
}

function EditorDrawerForm({
  editor,
  preset,
  probe,
  modelChoices,
  refs,
  canSave,
  detecting,
  saving = false,
  saveError = null,
  secretBlocked = false,
  onClose,
  onChange,
  onFetchModels,
  onDetect,
  onSave,
  onOpenAgent,
  saveLabel,
  simple,
  focusKey
}: {
  editor: EditorState
  preset: ProviderPreset
  probe: ProbeState
  modelChoices: Array<{ id: string; label: string }>
  refs: AgentBindRef[]
  canSave: boolean
  detecting: boolean
  saving?: boolean
  saveError?: SecretWriteErrorCode | null
  secretBlocked?: boolean
  onClose: () => void
  onChange: (patch: Partial<EditorState>) => void
  onFetchModels: () => void
  onDetect: () => void
  onSave: () => void
  onOpenAgent?: (runtimeId: string) => void
  saveLabel?: string
  simple?: boolean
  focusKey?: boolean
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (canSave) onSave()
      }}
      className="flex h-full min-h-0 flex-1 flex-col"
    >
      <EditorDrawerHeader editor={editor} preset={preset} refs={refs} onClose={onClose} onOpenAgent={onOpenAgent} />
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-6 py-5">
        {secretBlocked ? <SecretWritePreflight className="mb-4" /> : null}
        {simple ? (
          <ProviderSimpleFields
            editor={editor}
            preset={preset}
            modelChoices={modelChoices}
            detecting={detecting}
            onChange={onChange}
            onDetect={onDetect}
            focusKey={focusKey}
          />
        ) : (
          <ProviderEditorFields
            editor={editor}
            preset={preset}
            modelChoices={modelChoices}
            probe={probe}
            detecting={detecting}
            onChange={onChange}
            onFetchModels={onFetchModels}
            onDetect={onDetect}
          />
        )}
      </div>
      <EditorDrawerFooter
        docsURL={preset.docsURL}
        canSave={canSave}
        saving={saving}
        saveLabel={saveLabel}
        saveError={secretBlocked ? null : saveError}
        secretBlocked={secretBlocked}
        onClose={onClose}
      />
    </form>
  )
}
