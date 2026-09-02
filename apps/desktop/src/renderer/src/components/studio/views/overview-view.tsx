/**
 * Agent Studio View 1: 核心大盘 (Overview)
 * 采用 2:1 驾驶舱非对称架构，左侧承载核心底座，右侧承载行动舱与生命体征。
 */
import {
  RiArrowRightLine,
  RiBookOpenLine,
  RiCheckLine,
  RiClipboardLine,
  RiDatabase2Line,
  RiFlashlightLine,
  RiFolder6Line,
  RiImageLine,
  RiMessage3Line,
  RiPlugLine,
  RiPulseLine,
  RiShieldCheckLine,
  RiSpeedLine
} from "@remixicon/react"
import { useT } from "@renderer/i18n"
import type { StudioCommonProps } from "../studio.types"

export function StudioOverviewView({
  workspaceRootLabel,
  copiedPath,
  onCopyPath,
  onOpenChat,
  dash,
  onNavigateTo
}: StudioCommonProps) {
  const t = useT()

  return (
    <div className="grid gap-4.5 lg:grid-cols-3">
      {/* 左侧 2 列：Agent 生产力核心底座 */}
      <div className="flex flex-col gap-4 lg:col-span-2">
        {/* 卡片 1: 工作区与上下文基础设施 */}
        <article className="rounded-2xl border border-border-button-default/50 bg-background-primary-default p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
                <RiFolder6Line className="size-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-title-3-semibold text-text-primary">
                  {t("studio.assets.title")}
                </h3>
                <span className="text-caption-2-regular text-text-tertiary">
                  {t("studio.assets.nativeFs")}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenChat}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border-button-default bg-background-secondary-default/50 px-3 py-1.5 text-caption-1-medium text-text-primary hover:bg-background-secondary-default transition-colors cursor-pointer"
            >
              <RiMessage3Line className="size-3.5 text-accent-500" />
              <span>{t("studio.assets.openInChat")}</span>
            </button>
          </div>

          <p className="mt-3 text-body-regular text-text-secondary">
            {t("studio.assets.workspaceDesc")}
          </p>

          {/* 路径与快捷复制条 */}
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-border-button-default/40 bg-background-secondary-default/40 px-3.5 py-2 font-mono text-caption-1-medium text-text-secondary">
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

          {/* 三格指标分栏 */}
          <div className="mt-3.5 grid grid-cols-3 gap-2.5">
            <MetricBlock
              icon={RiBookOpenLine}
              label={t("studio.assets.sources")}
              value={dash.sources.length}
              unit="个来源"
              onClick={() => onNavigateTo("/knowledge")}
            />
            <MetricBlock
              icon={RiDatabase2Line}
              label={t("studio.assets.chunks")}
              value={dash.totalChunks}
              unit="个分块"
              onClick={() => onNavigateTo("/knowledge")}
            />
            <MetricBlock
              icon={RiImageLine}
              label={t("studio.assets.images")}
              value={dash.assets.length}
              unit="个资产"
              onClick={() => onNavigateTo("/media")}
            />
          </div>
        </article>

        {/* 卡片 2: MCP 扩展与自动化双栏 */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* MCP 状态 */}
          <article className="flex flex-col justify-between rounded-2xl border border-border-button-default/50 bg-background-primary-default p-4.5 shadow-2xs">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RiPlugLine className="size-4.5 text-violet-500" />
                  <h4 className="text-body-medium font-semibold text-text-primary">
                    {t("studio.orch.mcpTitle")}
                  </h4>
                </div>
                <span className="font-mono text-caption-2-medium text-violet-600 dark:text-violet-400">
                  {dash.connectedServers.length}/{dash.mcpServers.length}
                </span>
              </div>
              <p className="text-caption-1-regular text-text-secondary line-clamp-2">
                {t("studio.orch.mcpDesc")}
              </p>
              <div className="rounded-xl border border-border-button-default/30 bg-background-secondary-default/30 p-2.5 text-caption-2-medium text-text-secondary">
                <span>总计挂载工具：</span>
                <span className="font-mono font-semibold text-text-primary">{dash.totalMcpTools} 个</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-border-button-default/30 pt-2.5 text-caption-1-medium">
              <span className="inline-flex items-center gap-1 text-[11px] text-text-tertiary">
                <RiShieldCheckLine className="size-3 text-emerald-500" />
                沙箱隔离
              </span>
              <button
                type="button"
                onClick={() => onNavigateTo("/mcp")}
                className="inline-flex items-center gap-0.5 text-accent-600 hover:text-accent-500 transition-colors cursor-pointer"
              >
                <span>管理</span>
                <RiArrowRightLine className="size-3.5" />
              </button>
            </div>
          </article>

          {/* 自动化状态 */}
          <article className="flex flex-col justify-between rounded-2xl border border-border-button-default/50 bg-background-primary-default p-4.5 shadow-2xs">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RiFlashlightLine className="size-4.5 text-sky-500" />
                  <h4 className="text-body-medium font-semibold text-text-primary">
                    {t("studio.orch.autoTitle")}
                  </h4>
                </div>
                <span className="font-mono text-caption-2-medium text-sky-600 dark:text-sky-400">
                  {dash.automations.length} 条规则
                </span>
              </div>
              <p className="text-caption-1-regular text-text-secondary line-clamp-2">
                {t("studio.orch.autoDesc")}
              </p>
              <div className="flex items-center gap-2 rounded-xl border border-border-button-default/30 bg-background-secondary-default/30 p-2.5 text-caption-2-medium text-text-secondary">
                <span>⚡ 保存时挂钩</span>
                <span className="text-text-tertiary">·</span>
                <span>手动指令库</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end border-t border-border-button-default/30 pt-2.5 text-caption-1-medium">
              <button
                type="button"
                onClick={() => onNavigateTo("/automations")}
                className="inline-flex items-center gap-0.5 text-accent-600 hover:text-accent-500 transition-colors cursor-pointer"
              >
                <span>配置</span>
                <RiArrowRightLine className="size-3.5" />
              </button>
            </div>
          </article>
        </div>
      </div>

      {/* 右侧 1 列：Action Deck（行动指令舱与生命体征） */}
      <div className="flex flex-col gap-4">
        {/* 卡片 3: 工作流调度与流水线 */}
        <article className="flex flex-col justify-between rounded-2xl border border-border-button-default/50 bg-background-primary-default p-5 shadow-2xs">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiPulseLine className="size-4.5 text-amber-500" />
                <h4 className="text-body-medium font-semibold text-text-primary">
                  {t("studio.orch.workflowsTitle")}
                </h4>
              </div>
              {dash.runningWorkflows.length > 0 ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 animate-pulse">
                  运行中
                </span>
              ) : (
                <span className="text-caption-2-regular text-text-tertiary">
                  {dash.workflowRuns.length} 次运行
                </span>
              )}
            </div>

            <p className="text-caption-1-regular text-text-secondary">
              {t("studio.orch.workflowsDesc")}
            </p>

            <div className="flex flex-col gap-1.5 rounded-xl border border-border-button-default/30 bg-background-secondary-default/30 p-3 text-caption-2-medium text-text-secondary">
              <div className="flex items-center justify-between font-mono">
                <span>1. Plan 规划</span>
                <span className="text-text-tertiary">完成</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span>2. Act 编码执行</span>
                <span className="text-text-tertiary">验证通过</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span>3. Verify 自动化验证</span>
                <span className="text-text-tertiary">就绪</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end border-t border-border-button-default/30 pt-3 text-caption-1-medium">
            <button
              type="button"
              onClick={() => onNavigateTo("/workflows")}
              className="inline-flex items-center gap-0.5 text-accent-600 hover:text-accent-500 transition-colors cursor-pointer"
            >
              <span>流水线详情</span>
              <RiArrowRightLine className="size-3.5" />
            </button>
          </div>
        </article>

        {/* 卡片 4: 遥测与性能雷达 */}
        <article className="flex flex-col justify-between rounded-2xl border border-border-button-default/50 bg-background-primary-default p-5 shadow-2xs">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RiSpeedLine className="size-4.5 text-emerald-500" />
                <h4 className="text-body-medium font-semibold text-text-primary">
                  {t("studio.insights.obsTitle")}
                </h4>
              </div>
              <span className="text-caption-2-regular text-text-tertiary">
                {dash.metrics.length} 条记录
              </span>
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-border-button-default/30 bg-background-secondary-default/30 p-3">
              <div className="flex items-center justify-between text-caption-1-medium">
                <span className="text-text-secondary">最近请求延迟</span>
                <span className="font-mono font-semibold text-text-primary">
                  {dash.latestMetric ? `${dash.latestMetric.durationMs}ms` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-caption-1-medium">
                <span className="text-text-secondary">TTFO 首字耗时</span>
                <span className="font-mono text-text-primary">
                  {dash.latestMetric?.ttfoMs ? `${dash.latestMetric.ttfoMs}ms` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-caption-1-medium">
                <span className="text-text-secondary">Token 吞吐速率</span>
                <span className="font-mono text-text-primary">
                  {dash.latestMetric?.tokensPerSecond ? `${dash.latestMetric.tokensPerSecond} t/s` : "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end border-t border-border-button-default/30 pt-3 text-caption-1-medium">
            <button
              type="button"
              onClick={() => onNavigateTo("/observability")}
              className="inline-flex items-center gap-0.5 text-accent-600 hover:text-accent-500 transition-colors cursor-pointer"
            >
              <span>查看追踪与指标</span>
              <RiArrowRightLine className="size-3.5" />
            </button>
          </div>
        </article>
      </div>
    </div>
  )
}

function MetricBlock({
  icon: Icon,
  label,
  value,
  unit,
  onClick
}: {
  icon: typeof RiFolder6Line
  label: string
  value: number
  unit: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start rounded-xl border border-border-button-default/40 bg-background-secondary-default/30 p-3 transition-colors hover:bg-background-secondary-default/60 cursor-pointer text-left"
    >
      <div className="flex items-center gap-1.5 text-caption-2-medium text-text-tertiary">
        <Icon className="size-3.5" />
        <span>{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-1 font-mono text-title-3-semibold text-text-primary">
        {value}
        <span className="text-caption-2-regular text-text-tertiary">{unit}</span>
      </div>
    </button>
  )
}
