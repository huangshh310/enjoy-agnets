/**
 * 供应商添加 / 编辑：右侧抽屉，与智能体配置同一套壳。
 */
import { RiCloseLine, RiExternalLinkLine } from "@remixicon/react"
import type { AgentBindRef } from "@enjoy-agents/ipc-contract"
import type { ProviderPreset } from "@enjoy-agents/providers/presets"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { handleDrawerClosePointer } from "../settings-drawer-close"
import { SettingsSideDrawer } from "../settings-side-drawer"
import { presetBlurb } from "./provider-blurb"
import { ProviderEditorFields } from "./provider-editor-fields"
import { ProviderIcon } from "./provider-icons"
import type { EditorState, ProbeState } from "./providers.types"

export function ProviderEditorDrawer({
  editor,
  preset,
  probe,
  modelChoices,
  refs,
  canSave,
  detecting,
  onClose,
  onChange,
  onFetchModels,
  onDetect,
  onSave,
  onOpenAgent,
  saveLabel,
  layer = "base"
}: {
  editor: EditorState | null
  preset: ProviderPreset | null
  probe: ProbeState
  modelChoices: Array<{ id: string; label: string }>
  refs?: AgentBindRef[]
  canSave: boolean
  detecting: boolean
  onClose: () => void
  onChange: (patch: Partial<EditorState>) => void
  onFetchModels: () => void
  onDetect: () => void
  onSave: () => void
  onOpenAgent?: (runtimeId: string) => void
  saveLabel?: string
  layer?: "base" | "nested"
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
          onClose={onClose}
          onChange={onChange}
          onFetchModels={onFetchModels}
          onDetect={onDetect}
          onSave={onSave}
          onOpenAgent={onOpenAgent}
          saveLabel={saveLabel}
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
  onClose,
  onChange,
  onFetchModels,
  onDetect,
  onSave,
  onOpenAgent,
  saveLabel
}: {
  editor: EditorState
  preset: ProviderPreset
  probe: ProbeState
  modelChoices: Array<{ id: string; label: string }>
  refs: AgentBindRef[]
  canSave: boolean
  detecting: boolean
  onClose: () => void
  onChange: (patch: Partial<EditorState>) => void
  onFetchModels: () => void
  onDetect: () => void
  onSave: () => void
  onOpenAgent?: (runtimeId: string) => void
  saveLabel?: string
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
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
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
      </div>
      <EditorDrawerFooter docsURL={preset.docsURL} canSave={canSave} saveLabel={saveLabel} onClose={onClose} />
    </form>
  )
}

function EditorDrawerHeader({
  editor,
  preset,
  refs,
  onClose,
  onOpenAgent
}: {
  editor: EditorState
  preset: ProviderPreset
  refs: AgentBindRef[]
  onClose: () => void
  onOpenAgent?: (runtimeId: string) => void
}) {
  const t = useT()
  const titleName =
    editor.name.trim() || (preset.kind === "custom" ? t("settings.providers.customName") : preset.name)
  const description = preset.kind === "custom"
    ? t("settings.providers.customDesc")
    : presetBlurb(preset.kind, preset.description, t)
  return (
    <header className="flex shrink-0 items-start justify-between gap-3 border-b border-separator-border/60 bg-background-secondary-default/30 px-6 py-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border-button-default bg-background-primary-default shadow-2xs">
          <ProviderIcon kind={preset.kind} name={editor.name || preset.name} apiStyle={editor.baseAPI} size={22} />
        </div>
        <div className="min-w-0">
          <h3 id="provider-editor-title" className="truncate text-title-3-semibold text-text-primary">
            {editor.id
              ? t("settings.providers.editTitle", { name: titleName })
              : preset.kind === "custom"
                ? t("settings.providers.addCustom")
                : t("settings.providers.addTitle", { name: titleName })}
          </h3>
          <p className="mt-0.5 text-caption-1-medium text-text-secondary">{description}</p>
          <EditorBoundAgents refs={refs} onOpenAgent={onOpenAgent} />
        </div>
      </div>
      <button
        type="button"
        onPointerDown={(event) => handleDrawerClosePointer(event, onClose)}
        onClick={onClose}
        data-app-region="no-drag"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-tertiary [app-region:no-drag] hover:bg-background-secondary-default hover:text-text-primary"
        aria-label={t("common.close")}
      >
        <RiCloseLine className="size-5" />
      </button>
    </header>
  )
}

function EditorDrawerFooter({
  docsURL,
  canSave,
  saveLabel,
  onClose
}: {
  docsURL?: string
  canSave: boolean
  saveLabel?: string
  onClose: () => void
}) {
  const t = useT()
  return (
    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-separator-border/60 px-6 py-4">
      {docsURL ? (
        <a
          href={docsURL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-caption-1-medium text-text-tertiary hover:text-text-primary"
        >
          {t("settings.providers.apiDocs")}
          <RiExternalLinkLine className="size-3" />
        </a>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" size="sm" disabled={!canSave}>
          {saveLabel ?? t("settings.providers.saveActivate")}
        </Button>
      </div>
    </footer>
  )
}

function EditorBoundAgents({
  refs,
  onOpenAgent
}: {
  refs: AgentBindRef[]
  onOpenAgent?: (runtimeId: string) => void
}) {
  const t = useT()
  if (refs.length === 0) return null
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span className="text-caption-2-medium text-text-tertiary">{t("settings.providers.usedBy")}</span>
      {refs.map((ref) => (
        <button
          key={ref.id}
          type="button"
          onClick={() => onOpenAgent?.(ref.id)}
          className="rounded-md border border-border-button-default bg-background-primary-default px-1.5 py-0.5 text-caption-2-medium text-text-secondary hover:border-accent-500/50 hover:text-text-primary"
        >
          {ref.label}
        </button>
      ))}
    </div>
  )
}
