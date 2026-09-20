/**
 * 扩展发现壳单列：标题、已配置数、「添加」深链、已配置短名单。
 */
import { ExtensionsItem } from "./extensions-item.tsx"
import type { ExtensionsColumnModel } from "./extensions.types.ts"

export function ExtensionsColumn({ column }: { column: ExtensionsColumnModel }) {
  return (
    <article
      data-testid={`extensions-column-${column.id}`}
      className="rounded-2xl border border-separator-border bg-background-primary-default p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-body-medium text-text-primary">{column.title}</h3>
          <p className="mt-0.5 text-caption-2-regular text-text-tertiary">{column.countLabel}</p>
        </div>
        <a
          href={column.addHref}
          data-testid={`extensions-add-${column.id}`}
          className="inline-flex shrink-0 items-center rounded-md bg-accent-500 px-2.5 py-1 text-caption-2-medium text-text-white hover:bg-accent-600"
        >
          {column.addLabel}
        </a>
      </div>
      {column.configured.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {column.configured.map((name) => (
            <ExtensionsItem key={name} label={name} />
          ))}
        </ul>
      ) : null}
    </article>
  )
}
