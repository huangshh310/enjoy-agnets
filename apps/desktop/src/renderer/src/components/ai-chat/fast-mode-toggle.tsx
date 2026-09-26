/**
 * 聊天输入框极速模式 (Fast Mode) 开关
 * 1. 形状尺寸与 ReasoningEffortToggle 完全对齐（h-8 rounded-full）；
 * 2. 开启时琥珀微光与闪电发光图标，支持 CLI 与原生模型极速推断；
 * 3. 物理触觉回弹与即时状态切换。
 */
import { RiFlashlightLine } from "@remixicon/react"
import { cx } from "@/utils/cx"
import { useChatStore } from "@renderer/stores/chat-store"

export function FastModeToggle() {
  const isFastMode = useChatStore((state) => state.isFastMode)
  const toggleFastMode = useChatStore((state) => state.toggleFastMode)

  return (
    <button
      type="button"
      onClick={toggleFastMode}
      aria-pressed={isFastMode}
      aria-label="切换极速模式 (Fast Mode)"
      title={
        isFastMode
          ? "极速模式已开启：优先低延迟。本机 CLI 的 ACP 子命令不接受 --fast，不会往命令行里塞。"
          : "开启极速模式 (Fast Mode)：优先极速推断与低延迟代码生成"
      }
      className={cx(
        "group flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-caption-1-medium transition-all duration-150 outline-none select-none shadow-2xs active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-border-focus-ring cursor-pointer",
        isFastMode
          ? "border border-status-yellow-text/40 bg-status-yellow-background/15 font-semibold text-status-yellow-text dark:text-status-yellow-text ring-1 ring-status-yellow-text/25"
          : "border border-border-button-default bg-background-primary-default text-text-secondary hover:bg-background-secondary-hover hover:border-border-button-hover hover:text-text-primary"
      )}
    >
      <RiFlashlightLine
        className={cx(
          "size-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110",
          isFastMode ? "text-status-yellow-text dark:text-status-yellow-text" : "text-text-tertiary"
        )}
      />
      <span className="whitespace-nowrap text-caption-1-medium font-medium">
        {isFastMode ? "Fast 极速" : "Fast"}
      </span>
    </button>
  )
}
