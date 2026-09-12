/**
 * 批量编辑 / 阅读 / 命令聚合行 (深度对标 monocode 极简灰度流式步骤)
 */
import { useState } from "react"
import { RiArrowDownSLine, RiArrowRightSLine, RiCheckLine, RiCloseLine, RiTerminalBoxLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { FileTypeIcon } from "@renderer/components/ai-chat/file-type-icon"
import { sameReviewPath } from "@renderer/components/ai-chat/right-pane/views/review/same-review-path"
import { openChangedFile } from "@renderer/hooks/use-agent-session"
import { useChatStore } from "@renderer/stores/chat-store"
import type { AgentStepNode } from "../agent-step-tree.types"
import { DomainPills } from "./domain-pills"
import { formatDisplayPath } from "./tool-step-row"

export function BatchEditingGroupRow({ node }: { node: AgentStepNode }) {
  const [open, setOpen] = useState(false)
  const items = node.batchItems ?? []
  const isCmd = node.kind === "command"
  const selectedFilePath = useChatStore((state) => state.selectedFilePath)
  const workspaceRootPath = useChatStore((state) => state.workspaceRootPath)
  return (
    <div className="my-1 flex w-full flex-col">
      {/* 折叠标题行：左图标 + 文字 + 差异/药丸 + 右小箭头 */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="group flex w-fit cursor-pointer items-center gap-1.5 py-0.5 text-left text-caption-1-medium text-text-secondary hover:text-text-primary transition-colors select-none"
      >
        <span className="font-sans text-body-2-medium text-text-primary/90 group-hover:text-text-primary">
          {node.title}
        </span>
        <BatchDiff additions={node.additions} deletions={node.deletions} />
        {open ? (
          <RiArrowDownSLine className="size-3.5 text-text-tertiary group-hover:text-text-primary transition-colors" />
        ) : (
          <RiArrowRightSLine className="size-3.5 text-text-tertiary group-hover:text-text-primary transition-colors" />
        )}
      </button>

      {node.domainPills && node.domainPills.length > 0 ? <DomainPills pills={node.domainPills} /> : null}

      {/* 展开的单行列表 (对标 monocode 截图 2、3、4)：动词 + 彩色图标 + 等宽路径 + 状态 */}
      {open ? (
        <div className="ml-2.5 mt-0.5 flex flex-col gap-0.5 border-l border-border-button-default/50 py-0.5 pl-2.5">
          {items.map((item) => {
            const displayTarget = isCmd
              ? item.fileName || item.path
              : formatDisplayPath(item.path, item.fileName, workspaceRootPath)

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (!isCmd) void openChangedFile(item.path)
                }}
                className={cx(
                  "flex w-full items-center gap-2 rounded px-1.5 py-0.5 text-left font-mono text-caption-1-regular leading-5 transition-all",
                  isCmd
                    ? "text-text-secondary select-text cursor-default"
                    : !isCmd && selectedFilePath && sameReviewPath(item.path, selectedFilePath)
                      ? "bg-accent-500/15 text-accent-500 font-medium shadow-2xs"
                      : "cursor-pointer hover:bg-background-secondary-hover hover:text-text-primary group/item"
                )}
              >
                {/* 动词：Read / Write / Edit / Find / Run */}
                <span className="w-8 shrink-0 font-sans text-caption-2-medium text-text-tertiary/80">
                  {item.actionVerb}
                </span>

                {/* 文件类型图标 */}
                {isCmd ? (
                  <RiTerminalBoxLine className="size-3.5 shrink-0 text-text-tertiary" />
                ) : (
                  <FileTypeIcon name={item.fileName || item.path} size={14} />
                )}

                {/* 路径文本：等宽字体，支持点击 */}
                <span
                  className={cx(
                    "truncate font-mono text-caption-1-regular text-text-secondary transition-colors",
                    !isCmd && "group-hover/item:text-accent-500"
                  )}
                  title={item.path}
                >
                  {displayTarget}
                </span>

                {/* 右侧：增减行号或执行状态 */}
                {item.additions != null || item.deletions != null ? (
                  <span className="ml-auto shrink-0 font-mono text-caption-2-semibold tabular-nums">
                    {item.additions != null ? <span className="text-state-success-text">+{item.additions}</span> : null}
                    {item.deletions != null ? <span className="ml-1 text-text-error-primary">-{item.deletions}</span> : null}
                  </span>
                ) : item.status === "completed" ? (
                  <RiCheckLine className="ml-auto size-3 shrink-0 text-state-success-text/80" />
                ) : item.status === "error" ? (
                  <RiCloseLine className="ml-auto size-3 shrink-0 text-text-error-primary" />
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}


function BatchDiff({ additions, deletions }: { additions?: number; deletions?: number }) {
  if (additions == null && deletions == null) return null
  return (
    <span className="font-mono text-caption-2-semibold tabular-nums">
      {additions != null ? <span className="text-state-success-text">+{additions}</span> : null}
      {deletions != null ? <span className="ml-1 text-text-error-primary">-{deletions}</span> : null}
    </span>
  )
}
