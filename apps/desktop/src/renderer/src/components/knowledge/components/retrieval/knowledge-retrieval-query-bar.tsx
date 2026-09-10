/**
 * 检索舞台输入条：回车即搜、默认焦点、Rerank 开关。
 */
import { RiArrowRightLine, RiLoader4Line, RiSearchLine, RiSparklingLine } from "@remixicon/react"
import { BorderBeam } from "@enjoy-agents/ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"

export function KnowledgeRetrievalQueryBar({
  query,
  setQuery,
  rerank,
  setRerank,
  isSearching,
  onSearch
}: {
  query: string
  setQuery: (q: string) => void
  rerank: boolean
  setRerank: (fn: (prev: boolean) => boolean) => void
  isSearching: boolean
  onSearch: () => void
}) {
  const t = useT()
  return (
    <div className="relative flex items-center gap-2">
      <BorderBeam
        size="md"
        colorVariant="ocean"
        theme="auto"
        active={isSearching}
        strength={isSearching ? 0.75 : 0}
        borderRadius={16}
        className="relative flex-1"
      >
        <div className="relative flex-1">
          <RiSearchLine className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
          <Input
            autoFocus
            data-testid="knowledge-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                onSearch()
              }
            }}
            placeholder={t("pages.knowledge.askMemoryPlaceholder")}
            className="h-11 rounded-2xl border-separator-border/70 bg-background-secondary-default/40 pl-10 pr-24 text-body-medium shadow-2xs focus:border-accent-500 focus:bg-background-primary-default"
          />
          <button
            type="button"
            data-testid="knowledge-rerank"
            onClick={() => setRerank((prev) => !prev)}
            className={cx(
              "absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 font-mono text-caption-2-medium",
              rerank
                ? "border-accent-500/40 bg-accent-500/15 text-accent-700 dark:text-accent-300"
                : "border-separator-border/50 bg-background-primary-default text-text-tertiary hover:text-text-secondary"
            )}
            title={rerank ? t("pages.knowledge.rerankOn") : t("pages.knowledge.rerankOff")}
          >
            <RiSparklingLine className="size-3" />
            <span>{rerank ? t("pages.knowledge.rerankOn") : t("pages.knowledge.rerankOff")}</span>
          </button>
        </div>
      </BorderBeam>
      <Button
        size="default"
        data-testid="knowledge-search-submit"
        disabled={!query.trim() || isSearching}
        onClick={onSearch}
        className="h-11 shrink-0 gap-1.5 rounded-2xl px-5 text-body-medium shadow-xs"
      >
        {isSearching ? <RiLoader4Line className="size-4 animate-spin" /> : <RiArrowRightLine className="size-4" />}
        <span>{isSearching ? t("pages.knowledge.searching") : t("pages.knowledge.searchMemory")}</span>
      </Button>
    </div>
  )
}
