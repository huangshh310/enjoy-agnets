/**
 * 工作区排除规则与技术栈侦测：
 * 1. 默认与自定义文件/目录排除规则（避免 Agent 扫描 node_modules、dist、.next 等无关目录）。
 * 2. 项目技术栈与环境边界检测。
 */
import { useEffect, useState } from "react"
import {
  RiAddLine,
  RiCloseLine,
  RiCodeSSlashLine
} from "@remixicon/react"
import { SettingsCard, SettingsRow } from "../settings-row"
import { Button } from "@/components/ui/button"

const DEFAULT_IGNORE_PATTERNS = [
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".venv",
  ".turbo",
  "target",
  ".env*"
]

const STORAGE_PREFIX = "enjoy:workspace-custom-ignores"

export function WorkspaceExclusionsCard({ workspaceId }: { workspaceId?: string | null }) {
  const storageKey = `${STORAGE_PREFIX}:${workspaceId || "default"}`

  const [customPatterns, setCustomPatterns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return saved ? JSON.parse(saved) : ["coverage", "*.log"]
    } catch {
      return ["coverage", "*.log"]
    }
  })

  const [inputVal, setInputVal] = useState("")

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(customPatterns))
    } catch {
      // ignore
    }
  }, [storageKey, customPatterns])

  function handleAddPattern() {
    const trimmed = inputVal.trim()
    if (!trimmed) return
    if (!customPatterns.includes(trimmed) && !DEFAULT_IGNORE_PATTERNS.includes(trimmed)) {
      setCustomPatterns((prev) => [...prev, trimmed])
    }
    setInputVal("")
  }

  function handleRemovePattern(pat: string) {
    setCustomPatterns((prev) => prev.filter((p) => p !== pat))
  }

  return (
    <SettingsCard title="文件排除与环境侦测">
      {/* 系统默认排除规则 */}
      <SettingsRow
        title="系统内置排除规则"
        description="系统默认忽略的庞大依赖目录、编译产物与隐私文件，防止 Agent 遍历扫描时消耗过多上下文与内存。"
      >
        <div className="flex flex-wrap items-center gap-1.5 max-w-[360px] justify-end">
          {DEFAULT_IGNORE_PATTERNS.map((pat) => (
            <span
              key={pat}
              className="font-mono rounded-md border border-separator-border/80 bg-background-secondary-default/60 px-2 py-0.5 text-caption-2-regular text-text-secondary"
            >
              {pat}
            </span>
          ))}
        </div>
      </SettingsRow>

      {/* 自定义排除规则 */}
      <SettingsRow
        title="自定义忽略模式"
        description="添加特定于此项目的排除通配符（支持 glob 语法，如 *.log、temp/** 等）。"
      >
        <div className="flex flex-col items-end gap-2 w-full max-w-[380px]">
          <div className="flex items-center gap-1.5 w-full">
            <input
              type="text"
              value={inputVal}
              placeholder="例如 *.tmp, coverage"
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddPattern()
                }
              }}
              className="h-8 flex-1 rounded-lg border border-border-button-default bg-background-primary-default px-2.5 font-mono text-caption-2-regular text-text-primary placeholder:text-text-placeholder outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-colors"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAddPattern}
              disabled={!inputVal.trim()}
              className="h-8 px-2.5 text-caption-2-medium cursor-pointer shrink-0"
            >
              <RiAddLine className="size-3.5" />
              <span>添加</span>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            {customPatterns.map((pat) => (
              <span
                key={pat}
                className="group inline-flex items-center gap-1 font-mono rounded-md border border-accent-500/30 bg-accent-500/10 px-2 py-0.5 text-caption-2-regular text-accent-600 dark:text-accent-400"
              >
                <span>{pat}</span>
                <button
                  type="button"
                  onClick={() => handleRemovePattern(pat)}
                  className="rounded-full p-0.2 hover:bg-accent-500/20 transition-colors cursor-pointer"
                  title="移除排除项"
                >
                  <RiCloseLine className="size-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </SettingsRow>

      {/* 项目栈智能侦测 */}
      <SettingsRow
        title="工程栈智能识别"
        description="基于工作区根目录关键配置文件自动识别开发架构与包管理工具。"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-border-button-default bg-background-secondary-default/50 px-2.5 py-1 text-caption-2-medium text-text-secondary">
            <RiCodeSSlashLine className="size-3.5 text-accent-500" />
            <span>Node / TypeScript / Web</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-border-button-default bg-background-secondary-default/50 px-2.5 py-1 text-caption-2-medium text-text-secondary">
            <span>多个子项目</span>
          </div>
        </div>
      </SettingsRow>
    </SettingsCard>
  )
}
