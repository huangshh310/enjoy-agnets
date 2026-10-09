/**
 * 设置默认项：探索 / 执行人话卡片。禁止 ask|plan|agent 原文。
 */
import { cx } from "@/utils/cx"
import type { ComposerSurface } from "@renderer/components/ai-chat/composer/composer-mode"
import { useT } from "@renderer/i18n"

export function SettingsDefaultMode({
  surface,
  onChange
}: {
  surface: ComposerSurface
  onChange: (surface: ComposerSurface) => void
}) {
  const t = useT()
  return (
    <div className="px-5 py-4">
      <p className="text-body-medium text-text-primary">{t("settings.defaults.mode")}</p>
      <p className="mt-1 text-caption-1-medium text-text-secondary">{t("settings.defaults.modeDesc")}</p>
      <div className="mt-3 space-y-2">
        <ModeCard
          selected={surface === "explore"}
          title={t("settings.defaults.explore")}
          description={t("settings.defaults.exploreDesc")}
          onPick={() => onChange("explore")}
        />
        <ModeCard
          selected={surface === "execute"}
          title={t("settings.defaults.execute")}
          description={t("settings.defaults.executeDesc")}
          onPick={() => onChange("execute")}
        />
      </div>
    </div>
  )
}

function ModeCard({
  selected,
  title,
  description,
  onPick
}: {
  selected: boolean
  title: string
  description: string
  onPick: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onPick}
      className={cx(
        "flex w-full cursor-pointer items-start gap-2 rounded-xl border p-3 text-left transition-colors",
        selected
          ? "border-accent-500/30 bg-accent-500/10"
          : "border-border-button-default hover:bg-background-secondary-hover"
      )}
    >
      <span
        className={cx(
          "mt-0.5 size-3.5 shrink-0 rounded-full border",
          selected ? "border-4 border-accent-500" : "border-border-button-default"
        )}
        aria-hidden
      />
      <span>
        <span className="block text-body-2-semibold text-text-primary">{title}</span>
        <span className="mt-0.5 block text-caption-1-medium text-text-secondary">{description}</span>
      </span>
    </button>
  )
}
