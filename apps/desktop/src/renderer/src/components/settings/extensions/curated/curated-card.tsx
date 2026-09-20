/**
 * 精选卡：未写入出添加按钮；已写入安静态。不链第二套表单。
 */
import { useT } from "@renderer/i18n"
import { EXTENSIONS_COPY } from "../extensions-copy.ts"
import type { ExtensionCuratedCard } from "../extensions.types.ts"

export function CuratedCard({
  card,
  written,
  adding,
  onAdd
}: {
  card: ExtensionCuratedCard
  written: boolean
  adding: boolean
  onAdd: () => void
}) {
  const t = useT()
  const addLabel = card.kind === "mcp" ? t(EXTENSIONS_COPY.addToMcp) : t(EXTENSIONS_COPY.addToSkills)
  return (
    <li
      data-testid={`extensions-curated-${card.kind}-${card.id}`}
      className="rounded-xl border border-separator-border px-3 py-2"
    >
      <p className="text-caption-1-medium text-text-primary">{card.title}</p>
      <p className="mt-0.5 text-caption-2-regular text-text-tertiary">{card.description}</p>
      {written ? (
        <p className="mt-1.5 text-caption-2-regular text-text-tertiary">{t(EXTENSIONS_COPY.written)}</p>
      ) : (
        <button
          type="button"
          data-testid={`extensions-curated-add-${card.kind}-${card.id}`}
          disabled={adding}
          onClick={onAdd}
          className="mt-1.5 rounded-md border border-separator-border bg-background-primary-default px-2 py-1 text-caption-2-medium text-text-primary hover:border-accent-500/40 disabled:opacity-50"
        >
          {addLabel}
        </button>
      )}
    </li>
  )
}
