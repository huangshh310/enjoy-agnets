/**
 * 「添加 API 密钥」第一步：先选一家再贴密钥，不直接跳进 DeepSeek 表单。
 */
import { PROVIDER_PRESETS, type ProviderKind, type ProviderPreset } from "@enjoy-agents/providers/presets"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import { ProviderIcon } from "./provider-icons"

export function keyPresets(): ProviderPreset[] {
  return PROVIDER_PRESETS.filter((preset) => preset.kind !== "custom" && preset.requiresKey)
}

export function ProviderPickPanel({
  onPick,
  onCancel
}: {
  onPick: (kind: ProviderKind) => void
  onCancel: () => void
}) {
  const t = useT()
  return (
    <div data-testid="provider-pick-panel" className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 border-b border-separator-border/60 px-6 py-4">
        <h3 id="provider-pick-title" className="text-title-3-semibold text-text-primary">
          {t("settings.providers.pickTitle")}
        </h3>
        <p className="mt-0.5 text-caption-1-medium text-text-secondary">{t("settings.providers.pickHint")}</p>
      </header>
      <ul className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {keyPresets().map((preset) => (
          <li key={preset.kind}>
            <button
              type="button"
              data-testid={`provider-pick-${preset.kind}`}
              onClick={() => onPick(preset.kind)}
              className={cx(
                "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left",
                "hover:bg-background-secondary-hover"
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-border-button-default bg-background-primary-default">
                <ProviderIcon kind={preset.kind} name={preset.name} size={20} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-body-2-medium text-text-primary">{preset.name}</span>
                <span className="block truncate text-caption-2-regular text-text-secondary">{preset.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <footer className="flex shrink-0 justify-end border-t border-separator-border/60 px-6 py-4">
        <button
          type="button"
          data-testid="provider-pick-cancel"
          onClick={onCancel}
          className="cursor-pointer rounded-lg px-3 py-1.5 text-caption-1-medium text-text-secondary hover:text-text-primary"
        >
          {t("common.cancel")}
        </button>
      </footer>
    </div>
  )
}
