/**
 * I2 精选区：MCP | Skills 两列写入现有 SoT；catalog 失败只空本区。
 */
import { useT } from "@renderer/i18n"
import { EXTENSIONS_COPY } from "../extensions-copy.ts"
import { isMcpWritten, isSkillWritten } from "../extensions-written.ts"
import { CuratedCard } from "./curated-card.tsx"
import { CuratedEmpty } from "./curated-empty.tsx"
import { CuratedToast } from "./curated-toast.tsx"
import { useCuratedAdd } from "./use-curated-add.ts"
import { useCuratedCatalog } from "./use-curated-catalog.ts"
import type { ExtensionCuratedCard } from "../extensions.types.ts"

export function CuratedSection({
  servers,
  sources
}: {
  servers: ReadonlyArray<{ name: string }>
  sources: ReadonlyArray<{ id: string; name: string; origin: string }>
}) {
  const t = useT()
  const catalog = useCuratedCatalog()
  const { add, addingId, toastOpen, error } = useCuratedAdd()

  return (
    <section data-testid="extensions-curated" className="relative space-y-3">
      <CuratedToast open={toastOpen} />
      <div>
        <h2 className="text-body-medium text-text-primary">{t(EXTENSIONS_COPY.curatedTitle)}</h2>
        <p className="mt-0.5 text-caption-2-regular text-text-tertiary">{t(EXTENSIONS_COPY.curatedDesc)}</p>
      </div>
      {catalog.isError ? (
        <CuratedEmpty onRetry={() => void catalog.refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <CuratedKindColumn
            kind="mcp"
            title={t(EXTENSIONS_COPY.mcpTitle)}
            cards={catalog.data?.mcp ?? []}
            written={(card) => isMcpWritten(servers, card)}
            addingId={addingId}
            onAdd={(card) => void add(card)}
          />
          <CuratedKindColumn
            kind="skills"
            title={t(EXTENSIONS_COPY.skillsTitle)}
            cards={catalog.data?.skills ?? []}
            written={(card) => isSkillWritten(sources, card)}
            addingId={addingId}
            onAdd={(card) => void add(card)}
          />
        </div>
      )}
      {error ? <p className="text-caption-2-regular text-text-error-primary">{error}</p> : null}
    </section>
  )
}

function CuratedKindColumn({
  kind,
  title,
  cards,
  written,
  addingId,
  onAdd
}: {
  kind: "mcp" | "skills"
  title: string
  cards: ExtensionCuratedCard[]
  written: (card: ExtensionCuratedCard) => boolean
  addingId: string | null
  onAdd: (card: ExtensionCuratedCard) => void
}) {
  return (
    <article
      data-testid={`extensions-curated-column-${kind}`}
      className="rounded-2xl border border-separator-border bg-background-primary-default p-4"
    >
      <p className="text-caption-2-medium uppercase tracking-wide text-text-tertiary">{title}</p>
      <ul className="mt-2 space-y-2">
        {cards.map((card) => (
          <CuratedCard
            key={`${card.kind}-${card.id}`}
            card={card}
            written={written(card)}
            adding={addingId === card.id}
            onAdd={() => onAdd(card)}
          />
        ))}
      </ul>
    </article>
  )
}
