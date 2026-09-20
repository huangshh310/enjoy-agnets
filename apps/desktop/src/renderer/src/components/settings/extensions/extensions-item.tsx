/**
 * 扩展列精选行：只读投影，点击深链现有工作模块。
 */
import type { ExtensionCuratedCard } from "./extensions.types.ts"

export function ExtensionsItem({ card }: { card: ExtensionCuratedCard }) {
  return (
    <li>
      <a
        href={card.href}
        data-testid={`extensions-item-${card.kind}-${card.id}`}
        className="block rounded-xl border border-separator-border px-3 py-2 transition-colors hover:border-accent-500/40 hover:bg-background-secondary-default/40"
      >
        <p className="text-caption-1-medium text-text-primary">{card.title}</p>
        <p className="mt-0.5 text-caption-2-regular text-text-tertiary">{card.description}</p>
      </a>
    </li>
  )
}
