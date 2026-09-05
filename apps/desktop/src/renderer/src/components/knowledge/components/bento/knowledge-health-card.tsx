/**
 * 来源健康卡。卡面只显示 pathNotFound / statusError，errno 进 title。
 */
import { RiAlertLine, RiCheckDoubleLine, RiDeleteBinLine, RiEditLine, RiHeartPulseLine } from "@remixicon/react"
import type { KnowledgeSource } from "@enjoy-agents/ipc-contract"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { KnowledgeUnavailableSource } from "../../types/knowledge-ui.types"

export function KnowledgeHealthCard({
  unavailable,
  sources,
  onOpenDrawer,
  onEditSource,
  onRemoveSource
}: {
  unavailable: KnowledgeUnavailableSource[]
  sources: KnowledgeSource[]
  onOpenDrawer: () => void
  onEditSource?: (source: KnowledgeSource) => void
  onRemoveSource?: (sourceId: string) => void
}) {
  const t = useT()
  const isHealthy = unavailable.length === 0
  return (
    <div
      id="knowledge-health"
      className="flex flex-col justify-between rounded-3xl border border-separator-border/80 bg-background-primary-default p-5 shadow-card transition-all lg:col-span-3"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-separator-border/40 pb-2">
          <div className="flex items-center gap-2">
            <div
              className={cx(
                "flex size-7 items-center justify-center rounded-xl border",
                isHealthy
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
              )}
            >
              <RiHeartPulseLine className="size-4" />
            </div>
            <h4 className="text-caption-1-medium text-text-primary">{t("pages.knowledge.healthTitle")}</h4>
          </div>
          <span className="font-mono text-caption-2-medium text-text-tertiary">
            {isHealthy
              ? t("pages.knowledge.statusReady")
              : t("pages.knowledge.unavailableSummary", { n: unavailable.length })}
          </span>
        </div>
        {isHealthy ? (
          <div className="flex flex-col gap-2 py-2">
            <div className="flex items-center gap-2 text-caption-1-medium text-emerald-600 dark:text-emerald-400">
              <RiCheckDoubleLine className="size-4 shrink-0" />
              <span>{t("pages.knowledge.sourcesHealthy")}</span>
            </div>
            <p className="text-caption-2-regular text-text-secondary">{t("pages.knowledge.sourcesHealthyHint")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 py-1">
            <div className="flex items-center gap-1.5 text-caption-1-medium text-amber-600 dark:text-amber-400">
              <RiAlertLine className="size-4 shrink-0" />
              <span>{t("pages.knowledge.unavailableSummary", { n: unavailable.length })}</span>
            </div>
            <p className="text-caption-2-regular text-text-secondary">{t("pages.knowledge.unavailableHint")}</p>
            <div className="flex max-h-[110px] flex-col gap-1.5 overflow-y-auto pr-1 pt-1">
              {unavailable.map((item) => (
                <FaultyRow
                  key={item.id ?? item.path}
                  item={item}
                  source={sources.find((source) => source.id === item.id)}
                  onEditSource={onEditSource}
                  onRemoveSource={onRemoveSource}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-end border-t border-separator-border/40 pt-2.5">
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenDrawer}
          className="h-7 px-2 text-caption-2-medium text-text-secondary hover:text-text-primary"
        >
          {t("pages.knowledge.viewAllSources")}
        </Button>
      </div>
    </div>
  )
}

function FaultyRow({
  item,
  source,
  onEditSource,
  onRemoveSource
}: {
  item: KnowledgeUnavailableSource
  source?: KnowledgeSource
  onEditSource?: (source: KnowledgeSource) => void
  onRemoveSource?: (sourceId: string) => void
}) {
  const t = useT()
  const reason = item.reason === "missing" ? t("pages.knowledge.pathNotFound") : t("pages.knowledge.statusError")
  return (
    <div
      className="flex items-center justify-between rounded-xl border border-separator-border/40 bg-background-secondary-default/50 p-1.5"
      title={item.detail}
    >
      <div className="min-w-0">
        <span className="block truncate font-mono text-caption-2-medium text-text-primary">{item.path}</span>
        <span className="text-caption-2-regular text-amber-600 dark:text-amber-400">{reason}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {source && onEditSource ? (
          <button
            type="button"
            onClick={() => onEditSource(source)}
            className="cursor-pointer rounded p-1 text-text-tertiary hover:text-text-primary"
            title={t("pages.knowledge.reselectPath")}
          >
            <RiEditLine className="size-3.5" />
          </button>
        ) : null}
        {item.id && onRemoveSource ? (
          <button
            type="button"
            onClick={() => onRemoveSource(item.id!)}
            className="cursor-pointer rounded p-1 text-text-tertiary hover:text-rose-600"
            title={t("pages.knowledge.removeSource")}
          >
            <RiDeleteBinLine className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
