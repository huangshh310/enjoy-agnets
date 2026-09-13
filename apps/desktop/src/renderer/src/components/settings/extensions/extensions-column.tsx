/**
 * 扩展发现壳单列：标题、已配置计数、「添加」深链、精选卡槽。
 */
import type { ExtensionsColumnModel } from "./extensions.types.ts"

export function ExtensionsColumn({ column }: { column: ExtensionsColumnModel }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-card">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-body-large-semibold text-text-primary">{column.title}</h2>
          <p className="mt-0.5 text-caption-2-regular text-text-tertiary">{column.countLabel}</p>
        </div>
        <a
          href={column.addHref}
          className="inline-flex h-8 shrink-0 items-center rounded-md bg-accent-500 px-2.5 text-caption-2-medium text-white"
        >
          {column.addLabel}
        </a>
      </header>
      <ul className="flex flex-col gap-2">
        {column.cards.map((card) => (
          <li key={card.id}>
            <a
              href={card.href}
              className="block rounded-xl border border-border-button-default px-3 py-2 hover:border-border-button-hover hover:bg-background-secondary-hover"
            >
              <p className="truncate text-caption-1-medium text-text-primary">{card.title}</p>
              <p className="mt-0.5 line-clamp-2 text-caption-2-regular text-text-tertiary">{card.description}</p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
