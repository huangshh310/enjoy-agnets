/**
 * 精选卡：未写入出添加按钮；已写入安静态。不链第二套表单。
 */
import {
  RiBookOpenLine,
  RiCheckLine,
  RiFlashlightLine,
  RiPaletteLine,
  RiSparklingLine
} from "@remixicon/react"
import {
  FilesystemIcon,
  GithubIcon,
  McpIcon,
  PostgreSqlIcon
} from "@renderer/components/mcp/components/mcp-brand-icons.ts"
import { cx } from "@/utils/cx"
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
  const isMcp = card.kind === "mcp"
  return (
    <li
      data-testid={`extensions-curated-${card.kind}-${card.id}`}
      className="flex items-start gap-3 rounded-xl border border-separator-border bg-background-primary-default p-3 transition-colors hover:border-border-button-hover"
    >
      <div
        className={cx(
          "flex size-10 shrink-0 items-center justify-center rounded-xl border",
          isMcp
            ? "border-chart-5/20 bg-chart-5/10 text-chart-5 dark:text-chart-5"
            : "border-status-yellow-text/20 bg-status-yellow-background/10 text-status-yellow-text dark:text-status-yellow-text"
        )}
      >
        <CuratedIcon id={card.id} kind={card.kind} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-caption-1-semibold text-text-primary">{card.title}</p>
        <p className="mt-0.5 text-caption-2-regular leading-relaxed text-text-tertiary">{card.description}</p>
        {written ? (
          <div className="mt-2 flex items-center gap-1.5 text-caption-2-medium text-state-success-text dark:text-state-success-text">
            <RiCheckLine className="size-3.5 shrink-0" aria-hidden />
            <span>{t(EXTENSIONS_COPY.written)}</span>
          </div>
        ) : (
          <button
            type="button"
            data-testid={`extensions-curated-add-${card.kind}-${card.id}`}
            disabled={adding}
            onClick={onAdd}
            className="mt-2 inline-flex w-fit cursor-pointer items-center rounded-md border border-separator-border bg-background-secondary-default px-2.5 py-1 text-caption-2-medium text-text-primary transition-colors hover:border-accent-500/40 hover:bg-background-secondary-hover disabled:opacity-50"
          >
            {addLabel}
          </button>
        )}
      </div>
    </li>
  )
}

function CuratedIcon({ id, kind }: { id: string; kind: "mcp" | "skills" }) {
  if (kind === "mcp") {
    if (id === "filesystem") return <FilesystemIcon className="size-5" />
    if (id === "github") return <GithubIcon className="size-5" />
    if (id === "postgres" || id === "postgresql") return <PostgreSqlIcon className="size-5" />
    return <McpIcon className="size-5" />
  }
  if (id.includes("superpowers")) return <RiFlashlightLine className="size-5" />
  if (id.includes("impeccable") || id.includes("design")) return <RiPaletteLine className="size-5" />
  if (id.includes("anthropic") || id.includes("official")) return <RiBookOpenLine className="size-5" />
  return <RiSparklingLine className="size-5" />
}
