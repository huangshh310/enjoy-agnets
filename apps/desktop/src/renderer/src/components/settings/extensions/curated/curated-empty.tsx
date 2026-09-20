/**
 * catalog 失败诚实空：只空精选区 + 重试，不造假已装卡。
 */
import { useT } from "@renderer/i18n"
import { EXTENSIONS_COPY } from "../extensions-copy.ts"

export function CuratedEmpty({ onRetry }: { onRetry: () => void }) {
  const t = useT()
  return (
    <div
      data-testid="extensions-curated-empty"
      className="rounded-2xl border border-dashed border-separator-border bg-background-secondary-default px-4 py-6 text-center"
    >
      <p className="text-body-medium text-text-primary">{t(EXTENSIONS_COPY.catalogFailTitle)}</p>
      <p className="mt-1 text-caption-2-regular text-text-tertiary">{t(EXTENSIONS_COPY.catalogFailDesc)}</p>
      <button
        type="button"
        data-testid="extensions-curated-retry"
        onClick={onRetry}
        className="mt-3 inline-flex h-7 items-center rounded-lg bg-accent-500 px-3 text-caption-2-medium text-text-white hover:bg-accent-600"
      >
        {t(EXTENSIONS_COPY.retry)}
      </button>
    </div>
  )
}
