/**
 * Agent Studio View 4: 编排与监控 (Ops)
 * 彻底消除空白：增加工作流流水线泳道、系统规则挂载清单、4格遥测指标卡与追踪条。
 */
import {
  RiArrowRightLine,
  RiCheckDoubleLine,
  RiFileTextLine,
  RiPulseLine,
  RiSpeedLine
} from "@remixicon/react"
import { useT } from "@renderer/i18n"
import type { StudioCommonProps } from "../studio.types"

export function StudioOpsView({ dash, onNavigateTo }: StudioCommonProps) {
  const t = useT()

  return (
    <div className="flex flex-col gap-4">
      {/* 顶部双列卡片 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 卡片 1: 持久化工作流 */}
        <article className="flex flex-col justify-between rounded-2xl border border-border-button-default/50 bg-background-primary-default p-5 shadow-2xs">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <RiPulseLine className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-title-3-semibold text-text-primary">
                    {t("studio.orch.workflowsTitle")}
                  </h3>
                  <span className="text-caption-2-regular text-text-tertiary">
                    {dash.workflowRuns.length} 次运行历史
                  </span>
                </div>
              </div>

              {dash.runningWorkflows.length > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-caption-2-medium font-medium text-emerald-600 animate-pulse">
                  {dash.runningWorkflows.length} 运行中
                </span>
              ) : (
                <span className="rounded-full bg-background-secondary-default px-2.5 py-1 text-caption-2-medium text-text-tertiary">
                  引擎就绪
                </span>
              )}
            </div>

            <p className="text-body-regular text-text-secondary">
              {t("studio.orch.workflowsDesc")}
            </p>

            {/* 流水线阶段引导 */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="rounded-xl border border-border-button-default/30 bg-background-secondary-default/30 p-2.5 text-center">
                <span className="text-[11px] text-text-tertiary">阶段 1</span>
                <p className="font-mono text-caption-1-medium text-text-primary mt-0.5">Plan 规划</p>
              </div>
              <div className="rounded-xl border border-border-button-default/30 bg-background-secondary-default/30 p-2.5 text-center">
                <span className="text-[11px] text-text-tertiary">阶段 2</span>
                <p className="font-mono text-caption-1-medium text-text-primary mt-0.5">Act 编写</p>
              </div>
              <div className="rounded-xl border border-border-button-default/30 bg-background-secondary-default/30 p-2.5 text-center">
                <span className="text-[11px] text-text-tertiary">阶段 3</span>
                <p className="font-mono text-caption-1-medium text-text-primary mt-0.5">Verify 验证</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border-button-default/30 pt-3 text-caption-1-medium">
            <span className="text-caption-2-regular text-text-tertiary">
              支持检查点失败中断恢复
            </span>
            <button
              type="button"
              onClick={() => onNavigateTo("/workflows")}
              className="inline-flex items-center gap-1 font-medium text-accent-600 hover:text-accent-500 transition-colors cursor-pointer"
            >
              <span>{t("studio.orch.openWorkflows")}</span>
              <RiArrowRightLine className="size-3.5" />
            </button>
          </div>
        </article>

        {/* 卡片 2: 提示与人设定制 */}
        <article className="flex flex-col justify-between rounded-2xl border border-border-button-default/50 bg-background-primary-default p-5 shadow-2xs">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600 dark:text-accent-400">
                  <RiFileTextLine className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-title-3-semibold text-text-primary">
                    {t("studio.insights.customizeTitle")}
                  </h3>
                  <span className="text-caption-2-regular text-text-tertiary">
                    {t("studio.insights.rulesPersona")}
                  </span>
                </div>
              </div>

              <span className="rounded-full bg-accent-500/10 px-2.5 py-0.5 text-caption-2-medium font-medium text-accent-600 dark:text-accent-400">
                System Prompt
              </span>
            </div>

            <p className="text-body-regular text-text-secondary">
              {t("studio.insights.customizeDesc")}
            </p>

            <div className="flex flex-col gap-2 rounded-xl border border-border-button-default/40 bg-background-secondary-default/30 p-3 text-caption-2-medium">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">全局系统指令 (Instructions)</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">已挂载</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">项目规范 (AGENTS.md / Cursor Rules)</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono">自动热载</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end border-t border-border-button-default/30 pt-3 text-caption-1-medium">
            <button
              type="button"
              onClick={() => onNavigateTo("/customize/instructions")}
              className="inline-flex items-center gap-1 font-medium text-accent-600 hover:text-accent-500 transition-colors cursor-pointer"
            >
              <span>{t("studio.insights.customizeRules")}</span>
              <RiArrowRightLine className="size-3.5" />
            </button>
          </div>
        </article>
      </div>

      {/* 底部全宽卡片：可观测性与性能表现 */}
      <article className="rounded-2xl border border-border-button-default/50 bg-background-primary-default p-5 shadow-2xs">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <RiSpeedLine className="size-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-title-3-semibold text-text-primary">
                  {t("studio.insights.obsTitle")}
                </h3>
                <span className="text-caption-2-regular text-text-tertiary">
                  {t("studio.insights.obsDesc")}
                </span>
              </div>
            </div>

            <span className="rounded-full bg-background-secondary-default px-2.5 py-1 text-caption-2-medium text-text-secondary font-mono">
              {dash.metrics.length} 条调用追踪
            </span>
          </div>

          {/* 指标卡片 4 列均分 */}
          <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-4">
            <div className="rounded-xl border border-border-button-default/40 bg-background-secondary-default/30 p-3">
              <span className="text-caption-2-medium text-text-tertiary">最近请求延迟</span>
              <p className="mt-1 font-mono text-title-3-semibold text-text-primary">
                {dash.latestMetric ? `${dash.latestMetric.durationMs}ms` : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-border-button-default/40 bg-background-secondary-default/30 p-3">
              <span className="text-caption-2-medium text-text-tertiary">TTFO 首字耗时</span>
              <p className="mt-1 font-mono text-title-3-semibold text-text-primary">
                {dash.latestMetric?.ttfoMs ? `${dash.latestMetric.ttfoMs}ms` : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-border-button-default/40 bg-background-secondary-default/30 p-3">
              <span className="text-caption-2-medium text-text-tertiary">Token 吞吐速率</span>
              <p className="mt-1 font-mono text-title-3-semibold text-text-primary">
                {dash.latestMetric?.tokensPerSecond ? `${dash.latestMetric.tokensPerSecond} t/s` : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-border-button-default/40 bg-background-secondary-default/30 p-3">
              <span className="text-caption-2-medium text-text-tertiary">OTEL 隐私保护</span>
              <p className="mt-1 font-mono text-caption-1-medium text-emerald-600 dark:text-emerald-400">
                脱敏本地存储
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border-button-default/30 pt-3 text-caption-1-medium">
          <span className="inline-flex items-center gap-1 text-caption-2-regular text-text-tertiary">
            <RiCheckDoubleLine className="size-3.5 text-emerald-500" />
            所有执行数据严格保留在本机 SQLite，绝不静默上传云端。
          </span>
          <button
            type="button"
            onClick={() => onNavigateTo("/observability")}
            className="inline-flex items-center gap-1 font-medium text-accent-600 hover:text-accent-500 transition-colors cursor-pointer"
          >
            <span>{t("studio.insights.viewMetrics")}</span>
            <RiArrowRightLine className="size-3.5" />
          </button>
        </div>
      </article>
    </div>
  )
}
