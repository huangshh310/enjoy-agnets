/**
 * Composer 已排队附件，发送前可见。
 */
import { useEffect, useState } from "react"
import { listComposerAssets, subscribeComposerAssets, type QueuedComposerAsset } from "@renderer/hooks/composer-assets"

export function ComposerQueue() {
  const [items, setItems] = useState<QueuedComposerAsset[]>(() => listComposerAssets())
  useEffect(() => subscribeComposerAssets(setItems), [])
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 px-3.5 pb-1">
      {items.map((item) => (
        <span
          key={item.id}
          data-testid="composer-asset-chip"
          className="rounded-full border border-border-button-default px-2 py-0.5 text-caption-1-medium text-text-secondary"
        >
          {item.name}
        </span>
      ))}
    </div>
  )
}
