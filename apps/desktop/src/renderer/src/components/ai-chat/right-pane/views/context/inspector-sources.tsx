/**
 * 本轮引用源列表。
 */
import { RiSparklingFill } from "@remixicon/react"
import type { CitedSource } from "@enjoy-agents/ipc-contract"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { useT } from "@renderer/i18n"

export function InspectorSources({ sources }: { sources: CitedSource[] }) {
  const t = useT()
  return (
    <section className="flex flex-col gap-2 border-t border-separator-border/50 pt-3">
      <span className="text-caption-2-medium font-semibold text-text-tertiary">
        {t("chat.inspectorSources", { n: sources.length })}
      </span>
      {sources.length === 0 ? (
        <p className="text-caption-2-regular text-text-tertiary">{t("chat.inspectorEmptySources")}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {sources.map((source, index) => (
            <button
              key={`${source.path}-${index}`}
              type="button"
              onClick={() => void openChangedFile(source.path)}
              className="flex items-center gap-2 rounded-lg border border-border-button-default/50 bg-background-secondary-default/40 px-2.5 py-1.5 text-left hover:bg-background-secondary-hover"
            >
              <RiSparklingFill className="size-3.5 shrink-0 text-accent-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-caption-1-medium text-text-primary">
                  {source.title || source.path}
                </p>
                <p className="truncate font-mono text-caption-2-regular text-text-tertiary">
                  {source.path}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
