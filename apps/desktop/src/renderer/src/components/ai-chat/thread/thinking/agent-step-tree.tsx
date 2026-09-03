/**
 * Agent Step Tree / Research Trail 组件
 * 融合思考过程 (Reasoning) 与工具调用 (Tools) 在统一树形导轨中。
 * 1. 思考节点：工具存在时默认折叠为单行，展开呈现实体微卡片与复制操作；
 * 2. 工具节点：支持完整命令查看（不截断）、一键复制、终端执行输出/报错回显与状态码。
 */
import { useState } from "react"
import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiBrainLine,
  RiCheckLine,
  RiClipboardLine,
  RiCloseLine,
  RiCpuLine,
  RiEditLine,
  RiFileLine,
  RiGlobalLine,
  RiLoader4Line,
  RiSearchLine,
  RiSparklingLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import { cx } from "@/utils/cx"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { openBrowserUrl } from "@renderer/components/ai-chat/right-pane/open-pane"
import type { AgentStepKind, AgentStepNode } from "./agent-step-tree.types"
import { useT } from "@renderer/i18n"

interface AgentStepTreeProps {
  nodes: AgentStepNode[]
  className?: string
}

function StepGlyph({ kind }: { kind: AgentStepKind }) {
  const cls = "size-3.5 shrink-0 text-text-tertiary"
  if (kind === "thinking") return <RiBrainLine className="size-3.5 shrink-0 text-accent-500" />
  if (kind === "search") return <RiSearchLine className={cls} />
  if (kind === "reading") return <RiGlobalLine className={cls} />
  if (kind === "command") return <RiTerminalBoxLine className={cls} />
  if (kind === "editing") return <RiEditLine className={cls} />
  if (kind === "analysis") return <RiCpuLine className={cls} />
  return <RiSparklingLine className="size-3.5 shrink-0 text-accent-500" />
}

