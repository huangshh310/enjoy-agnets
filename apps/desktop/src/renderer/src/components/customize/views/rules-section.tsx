/**
 * Project Rules & Guidelines 规则管理视图：
 * 采用专业桌面 IDE 风格，管理全局、工作区契约与文件级上下文规则层级。
 */
import { useState } from "react"
import {
  RiBookOpenLine,
  RiCheckLine,
  RiClipboardLine,
  RiFlashlightLine
} from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { PROJECT_RULES } from "../constants/customize-presets"

export function RulesSection() {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  function handleCopyRule(id: string, text: string) {
    void navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 顶部标题与说明 */}
      <div className="flex flex-col gap-1 pb-2 border-b border-separator-border/70">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-title-3-semibold text-text-primary tracking-tight">
            Project Rules & Guidelines
          </h2>
          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
            AGENTS.md & MDC
          </span>
        </div>
        <p className="text-caption-2-medium text-text-tertiary">
          管理工作区编码规范、架构不变量与文件匹配规则，直接作用于 Agent 代码生成策略。
        </p>
      </div>

      {/* 规则注入优先级流水线 (Compact Resolution Cascade) */}
      <div className="flex flex-col gap-2 rounded-xl border border-separator-border/70 bg-background-secondary-default/30 p-3">
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-secondary">
          <RiFlashlightLine className="size-3 text-accent-500" />
          <span>规则注入优先级层级 (Resolution Cascade)：</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="flex flex-col gap-0.5 rounded-lg border border-separator-border/60 bg-background-primary-default p-2.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="font-semibold text-text-primary">1. Global</span>
              <span className="text-text-tertiary">设备级全局</span>
            </div>
            <div className="font-medium text-[11.5px] text-text-primary">Global Instructions</div>
            <div className="text-[10.5px] text-text-tertiary truncate">本地 SQLite 偏好设置</div>
          </div>

          <div className="flex flex-col gap-0.5 rounded-lg border border-accent-500/30 bg-accent-500/5 p-2.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="font-semibold text-accent-600 dark:text-accent-400">2. Workspace</span>
              <span className="text-accent-500">仓库主契约</span>
            </div>
            <div className="font-medium text-[11.5px] text-text-primary">AGENTS.md / CLAUDE.md</div>
            <div className="text-[10.5px] text-text-tertiary truncate">代码库根契约规范</div>
          </div>

          <div className="flex flex-col gap-0.5 rounded-lg border border-separator-border/60 bg-background-primary-default p-2.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="font-semibold text-text-primary">3. Contextual</span>
              <span className="text-text-tertiary">文件路径按需</span>
            </div>
            <div className="font-medium text-[11.5px] text-text-primary">.cursor/rules/*.mdc</div>
            <div className="text-[10.5px] text-text-tertiary truncate">Glob 匹配触发精准规则</div>
          </div>
        </div>
      </div>

      {/* 常用规范模版网格 */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-caption-1-medium font-semibold text-text-primary">
            <RiBookOpenLine className="size-3.5 text-accent-500" />
            <span>常用规范模版 (Popular Rule Templates)</span>
          </div>
          <span className="text-[10.5px] text-text-tertiary">
            一键复制 Markdown 写入你的仓库
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {PROJECT_RULES.map((rule) => (
            <div
              key={rule.id}
              className="flex flex-col justify-between rounded-xl border border-separator-border/70 bg-background-primary-default p-3.5 shadow-2xs transition-all hover:border-separator-border"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-caption-1-medium font-semibold text-text-primary">
                      {rule.title}
                    </h4>
                    <span className="text-[10px] font-mono text-text-tertiary">
                      目标: {rule.targetFile}
                    </span>
                  </div>

                  <span className="rounded bg-background-secondary-default px-1.5 py-0.5 text-[9.5px] font-mono text-text-secondary">
                    {rule.badge}
                  </span>
                </div>

                <p className="mt-2 text-[11.5px] text-text-secondary leading-relaxed">
                  {rule.description}
                </p>

                {/* 规则代码预览 */}
                <div className="mt-2.5 rounded-lg border border-separator-border/60 bg-background-secondary-default/50 p-2.5">
                  <pre className="font-mono text-[10.5px] text-text-secondary whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto">
                    {rule.content}
                  </pre>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-separator-border/40 pt-2 text-[11px]">
                <span className="text-text-tertiary font-mono text-[10px]">
                  Ready to copy
                </span>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyRule(rule.id, rule.content)}
                  className="gap-1 h-6.5 px-2 text-[11px] shrink-0"
                >
                  {copiedId === rule.id ? (
                    <>
                      <RiCheckLine className="size-3 text-emerald-500" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <RiClipboardLine className="size-3" />
                      <span>复制 Rule Markdown</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
