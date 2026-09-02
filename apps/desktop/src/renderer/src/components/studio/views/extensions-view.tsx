/**
 * Agent Studio View 3: 工具与扩展 (Extensions)
 * 彻底消除空白：增加 MCP 推荐生态预设池、自动化规则模板与沙箱安全架构面板。
 */
import {
  RiArrowRightLine,
  RiCompass3Line,
  RiDatabase2Line,
  RiFlashlightLine,
  RiGlobalLine,
  RiHardDriveLine,
  RiPlugLine,
  RiShieldCheckLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useT } from "@renderer/i18n"
import type { StudioCommonProps } from "../studio.types"

const FEATURED_MCP_PRESETS = [
  { id: "fs", name: "Filesystem MCP", desc: "本地工程文件受限读写", icon: RiHardDriveLine, ready: true },
  { id: "pg", name: "PostgreSQL MCP", desc: "只读数据库模式自省与查询", icon: RiDatabase2Line, ready: false },
  { id: "web", name: "Brave Search", desc: "实时联网搜索与引用补全", icon: RiGlobalLine, ready: false }
]

export function StudioExtensionsView({ dash, onNavigateTo }: StudioCommonProps) {
  const t = useT()

  return (
    <div className="flex flex-col gap-4">
      {/* 核心双列卡片 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 模块 1: MCP 插件中心 */}
        <article className="flex flex-col justify-between rounded-2xl border border-border-button-default/50 bg-background-primary-default p-5 shadow-2xs">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                  <RiPlugLine className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-title-3-semibold text-text-primary">
                    {t("studio.orch.mcpTitle")}
                  </h3>
                  <span className="text-caption-2-regular text-text-tertiary">
                    {dash.connectedServers.length}/{dash.mcpServers.length} 已连接
                  </span>
                </div>
              </div>

              <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-caption-2-medium text-violet-600 dark:text-violet-400 font-mono">
                {dash.totalMcpTools} 个工具
              </span>
            </div>

            <p className="text-body-regular text-text-secondary">
              {t("studio.orch.mcpDesc")}
            </p>

            {/* 服务器列表或推荐生态 */}
            {dash.mcpServers.length > 0 ? (
              <div className="flex flex-col gap-2 pt-1">
                {dash.mcpServers.slice(0, 4).map((server) => (
                  <div
                    key={server.id}
                    className="flex items-center justify-between rounded-xl border border-border-button-default/40 bg-background-secondary-default/30 px-3 py-2 text-caption-1-medium"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cx(
                          "size-2 rounded-full",
                          server.connected ? "bg-emerald-500 animate-pulse" : "bg-text-tertiary"
                        )}
                      />
                      <span className="font-medium text-text-primary">{server.name}</span>
                    </div>
                    <span className="font-mono text-caption-2-regular text-text-tertiary">
                      {server.tools?.length ?? 0} 个工具
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center gap-1.5 text-caption-2-medium text-text-tertiary">
                  <RiCompass3Line className="size-3.5" />
                  <span>推荐安装的常用 MCP 协议扩展：</span>
                </div>
                <div className="grid gap-2">
                  {FEATURED_MCP_PRESETS.map((preset) => {
                    const Icon = preset.icon
                    return (
                      <div
                        key={preset.id}
                        className="flex items-center justify-between rounded-xl border border-border-button-default/30 bg-background-secondary-default/30 px-3 py-2"
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="size-4 text-text-secondary" />
                          <div>
                            <span className="text-caption-1-medium text-text-primary">{preset.name}</span>
                            <span className="block text-[11px] text-text-tertiary">{preset.desc}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onNavigateTo("/mcp")}
                          className="rounded-lg border border-border-button-default px-2 py-1 text-[11px] font-medium text-text-secondary hover:bg-background-primary-default transition-colors cursor-pointer"
                        >
                          配置接入
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border-button-default/30 pt-3 text-caption-1-medium">
            <span className="inline-flex items-center gap-1 text-[11px] text-text-tertiary">
              <RiShieldCheckLine className="size-3.5 text-emerald-500" />
              <span>{t("studio.orch.mcpFooter")}</span>
            </span>
            <button
              type="button"
              onClick={() => onNavigateTo("/mcp")}
              className="inline-flex items-center gap-1 font-medium text-accent-600 hover:text-accent-500 transition-colors cursor-pointer"
            >
              <span>{t("studio.orch.manageMcp")}</span>
              <RiArrowRightLine className="size-3.5" />
            </button>
          </div>
        </article>

        {/* 模块 2: 自动化与触发规则 */}
        <article className="flex flex-col justify-between rounded-2xl border border-border-button-default/50 bg-background-primary-default p-5 shadow-2xs">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <RiFlashlightLine className="size-4" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-title-3-semibold text-text-primary">
                    {t("studio.orch.autoTitle")}
                  </h3>
                  <span className="text-caption-2-regular text-text-tertiary">
                    {dash.automations.length} 条已配置规则
                  </span>
                </div>
              </div>

              <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-caption-2-medium text-sky-600 dark:text-sky-400 font-mono">
                自动化引擎就绪
              </span>
            </div>

            <p className="text-body-regular text-text-secondary">
              {t("studio.orch.autoDesc")}
            </p>

            {/* 规则预览或推荐模版 */}
            {dash.automations.length > 0 ? (
              <div className="flex flex-col gap-2 pt-1">
                {dash.automations.slice(0, 4).map((auto) => (
                  <div
                    key={auto.id}
                    className="flex items-center justify-between rounded-xl border border-border-button-default/40 bg-background-secondary-default/30 px-3 py-2 text-caption-1-medium"
                  >
                    <span className="font-medium text-text-primary truncate max-w-[200px]">
                      {auto.name}
                    </span>
                    <span className="rounded bg-background-primary-default px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary">
                      {auto.trigger === "on_save" ? "保存时触发" : "手动执行"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center gap-1.5 text-caption-2-medium text-text-tertiary">
                  <span>常用自动化开发者模版：</span>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between rounded-xl border border-border-button-default/30 bg-background-secondary-default/30 px-3 py-2">
                    <div>
                      <span className="text-caption-1-medium text-text-primary">保存时自动代码质量审计</span>
                      <span className="block text-[11px] text-text-tertiary">检查 TypeScript 严格类型与单文件行数</span>
                    </div>
                    <span className="rounded bg-background-primary-default px-2 py-0.5 text-[10px] font-mono text-sky-600">On Save</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-border-button-default/30 bg-background-secondary-default/30 px-3 py-2">
                    <div>
                      <span className="text-caption-1-medium text-text-primary">Conventional Commit 提交说明生成</span>
                      <span className="block text-[11px] text-text-tertiary">根据 Git Working Tree 变更生成标头</span>
                    </div>
                    <span className="rounded bg-background-primary-default px-2 py-0.5 text-[10px] font-mono text-text-tertiary">Manual</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border-button-default/30 pt-3 text-caption-1-medium">
            <span className="text-caption-2-regular text-text-tertiary">
              支持代码审计与预提交检查
            </span>
            <button
              type="button"
              onClick={() => onNavigateTo("/automations")}
              className="inline-flex items-center gap-1 font-medium text-accent-600 hover:text-accent-500 transition-colors cursor-pointer"
            >
              <span>{t("studio.orch.configureAuto")}</span>
              <RiArrowRightLine className="size-3.5" />
            </button>
          </div>
        </article>
      </div>

      {/* 底部：安全与沙箱架构说明横幅 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border-button-default/40 bg-background-secondary-default/30 p-4">
        <div className="flex items-center gap-2.5">
          <RiShieldCheckLine className="size-5 text-emerald-500" />
          <span className="text-caption-1-medium text-text-secondary">
            沙箱隔离架构：MCP 进程锁在 Electron 主进程中执行，UI 扩展运行在零特权 iframe，保证工程安全。
          </span>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTo("/mcp")}
          className="text-caption-1-medium text-accent-600 hover:text-accent-500 transition-colors cursor-pointer"
        >
          查看权限明细 →
        </button>
      </div>
    </div>
  )
}
