/**
 * 回放事件详情与脱敏 JSON 检查器。
 */
import {
  RiCheckLine,
  RiClipboardLine,
  RiInformationLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import type { ReplayRow } from "./replay.types"

export function ReplayEventInspector({
  selectedRow,
  copied,
  onCopyJson
}: {
  selectedRow: ReplayRow | null
  copied: boolean
  onCopyJson: () => void
}) {
  if (!selectedRow) {
    return (
      <div className="lg:col-span-5 flex items-center justify-center rounded-xl border border-separator-border/70 bg-background-primary-default p-6 text-text-tertiary text-center shadow-2xs">
        点击左侧任意事件行展开检查
      </div>
    )
  }

  return (
    <div className="lg:col-span-5 flex flex-col rounded-xl border border-separator-border/70 bg-background-primary-default overflow-hidden shadow-2xs">
      <div className="flex items-center justify-between border-b border-separator-border/50 bg-background-secondary-default/30 p-3.5">
        <div className="flex items-center gap-2 min-w-0">
          <RiTerminalBoxLine className="size-4 text-accent-500 shrink-0" />
          <h4 className="font-bold text-caption-1-medium text-text-primary truncate">
            {selectedRow.type}
          </h4>
        </div>
        <span className="rounded bg-accent-500/10 px-1.5 py-0.5 text-caption-2-medium font-bold text-accent-600 dark:text-accent-400 shrink-0">
          Seq #{selectedRow.sequence ?? "—"}
        </span>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3.5 overflow-y-auto max-h-[500px]">
        {/* 事件语义说明卡 */}
        <div className="rounded-lg border border-separator-border/50 bg-background-secondary-default/40 p-3">
          <div className="flex items-center gap-1.5 text-text-primary font-semibold text-caption-2-medium mb-1">
            <RiInformationLine className="size-3.5 text-accent-500" />
            <span>事件语义说明</span>
          </div>
          <p className="text-caption-2-regular text-text-secondary leading-relaxed">
            {selectedRow.type === "run.start"
              ? "Agent 会话启动阶段：初始化工作区上下文、分配 Run ID，准备接收用户指令。"
              : selectedRow.type === "tool.start"
                ? `工具执行阶段：触发系统工具「${selectedRow.toolName ?? "tool"}」，进入参数求值与沙箱运行。`
                : selectedRow.type === "approval.required"
                  ? `安全审批阻断：工具「${selectedRow.toolName ?? "tool"}」触及敏感权限（写文件/Bash），等待人工授权。`
                  : selectedRow.type === "approval.resolved"
                    ? `审批决策已落定：用户已签署 ${selectedRow.decision ?? "allow"} 授权，流水线恢复推进。`
                    : selectedRow.type === "tool.result"
                      ? `工具执行收口：工具「${selectedRow.toolName ?? "tool"}」执行完毕，返回输出结构。`
                      : selectedRow.type === "text.delta"
                        ? "流式文本增量：模型吐字 Token 块，实时流式投递给客户端界面渲染。"
                        : selectedRow.type === "run.end"
                          ? "会话正常结束：Agent 循环收敛，状态归档并写入本地性能指标库。"
                          : "通用流式事件：主进程与工作区之间的底层通信事件。"}
          </p>
        </div>

        {/* 属性细分网格 */}
        <div className="grid grid-cols-2 gap-2 text-caption-2-medium">
          <div className="rounded bg-background-secondary-default/50 p-2 border border-separator-border/40">
            <span className="text-text-tertiary block text-caption-2-regular">Run ID</span>
            <span className="font-bold text-text-primary truncate block mt-0.5">
              {selectedRow.runId ?? "无"}
            </span>
          </div>
          <div className="rounded bg-background-secondary-default/50 p-2 border border-separator-border/40">
            <span className="text-text-tertiary block text-caption-2-regular">记录时间戳</span>
            <span className="font-bold text-text-primary block mt-0.5">
              {selectedRow.timestamp
                ? new Date(selectedRow.timestamp).toLocaleTimeString()
                : "实时捕获"}
            </span>
          </div>
        </div>

        {/* 原始脱敏 JSON 载荷 */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-caption-2-medium">
            <span className="font-semibold text-text-tertiary uppercase">脱敏事件载荷 (JSON)</span>
            <button
              type="button"
              onClick={onCopyJson}
              className="inline-flex items-center gap-1 text-accent-500 hover:text-accent-600 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <RiCheckLine className="size-3 text-state-success-text" />
                  <span>已复制</span>
                </>
              ) : (
                <>
                  <RiClipboardLine className="size-3" />
                  <span>复制载荷</span>
                </>
              )}
            </button>
          </div>
          <pre className="rounded-lg border border-separator-border/60 bg-background-secondary-default/60 p-3 font-mono text-caption-2-regular text-text-primary leading-relaxed overflow-x-auto">
            {JSON.stringify(selectedRow, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
