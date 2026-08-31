/**
 * Extract 卡片：标题 + 摘要 + 标签，不是倒 JSON。
 */
import type { ExtractObject } from "@renderer/hooks/extract-object-shape"

export function ExtractObjectCard({ value }: { value: ExtractObject }) {
  return (
    <article className="w-full max-w-md rounded-2xl bg-background-secondary-default px-4 py-3">
      <h3 className="text-title-3-semibold text-text-primary">{value.title}</h3>
      <p className="mt-1 text-body-medium text-text-secondary">{value.summary}</p>
      {value.items.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {value.items.map((item) => (
            <li
              key={item}
              className="rounded-full bg-background-tertiary-default px-2.5 py-0.5 text-caption-1-medium text-text-secondary"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}
