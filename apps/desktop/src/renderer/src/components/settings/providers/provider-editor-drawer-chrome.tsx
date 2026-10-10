/**
 * 供应商抽屉顶栏 / 底栏：从 editor 壳拆出，避免单文件超 300 行。
 */
import { RiCloseLine, RiExternalLinkLine } from "@remixicon/react"
import type { AgentBindRef } from "@enjoy-agents/ipc-contract"
import type { ProviderPreset } from "@enjoy-agents/providers/presets"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"
import { SecretWriteError, SecretWriteSaveTip } from "../secret-write-notice"
import { handleDrawerClosePointer } from "../settings-drawer-close"
import type { SecretWriteErrorCode } from "@renderer/lib/secret-write"
import { presetBlurb } from "./provider-blurb"
import { ProviderIcon } from "./provider-icons"
import type { EditorState } from "./providers.types"

export function EditorDrawerHeader({
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

export function EditorDrawerFooter({
  docsURL,
  canSave,
  saving,
  saveLabel,
  saveError = null,
  secretBlocked = false,
  onClose
}: {
  docsURL?: string
  canSave: boolean
  saving?: boolean
  saveLabel?: string
  saveError?: SecretWriteErrorCode | null
  secretBlocked?: boolean
  onClose: () => void
}) {
  const t = useT()
  return (
    <footer className="flex shrink-0 items-end justify-between gap-3 border-t border-separator-border/60 px-6 py-4">
      {docsURL ? (
        <a
          href={docsURL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-caption-1-medium text-text-tertiary hover:text-text-primary"
        >
          {t("settings.providers.apiDocs")}
          <RiExternalLinkLine className="size-3" />
        </a>
      ) : (
        <span />
      )}
      <div className="flex min-w-0 flex-col items-end gap-1.5">
        {saveError ? <SecretWriteError code={saveError} className="text-right text-caption-2-medium text-text-error-primary" /> : null}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onPointerDown={(event) => handleDrawerClosePointer(event, onClose)}
            onClick={onClose}
          >
            {t("common.cancel")}
          </Button>
          <SecretWriteSaveTip blocked={secretBlocked}>
            <Button
              type="submit"
              size="sm"
              disabled={!canSave}
              data-testid="provider-editor-save"
              data-saving={saving ? "true" : undefined}
            >
              {saving ? t("settings.secretWrite.saving") : (saveLabel ?? t("settings.providers.saveActivate"))}
            </Button>
          </SecretWriteSaveTip>
        </div>
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
