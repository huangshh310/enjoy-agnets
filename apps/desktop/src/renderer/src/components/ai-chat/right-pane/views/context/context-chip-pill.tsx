/**
 * 挂载芯片胶囊：文件微标、估算 token、启用/排除、移除。
 */
import { RiCloseLine, RiEyeLine, RiEyeOffLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import {
  removeSessionContextChip,
  toggleSessionContextChip,
  type SessionContextChip
} from "@renderer/hooks/session-context-chips"
import { fileGlyphFor } from "../../file-kind"
import { estimateCharTokens } from "./context-token-estimator.ts"

export function ContextChipPill({ chip }: { chip: SessionContextChip }) {
  const t = useT()
  const isEnabled = chip.enabled !== false
  const glyph = fileGlyphFor(chip.label, "file")
  const mark = typeof glyph === "object" ? glyph.mark : "f"
  const tone = typeof glyph === "object" ? glyph.tone : "text-text-tertiary"
  const chipTokens = estimateCharTokens(chip.snippet?.length ?? 0)

  return (
    <span
      className={cx(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-caption-2-regular",
        isEnabled
          ? "border-border-button-default bg-background-primary-default text-text-primary"
          : "border-dashed border-separator-border bg-background-secondary-default/50 text-text-tertiary opacity-75"
      )}
    >
      <button
        type="button"
        aria-pressed={isEnabled}
        title={isEnabled ? t("chat.inspectorChipExclude") : t("chat.inspectorChipInclude")}
        onClick={() => toggleSessionContextChip(chip.id)}
        className="flex cursor-pointer items-center gap-1 text-left hover:opacity-80"
      >
        <span className={cx("text-caption-2-medium uppercase", tone)}>{mark}</span>
        <span className={cx("max-w-[130px] truncate", !isEnabled && "line-through")}>{chip.label}</span>
        {chipTokens > 0 ? (
          <span className="shrink-0 text-caption-2-regular text-text-tertiary">~{chipTokens}</span>
        ) : null}
        {isEnabled ? (
          <RiEyeLine className="size-2.5 text-accent-500 opacity-70" />
        ) : (
          <RiEyeOffLine className="size-2.5 text-text-tertiary" />
        )}
      </button>
      <button
        type="button"
        className="ml-0.5 cursor-pointer text-text-tertiary transition-colors hover:text-text-primary"
        aria-label={t("common.close")}
        onClick={() => removeSessionContextChip(chip.id)}
      >
        <RiCloseLine className="size-3" />
      </button>
    </span>
  )
}
