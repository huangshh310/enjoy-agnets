/**
 * 提示收藏 popover：常显搜 · 已收藏 · 最近 · 空态 / 搜无。
 * BoardUI 语义 token；禁任意值 class / 裸 hex。
 */
import type { ReactNode } from "react"
import { RiCloseLine, RiSearchLine, RiStarFill, RiStarLine } from "@remixicon/react"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"
import type { PromptLibraryRow } from "./prompt-library-types.ts"

export function ComposerPromptLibraryPopover({
  query,
  onQueryChange,
  starred,
  recent,
  empty,
  onInsert,
  onToggleStar,
  onClose,
  running
}: {
  query: string
  onQueryChange: (value: string) => void
  starred: PromptLibraryRow[]
  recent: PromptLibraryRow[]
  empty: boolean
  onInsert: (row: PromptLibraryRow) => void
  onToggleStar: (row: PromptLibraryRow) => void
  onClose: () => void
  running: boolean
}) {
  const t = useT()
  const searching = query.trim().length > 0
  return (
    <div
      data-testid="prompt-library-popover"
      className="flex max-h-[min(26.25rem,70vh)] w-[380px] flex-col overflow-hidden rounded-xl border border-separator-border bg-background-primary-default shadow-card"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-separator-border px-3 py-2">
        <h2 className="text-caption-1-semibold text-text-primary">{t("chat.promptLibraryTitle")}</h2>
        <button
          type="button"
          data-testid="prompt-library-close"
          aria-label={t("chat.promptLibraryClose")}
          title={t("chat.promptLibraryClose")}
          onClick={onClose}
          className="flex size-6 items-center justify-center rounded-md text-text-tertiary transition-colors hover:bg-background-secondary-hover hover:text-text-secondary"
        >
          <RiCloseLine className="size-3.5" aria-hidden />
        </button>
      </header>

      <div className="shrink-0 border-b border-separator-border px-3 py-2">
        <label className="flex h-8 items-center gap-2 rounded-lg border border-separator-border bg-background-secondary-default/50 px-2.5">
          <RiSearchLine className="size-3.5 shrink-0 text-text-tertiary" aria-hidden />
          <input
            data-testid="prompt-library-search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("chat.promptLibrarySearch")}
            className="min-w-0 flex-1 bg-transparent text-caption-1-regular text-text-primary outline-none placeholder:text-text-tertiary"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1.5 py-1.5">
        {empty ? (
          <p
            data-testid="prompt-library-empty"
            className="px-3 py-8 text-center text-caption-1-regular text-text-tertiary"
          >
            {searching ? t("chat.promptLibraryNoMatch") : t("chat.promptLibraryEmpty")}
          </p>
        ) : (
          <>
            {starred.length > 0 ? (
              <Section label={t("chat.promptLibraryStarred")} testId="prompt-library-starred">
                {starred.map((row) => (
                  <PromptRow
                    key={row.id}
                    row={row}
                    onInsert={onInsert}
                    onToggleStar={onToggleStar}
                  />
                ))}
              </Section>
            ) : null}
            {recent.length > 0 ? (
              <Section label={t("chat.promptLibraryRecent")} testId="prompt-library-recent">
                {recent.map((row) => (
                  <PromptRow
                    key={row.id}
                    row={row}
                    onInsert={onInsert}
                    onToggleStar={onToggleStar}
                  />
                ))}
              </Section>
            ) : null}
          </>
        )}
      </div>

      {running ? (
        <p
          data-testid="prompt-library-running-note"
          className="shrink-0 border-t border-separator-border px-3 py-1.5 text-caption-2-regular text-text-tertiary"
        >
          {t("chat.promptLibraryPrefillRunning")}
        </p>
      ) : null}
    </div>
  )
}

function Section({
  label,
  testId,
  children
}: {
  label: string
  testId: string
  children: ReactNode
}) {
  return (
    <section data-testid={testId} className="mb-1">
      <h3 className="px-2 py-1 text-caption-2-medium uppercase tracking-wide text-text-tertiary">
        {label}
      </h3>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </section>
  )
}

function PromptRow({
  row,
  onInsert,
  onToggleStar
}: {
  row: PromptLibraryRow
  onInsert: (row: PromptLibraryRow) => void
  onToggleStar: (row: PromptLibraryRow) => void
}) {
  const t = useT()
  const starLabel = row.starred ? t("chat.promptLibraryUnstar") : t("chat.promptLibraryStar")
  return (
    <li>
      <div
        data-testid="prompt-library-row"
        className="group flex items-start gap-1 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-background-secondary-hover"
      >
        <button
          type="button"
          data-testid="prompt-library-insert"
          onClick={() => onInsert(row)}
          className="min-w-0 flex-1 cursor-pointer rounded-md px-1 py-0.5 text-left"
        >
          <span className="line-clamp-2 text-caption-1-regular text-text-primary">{row.text}</span>
        </button>
        <button
          type="button"
          data-testid="prompt-library-star"
          aria-label={starLabel}
          title={starLabel}
          aria-pressed={row.starred}
          onClick={(event) => {
            event.stopPropagation()
            onToggleStar(row)
          }}
          className={cx(
            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md transition-colors",
            row.starred
              ? "text-accent-500 hover:bg-background-secondary-hover"
              : "text-text-tertiary opacity-70 hover:bg-background-secondary-hover hover:text-text-secondary hover:opacity-100 group-hover:opacity-100"
          )}
        >
          {row.starred ? (
            <RiStarFill className="size-3.5" aria-hidden />
          ) : (
            <RiStarLine className="size-3.5" aria-hidden />
          )}
        </button>
      </div>
    </li>
  )
}
