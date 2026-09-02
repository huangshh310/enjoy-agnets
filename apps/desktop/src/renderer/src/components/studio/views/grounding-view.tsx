/**
 * Agent Studio View 2: 数据与上下文 (Grounding)
 * 高密度双列对齐：左侧工作区本地文件系统，右侧 RAG 向量知识库与多模态资产画廊。
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
  RiHardDrive2Line,
  RiImageLine,
  RiLoader4Line
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { cx } from "@/utils/cx"
import { openFolder } from "@renderer/hooks/use-agent-session"
import { useT } from "@renderer/i18n"
import type { StudioCommonProps } from "../studio.types"

export function StudioGroundingView({
  workspaceName,
  workspaceRootLabel,
  copiedPath,
  onCopyPath,
  onOpenChat,
  dash,
  onNavigateTo
}: StudioCommonProps) {
  const t = useT()

  return (
    <div className="flex flex-col gap-4">
      {/* 顶部双列卡片 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 卡片 1: 工作区原生文件系统 */}
        <article className="flex flex-col justify-between rounded-2xl border border-border-button-default/50 bg-background-primary-default p-5 shadow-2xs">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
                  <RiFolder6Line className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-title-3-semibold text-text-primary">
                    {workspaceName || t("studio.assets.noWorkspace")}
                  </h3>
                  <span className="text-caption-2-regular text-text-tertiary">
                    {t("studio.assets.activeRoot")}
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => void openFolder()}
                className="gap-1.5 text-caption-1-medium cursor-pointer"
              >
                <RiFolderOpenLine className="size-3.5" />
                <span>{t("studio.assets.switchFolder")}</span>
              </Button>
            </div>

            <p className="text-body-regular text-text-secondary">
              {t("studio.assets.workspaceDesc")}
            </p>

            {/* 完整路径输入条 */}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-border-button-default/40 bg-background-secondary-default/50 px-3.5 py-2 font-mono text-caption-1-medium text-text-secondary">
              <span className="truncate">{workspaceRootLabel || t("studio.assets.noWorkspace")}</span>
              <button
                type="button"
                onClick={onCopyPath}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-0.5 text-caption-2-medium text-text-secondary hover:bg-background-primary-default hover:text-text-primary transition-colors cursor-pointer"
              >
                {copiedPath ? (
                  <>
                    <RiCheckLine className="size-3 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">{t("studio.confirm")}</span>
                  </>
                ) : (
                  <>
                    <RiClipboardLine className="size-3 text-text-tertiary" />
                    <span>{t("studio.assets.copyPath")}</span>
                  </>
                )}
              </button>
            </div>

            {/* 文件系统监视器状态提示 */}
            <div className="flex items-center gap-2 rounded-xl border border-border-button-default/30 bg-background-secondary-default/30 p-2.5 text-caption-2-medium text-text-secondary">
              <RiHardDrive2Line className="size-3.5 text-emerald-500" />
              <span>Electron 主进程实时文件热更已挂载</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border-button-default/30 pt-3 text-caption-1-medium">
            <span className="text-caption-2-regular text-text-tertiary">
              {t("studio.assets.nativeFs")}
            </span>
            <button
              type="button"
              onClick={onOpenChat}
              className="inline-flex items-center gap-1 font-medium text-accent-600 hover:text-accent-500 transition-colors cursor-pointer"
            >
              <span>{t("studio.assets.openInChat")}</span>
              <RiArrowRightLine className="size-3.5" />
            </button>
          </div>
        </article>

        {/* 卡片 2: RAG 向量知识库 */}
        <article className="flex flex-col justify-between rounded-2xl border border-border-button-default/50 bg-background-primary-default p-5 shadow-2xs">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
                  <RiBookOpenLine className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-title-3-semibold text-text-primary">
                    {t("studio.assets.knowledgeTitle")}
                  </h3>
                  <span className="text-caption-2-regular text-text-tertiary">
                    {t("studio.assets.knowledgeDesc")}
                  </span>
                </div>
              </div>

              <span
                className={cx(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption-2-medium font-medium",
                  dash.isIndexing
                    ? "border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : dash.sources.length > 0
                      ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border border-border-button-default bg-background-secondary-default text-text-tertiary"
                )}
              >
                {dash.isIndexing ? (
                  <>
                    <RiLoader4Line className="size-3 animate-spin" />
                    <span>{t("studio.assets.indexing")}</span>
                  </>
                ) : dash.sources.length > 0 ? (
                  <span>{t("studio.assets.ready")}</span>
                ) : (
                  <span>{t("studio.assets.empty")}</span>
                )}
              </span>
            </div>

            {/* 数据分块详情 */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="rounded-xl border border-border-button-default/40 bg-background-secondary-default/30 p-3">
                <span className="text-caption-2-medium text-text-tertiary">{t("studio.assets.sources")}</span>
                <p className="mt-1 font-mono text-title-2-semibold text-text-primary">
                  {dash.sources.length}
                </p>
                <span className="text-[11px] text-text-tertiary">已绑定项目文档源</span>
              </div>
              <div className="rounded-xl border border-border-button-default/40 bg-background-secondary-default/30 p-3">
                <span className="text-caption-2-medium text-text-tertiary">{t("studio.assets.chunks")}</span>
                <p className="mt-1 font-mono text-title-2-semibold text-text-primary">
                  {dash.totalChunks}
                </p>
                <span className="text-[11px] text-text-tertiary">语义向量切片已入库</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end border-t border-border-button-default/30 pt-3 text-caption-1-medium">
            <button
              type="button"
              onClick={() => onNavigateTo("/knowledge")}
              className="inline-flex items-center gap-1 font-medium text-accent-600 hover:text-accent-500 transition-colors cursor-pointer"
            >
              <span>{t("studio.assets.manageKnowledge")}</span>
              <RiArrowRightLine className="size-3.5" />
            </button>
          </div>
        </article>
      </div>

      {/* 下半区：多模态媒体工作室与资产库 */}
      <article className="rounded-2xl border border-border-button-default/50 bg-background-primary-default p-5 shadow-2xs">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
                <RiImageLine className="size-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-title-3-semibold text-text-primary">
                  {t("studio.assets.mediaTitle")}
                </h3>
                <span className="text-caption-2-regular text-text-tertiary">
                  {t("studio.assets.mediaDesc")}
                </span>
              </div>
            </div>

            <span className="rounded-full bg-background-secondary-default px-2.5 py-1 text-caption-2-medium text-text-secondary font-mono">
              {dash.assets.length} 个资产
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="flex items-center gap-3 rounded-xl border border-border-button-default/40 bg-background-secondary-default/30 p-3.5">
              <RiImageLine className="size-5 text-sky-500" />
              <div>
                <span className="text-caption-2-regular text-text-tertiary">{t("studio.assets.images")}</span>
                <p className="font-mono text-body-medium font-semibold text-text-primary">
                  {dash.assets.filter((a) => a.kind === "image").length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border-button-default/40 bg-background-secondary-default/30 p-3.5">
              <RiFileMusicLine className="size-5 text-amber-500" />
              <div>
                <span className="text-caption-2-regular text-text-tertiary">{t("studio.assets.speech")}</span>
                <p className="font-mono text-body-medium font-semibold text-text-primary">
                  {dash.assets.filter((a) => a.kind === "audio").length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-border-button-default/40 bg-background-secondary-default/30 p-3.5">
              <RiFileVideoLine className="size-5 text-rose-500" />
              <div>
                <span className="text-caption-2-regular text-text-tertiary">{t("studio.assets.video")}</span>
                <p className="font-mono text-body-medium font-semibold text-text-primary">
                  {dash.assets.filter((a) => a.kind === "video").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border-button-default/30 pt-3 text-caption-1-medium">
          <span className="text-caption-2-regular text-text-tertiary">
            {t("studio.assets.exportHint")}
          </span>
          <button
            type="button"
            onClick={() => onNavigateTo("/media")}
            className="inline-flex items-center gap-1 font-medium text-accent-600 hover:text-accent-500 transition-colors cursor-pointer"
          >
            <span>{t("studio.assets.openMedia")}</span>
            <RiArrowRightLine className="size-3.5" />
          </button>
        </div>
      </article>
    </div>
  )
}
