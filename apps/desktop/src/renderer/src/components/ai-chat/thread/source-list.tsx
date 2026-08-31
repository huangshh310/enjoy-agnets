/**
 * 知识引用来源：点选打开 Files，不把整篇塞进正文。
 */
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import type { ThreadMessage } from "@renderer/stores/chat-store"

export function SourceList({
  sources
}: {
  sources: NonNullable<ThreadMessage["sources"]>
}) {
  return (
    <ul className="rounded-2xl border border-border-secondary-default bg-background-secondary-default/60 px-3 py-2">
      {sources.map((source) => (
        <li key={source.sourceId} className="py-1">
          <button
            type="button"
            className="w-full text-left"
            onClick={() => void openChangedFile(source.path)}
          >
            <p className="text-body-medium text-text-primary">{source.title}</p>
            <p className="text-body-medium text-text-secondary">
              {source.path}
              {source.startLine != null ? `:${source.startLine}` : ""}
            </p>
            {source.snippet ? (
              <p className="mt-0.5 line-clamp-2 text-body-medium text-text-tertiary">
                {source.snippet}
              </p>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  )
}