export function AgentStepTree({ nodes, className }: AgentStepTreeProps) {
  if (nodes.length === 0) return null
  const hasTools = nodes.some((n) => n.kind !== "thinking")

  return (
    <div className={cx("relative flex flex-col gap-2.5 py-1 pl-1 select-none", className)}>
      {nodes.map((node, index) => {
        const isLast = index === nodes.length - 1
        return (
          <div key={node.id} className="relative flex items-start gap-2.5">
            {/* 纵向树形连接导轨 (Curved Tree Guide Line) */}
            {!isLast ? (
              <span
                className="absolute left-1.75 top-5 bottom-[-10px] w-px bg-border-button-default/70"
                aria-hidden
              />
            ) : null}

            {/* 节点图标 */}
            <div className="relative z-10 flex size-4 items-center justify-center rounded-full bg-background-primary-default mt-0.5">
              <StepGlyph kind={node.kind} />
            </div>

            {/* 节点主体内容 */}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              {node.kind === "thinking" && node.rawText ? (
                /* 思考过程节点：有工具时默认折叠 */
                <ThinkingNodeBranch
                  title={node.title}
                  rawText={node.rawText}
                  defaultOpen={!hasTools}
                />
              ) : node.isBatch && node.batchItems ? (
                /* 批量文件修改聚合节点 */
                <BatchEditingGroupRow node={node} />
              ) : (
                /* 工具或普通执行节点（支持展开完整命令与输出） */
                <ToolStepNodeRow node={node} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
/** 批量文件修改聚合行：支持一键展开折叠多文件树形分支 */
function BatchEditingGroupRow({ node }: { node: AgentStepNode }) {
  const [open, setOpen] = useState(() => node.status === "running")
  const items = node.batchItems ?? []

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-caption-1-medium group w-fit cursor-pointer select-none"
      >
        <span className="font-semibold text-text-primary group-hover:text-accent-500 transition-colors">
          {node.title}
        </span>

        {/* 增减行总计 */}
        {node.additions != null || node.deletions != null ? (
          <span className="font-mono text-caption-2-regular tabular-nums">
            {node.additions != null ? <span className="text-state-success-text">+{node.additions}</span> : null}
            {node.deletions != null ? <span className="text-text-error-primary">-{node.deletions}</span> : null}
          </span>
        ) : null}

        {/* 状态徽标 */}
        {node.status === "completed" ? (
          <span className="flex size-3.5 items-center justify-center rounded-full bg-state-success-text/15 text-state-success-text" title="Completed">
            <RiCheckLine className="size-2.5" />
          </span>
        ) : node.status === "running" ? (
          <RiLoader4Line className="size-3 animate-spin text-accent-500" />
        ) : null}

        {/* 展开/收起箭头 */}
        <span className="text-text-tertiary group-hover:text-text-primary transition-colors">
          {open ? <RiArrowDownSLine className="size-3.5" /> : <RiArrowRightSLine className="size-3.5" />}
        </span>
      </div>

      {/* 展开的批量文件树状列表 */}
      {open ? (
        <div className="mt-0.5 ml-1 pl-2.5 border-l border-border-button-default/70 flex flex-col gap-1.5 animate-in fade-in-50 duration-150 py-0.5">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => void openChangedFile(item.path)}
              className="flex items-center gap-2 py-0.5 text-caption-2-medium group/file cursor-pointer font-mono"
            >
              <RiFileLine className="size-3 text-text-tertiary group-hover/file:text-accent-500 transition-colors shrink-0" />
              {item.fileDir ? (
                <span className="text-text-tertiary truncate max-w-[160px]">
                  {item.fileDir}
                </span>
              ) : null}
              <span className="font-semibold text-text-primary group-hover/file:text-accent-500 transition-colors">
                {item.fileName}
              </span>
              {item.additions != null || item.deletions != null ? (
                <span className="tabular-nums ml-auto text-[11px] pr-1">
                  {item.additions != null ? <span className="text-state-success-text">+{item.additions}</span> : null}
                  {item.deletions != null ? <span className="text-text-error-primary ml-1">-{item.deletions}</span> : null}
                </span>
              ) : null}
              {item.status === "completed" ? (
                <RiCheckLine className="size-3 text-state-success-text shrink-0" />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}


/** 单个工具步骤节点组件（支持展开完整命令与输出回显） */
function ToolStepNodeRow({ node }: { node: AgentStepNode }) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const hasDetailContent = Boolean(node.command || node.output || node.errorText)

  function handleCopyCommand(e: React.MouseEvent) {
    e.stopPropagation()
    const textToCopy = node.command || node.detail || ""
    if (!textToCopy) return
    void navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* 步骤标题行 */}
      <div
        onClick={() => hasDetailContent && setExpanded(!expanded)}
        className={cx(
          "flex items-center gap-2 text-caption-1-medium group w-fit",
          hasDetailContent && "cursor-pointer"
        )}
      >
        {node.kind === "editing" && node.fileName ? (
          <div className="flex items-center gap-1.5 font-mono text-[12px]">
            {node.actionVerb ? (
              <span className="rounded px-1 py-0.2 text-[10.5px] font-semibold bg-background-secondary-default border border-border-button-default/50 text-text-tertiary shrink-0">
                {node.actionVerb}
              </span>
            ) : null}
            {node.fileDir ? (
              <span className="text-text-tertiary truncate max-w-[160px]">{node.fileDir}</span>
            ) : null}
            <span className="font-semibold text-text-primary group-hover:text-accent-500 transition-colors">
              {node.fileName}
            </span>
          </div>
        ) : (
          <span className="font-semibold text-text-primary group-hover:text-accent-500 transition-colors">
            {node.title}
          </span>
        )}

        {/* 状态徽标：运行中/完成/错误 */}
        {node.status === "running" ? (
          <RiLoader4Line className="size-3 animate-spin text-accent-500" />
        ) : null}
        {node.status === "completed" ? (
          <span className="flex size-3.5 items-center justify-center rounded-full bg-state-success-text/15 text-state-success-text" title="Completed">
            <RiCheckLine className="size-2.5" />
          </span>
        ) : null}
        {node.status === "error" ? (
          <span className="inline-flex items-center gap-0.5 text-caption-2-medium text-text-error-primary font-medium">
            <RiCloseLine className="size-3.5" />
            <span>{t("chat.failed")}</span>
          </span>
        ) : null}
        {/* 代码行增减指示 */}
        {node.additions != null || node.deletions != null ? (
          <span className="font-mono text-caption-2-regular tabular-nums">
            {node.additions != null ? <span className="text-state-success-text">+{node.additions}</span> : null}
            {node.deletions != null ? <span className="text-text-error-primary">-{node.deletions}</span> : null}
          </span>
        ) : null}

        {/* 展开/收起详情箭头 */}
        {hasDetailContent ? (
          <span className="text-text-tertiary group-hover:text-text-primary transition-colors">
            {expanded ? <RiArrowDownSLine className="size-3.5" /> : <RiArrowRightSLine className="size-3.5" />}
          </span>
        ) : null}
      </div>

      {/* 未展开时的单行命令概要 (简短，非编辑类才展示) */}
      {!expanded && node.detail && node.kind !== "editing" ? (
        <p className="font-mono text-caption-2-regular text-text-tertiary truncate max-w-xl pl-0.5">
          {node.detail}
        </p>
      ) : null}

      {/* 展开态：完整命令与终端输出详情卡片 (Full Command & Terminal Trace) */}
      {expanded && hasDetailContent ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border-button-default/70 bg-background-secondary-default/60 p-3 shadow-2xs animate-in fade-in-50 duration-150">
          {/* 1. 完整命令 (Full Command) */}
          {node.command ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-caption-2-medium text-text-tertiary">
                <span className="font-semibold text-text-secondary">{t("chat.fullCommand")}</span>
                <button
                  type="button"
                  onClick={handleCopyCommand}
                  className="inline-flex items-center gap-1 hover:text-text-primary transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <RiCheckLine className="size-3 text-emerald-500" />
                      <span className="text-emerald-500">{t("common.copied")}</span>
                    </>
                  ) : (
                    <>
                      <RiClipboardLine className="size-3" />
                      <span>{t("chat.copyCommand")}</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg border border-border-button-default/60 bg-background-primary-default p-2.5 font-mono text-[12px] text-text-primary whitespace-pre-wrap break-all select-text">
                <code>{node.command}</code>
              </pre>
            </div>
          ) : null}

          {/* 2. 执行输出或错误信息 (Output / Stderr Trace) */}
          {node.output || node.errorText ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-caption-2-medium">
                <span className="font-semibold text-text-secondary">{t("chat.terminalOutput")}</span>
                {node.exitCode !== undefined ? (
                  <span
                    className={cx(
                      "font-mono text-[10px] px-1.5 py-0.2 rounded font-semibold",
                      node.exitCode === 0
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {t("chat.exitCode", { code: node.exitCode })}
                  </span>
                ) : null}
              </div>
              <pre className="max-h-48 overflow-auto rounded-lg border border-neutral-800/80 bg-neutral-950 p-2.5 font-mono text-[11px] text-neutral-200 whitespace-pre-wrap break-all select-text">
                <code>{node.output || node.errorText}</code>
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 域名微标列表 (Domain Pills) */}
      {node.domainPills && node.domainPills.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {node.domainPills.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                openBrowserUrl(pill.url || `https://${pill.label}`)
              }}
              title={t("chat.visitSite", { url: pill.url || pill.label })}
              className="inline-flex items-center gap-1 rounded-md border border-border-button-default/80 bg-background-secondary-default/90 px-2 py-0.5 font-mono text-[11px] font-medium text-text-secondary hover:text-accent-500 hover:border-accent-500/40 transition-colors shadow-2xs cursor-pointer"
            >
              <RiGlobalLine className="size-3 text-text-tertiary" />
              <span>{pill.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {/* 可折叠子页面/文件清单 (Explored Pages Branch) */}
      {node.exploredPages && node.exploredPages.length > 0 ? (
        <ExploredPagesBranch
          title={node.exploredTitle ?? t("chat.exploredPages", { count: node.exploredPages.length })}
          pages={node.exploredPages}
        />
      ) : null}
    </div>
  )
}

/** 思考过程折叠分支组件（支持卡片化排版与一键复制） */
function ThinkingNodeBranch({
  title,
  rawText,
  defaultOpen = true
}: {
  title: string
  rawText: string
  defaultOpen?: boolean
}) {
  const t = useT()
  const [open, setOpen] = useState(defaultOpen)
  const [copied, setCopied] = useState(false)

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation()
    void navigator.clipboard.writeText(rawText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      {/* 标题触发栏：标题 + 字数 + 右侧静默复制按钮 */}
      <div className="flex items-center justify-between w-full">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1.5 text-caption-1-medium text-text-primary hover:text-accent-500 font-semibold cursor-pointer select-none group"
        >
          <span>{title}</span>
          <span className="font-mono text-[11px] font-normal text-text-tertiary">
            ({t("chat.cotChars", { count: rawText.length })})
          </span>
          {open ? (
            <RiArrowDownSLine className="size-3.5 text-text-tertiary group-hover:text-accent-500 transition-colors" />
          ) : (
            <RiArrowRightSLine className="size-3.5 text-text-tertiary group-hover:text-accent-500 transition-colors" />
          )}
        </button>

        {open ? (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <RiCheckLine className="size-3 text-emerald-500" />
                <span className="text-emerald-500">{t("common.copied")}</span>
              </>
            ) : (
              <>
                <RiClipboardLine className="size-3" />
                <span>{t("chat.copyThinking")}</span>
              </>
            )}
          </button>
        ) : null}
      </div>

      {/* 展开的思考正文：对标 DeepSeek / Cursor 的去卡片化左侧导轨流体排版 */}
      {open ? (
        <div className="my-1 ml-0.5 pl-3 border-l-2 border-border-button-default/80 animate-in fade-in-50 duration-150">
          <div className="max-h-80 overflow-y-auto whitespace-pre-wrap font-sans text-caption-1-regular text-text-secondary/85 leading-relaxed select-text pr-2 scrollbar-thin">
            {rawText}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** 子页面/文件折叠分支组件 */
function ExploredPagesBranch({
  title,
  pages
}: {
  title: string
  pages: Array<{ id: string; title: string; path?: string }>
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="flex flex-col gap-1 pt-0.5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-caption-2-medium text-text-secondary hover:text-text-primary cursor-pointer w-fit"
      >
        <span className="font-semibold">{title}</span>
        {open ? (
          <RiArrowDownSLine className="size-3 text-text-tertiary" />
        ) : (
          <RiArrowRightSLine className="size-3 text-text-tertiary" />
        )}
      </button>

      {open ? (
        <div className="flex flex-col gap-1 border-l border-border-button-default/70 pl-2.5 py-0.5 text-caption-2-regular text-text-tertiary animate-in fade-in-50 duration-150 font-mono">
          {pages.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => p.path && void openChangedFile(p.path)}
              className={cx(
                "text-left hover:text-text-primary transition-colors truncate max-w-md",
                p.path && "cursor-pointer"
              )}
            >
              {p.title}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
