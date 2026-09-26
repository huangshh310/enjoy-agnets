/**
 * 扩展发现壳单列：标题、已配置数、「添加」深链、已配置短名单。
 */
import { RiSparklingLine } from "@remixicon/react"
import { McpIcon } from "@renderer/components/mcp/components/mcp-brand-icons.ts"
import { cx } from "@/utils/cx"
import { ExtensionsItem } from "./extensions-item.tsx"
import type { ExtensionsColumnModel } from "./extensions.types.ts"

export function ExtensionsColumn({ column }: { column: ExtensionsColumnModel }) {
  const isMcp = column.id === "mcp"
  return (
    <article
      data-testid={`extensions-column-${column.id}`}
      className="rounded-2xl border border-separator-border bg-background-primary-default p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cx(
              "flex size-10 shrink-0 items-center justify-center rounded-xl border",
              isMcp
                ? "border-chart-5/20 bg-chart-5/10 text-chart-5 dark:text-chart-5"
                : "border-status-yellow-text/20 bg-status-yellow-background/10 text-status-yellow-text dark:text-status-yellow-text"
            )}
          >
            {isMcp ? <McpIcon className="size-5" /> : <RiSparklingLine className="size-5" />}
          </div>
          <div>
          <h3 className="text-body-medium text-text-primary">{column.title}</h3>
          <p className="mt-0.5 text-caption-2-regular text-text-tertiary">{column.countLabel}</p>
        </div>
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
        <ul className="mt-3.5 space-y-1.5 border-t border-separator-border/60 pt-3">
          {column.configured.map((name) => (
            <ExtensionsItem key={name} label={name} kind={column.id} />
          ))}
        </ul>
      ) : null}
    </article>
  )
}
