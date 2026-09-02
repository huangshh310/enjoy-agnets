/**
 * Studio Zone 1：工作区、知识库、媒体资产。
 */
import {
  RiArrowRightLine,
  RiBookOpenLine,
  RiCheckLine,
  RiClipboardLine,
  RiFileMusicLine,
  RiFileVideoLine,
  RiFolder6Line,
  RiFolderOpenLine,
  RiImageLine,
  RiLoader4Line
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import type { AssetRecord, KnowledgeSource } from "@enjoy-agents/ipc-contract"
import { openFolder } from "@renderer/hooks/use-agent-session"
import { useT } from "@renderer/i18n"

export function StudioAssetsKnowledgeZone({
  workspaceName,
  workspaceRootLabel,
  copiedPath,
  onCopyPath,
  onOpenChat,
  onOpenKnowledge,
  onOpenMedia,
  sources,
  totalChunks,
  isIndexing,
  assets
}: {
  workspaceName: string
  workspaceRootLabel: string
  copiedPath: boolean
  onCopyPath: () => void
  onOpenChat: () => void
  onOpenKnowledge: () => void
  onOpenMedia: () => void
  sources: KnowledgeSource[]
  totalChunks: number
  isIndexing: boolean
  assets: AssetRecord[]
}) {
  const t = useT()

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-5 items-center justify-center rounded-md bg-accent-500/10 text-accent-500">
            <RiFolder6Line className="size-3.5" />
          </div>
          <h3 className="text-body-medium font-semibold text-text-primary">{t("studio.assets.title")}</h3>
        </div>
        <span className="text-caption-2-medium text-text-tertiary">{t("studio.assets.subtitle")}</span>
      </div>
      <div className="grid gap-3.5 md:grid-cols-3">
        <article className="group relative flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md md:col-span-2">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-text-primary shadow-xs transition-colors group-hover:border-accent-500/30 group-hover:bg-accent-500/10 group-hover:text-accent-500">
                  <RiFolderOpenLine className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-body-medium font-semibold text-text-primary transition-colors group-hover:text-accent-500">
                      {workspaceName || t("studio.assets.noWorkspace")}
                    </h4>
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {t("studio.assets.activeRoot")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-caption-1-medium text-text-secondary">{t("studio.assets.workspaceDesc")}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void openFolder()}
                className="h-8 shrink-0 gap-1 text-caption-2-medium shadow-xs"
              >
                <RiFolderOpenLine className="size-3.5" />
                <span>{t("studio.assets.switchFolder")}</span>
              </Button>
            </div>
            {workspaceRootLabel ? (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-separator-border/60 bg-background-secondary-default p-2.5">
                <div className="min-w-0 truncate font-mono text-[12px] text-text-secondary">
                  <span className="truncate">{workspaceRootLabel}</span>
                </div>
                <button
                  type="button"
                  title={t("studio.assets.copyPath")}
                  onClick={onCopyPath}
                  className="inline-flex shrink-0 items-center rounded-md border border-border-button-default bg-background-primary-default p-1 text-text-tertiary shadow-xs transition-colors hover:text-text-primary"
                >
                  {copiedPath ? (
                    <RiCheckLine className="size-3 text-emerald-500" />
                  ) : (
                    <RiClipboardLine className="size-3" />
                  )}
                </button>
              </div>
            ) : null}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
            <span className="text-caption-2-medium text-text-tertiary">{t("studio.assets.nativeFs")}</span>
            <button
              type="button"
              onClick={onOpenChat}
              className="inline-flex items-center gap-1 text-caption-2-medium font-medium text-accent-600 hover:underline dark:text-accent-400"
            >
              <span>{t("studio.assets.openInChat")}</span>
              <RiArrowRightLine className="size-3.5" />
            </button>
          </div>
        </article>

        <article
          onClick={onOpenKnowledge}
          className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md"
        >
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-text-primary shadow-xs transition-colors group-hover:border-accent-500/30 group-hover:bg-accent-500/10 group-hover:text-accent-500">
                <RiBookOpenLine className="size-5" />
              </div>
              <span
                className={cx(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  isIndexing
                    ? "border border-accent-500/20 bg-accent-500/10 text-accent-600 dark:text-accent-400"
                    : sources.length > 0
                      ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border border-border-button-default bg-background-secondary-default text-text-tertiary"
                )}
              >
                {isIndexing ? (
                  <span className="inline-flex items-center gap-1">
                    <RiLoader4Line className="size-3 animate-spin" />
                    {t("studio.assets.indexing")}
                  </span>
                ) : sources.length > 0 ? (
                  t("studio.assets.ready")
                ) : (
                  t("studio.assets.empty")
                )}
              </span>
            </div>
            <h4 className="mt-3.5 text-body-medium font-semibold text-text-primary transition-colors group-hover:text-accent-500">
              {t("studio.assets.knowledgeTitle")}
            </h4>
            <p className="mt-0.5 text-caption-1-medium text-text-secondary">{t("studio.assets.knowledgeDesc")}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-background-secondary-default p-2.5 text-center">
              <div>
                <p className="font-mono text-body-medium font-semibold text-text-primary">{sources.length}</p>
                <p className="text-[11px] text-text-tertiary">{t("studio.assets.sources")}</p>
              </div>
              <div>
                <p className="font-mono text-body-medium font-semibold text-text-primary">{totalChunks}</p>
                <p className="text-[11px] text-text-tertiary">{t("studio.assets.chunks")}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-separator-border/60 pt-3">
            <span className="inline-flex items-center gap-1 text-caption-2-medium font-medium text-accent-600 group-hover:underline dark:text-accent-400">
              <span>{t("studio.assets.manageKnowledge")}</span>
              <RiArrowRightLine className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </article>

        <article
          onClick={onOpenMedia}
          className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-5 shadow-xs transition-all hover:border-accent-500/40 hover:shadow-md md:col-span-3"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-text-primary shadow-xs transition-colors group-hover:border-accent-500/30 group-hover:bg-accent-500/10 group-hover:text-accent-500">
                <RiImageLine className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-body-medium font-semibold text-text-primary transition-colors group-hover:text-accent-500">
                    {t("studio.assets.mediaTitle")}
                  </h4>
                  <span className="rounded-full border border-border-button-default bg-background-secondary-default px-2 py-0.5 font-mono text-[11px] text-text-secondary">
                    {t("studio.assets.assetCount", { count: assets.length })}
                  </span>
                </div>
                <p className="mt-0.5 text-caption-1-medium text-text-secondary">{t("studio.assets.mediaDesc")}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-lg border border-border-button-default bg-background-secondary-default px-2.5 py-1 text-caption-2-medium text-text-secondary">
                <RiImageLine className="size-3.5 text-accent-500" />
                <span>{t("studio.assets.images")}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-border-button-default bg-background-secondary-default px-2.5 py-1 text-caption-2-medium text-text-secondary">
                <RiFileMusicLine className="size-3.5 text-amber-500" />
                <span>{t("studio.assets.speech")}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-border-button-default bg-background-secondary-default px-2.5 py-1 text-caption-2-medium text-text-secondary">
                <RiFileVideoLine className="size-3.5 text-purple-500" />
                <span>{t("studio.assets.video")}</span>
              </span>
            </div>
          </div>
          <div className="mt-3.5 flex items-center justify-between border-t border-separator-border/60 pt-3">
            <span className="text-caption-2-medium text-text-tertiary">{t("studio.assets.exportHint")}</span>
            <span className="inline-flex items-center gap-1 text-caption-2-medium font-medium text-accent-600 group-hover:underline dark:text-accent-400">
              <span>{t("studio.assets.openMedia")}</span>
              <RiArrowRightLine className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </article>
      </div>
    </section>
  )
}
