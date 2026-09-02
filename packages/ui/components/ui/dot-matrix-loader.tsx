/**
 * Dot Matrix Loader 点阵微动效加载组件：
 * 参考 dotmatrix.zzzzshawn.cloud 经典点阵设计 (Braille Beat & Pulse Wave)，
 * 专为侧边栏会话状态、Thinking 思考与流式传输打造的高性能微型动效。
 */
import { cx } from "@/utils/cx"
import { uiT, useUiLocale } from "@/i18n/ui-locale"

export type DotMatrixVariant = "wave" | "matrix" | "pulse" | "drift"

export function DotMatrixLoader({
  variant = "wave",
  className,
  colorClass = "bg-accent-500"
}: {
  variant?: DotMatrixVariant
  className?: string
  colorClass?: string
}) {
  useUiLocale()
  const thinkingTitle = uiT("思考 / 生成中...", "Thinking / Generating...")
  const generatingTitle = uiT("正在生成对话中...", "Generating conversation...")
  if (variant === "matrix") {
    // 2x2 矩阵旋转呼吸
    return (
      <div
        className={cx(
          "inline-grid grid-cols-2 gap-0.5 size-3.5 items-center justify-center select-none",
          className
        )}
        title={thinkingTitle}
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            style={{
              animation: `dotMatrixPulse 1.2s infinite ease-in-out`,
              animationDelay: `${i * 0.15}s`
            }}
            className={cx("size-1 rounded-full", colorClass)}
          />
        ))}
      </div>
    )
  }

  if (variant === "pulse") {
    // 3 点连续脉冲
    return (
      <div
        className={cx(
          "inline-flex items-center gap-0.5 h-3.5 px-0.5 select-none",
          className
        )}
        title={thinkingTitle}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              animation: `dotMatrixScale 1.1s infinite ease-in-out`,
              animationDelay: `${i * 0.2}s`
            }}
            className={cx("size-1 rounded-full", colorClass)}
          />
        ))}
      </div>
    )
  }

  // 默认 "wave" (Braille Beat / Altitude Wave 律动波浪，侧边栏最灵动最契合)
  return (
    <div
      className={cx(
        "inline-flex items-center gap-0.5 h-3.5 px-0.5 select-none",
        className
      )}
      title={generatingTitle}
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            animation: `dotMatrixWave 1.2s infinite ease-in-out`,
            animationDelay: `${i * 0.15}s`
          }}
          className={cx("size-1 rounded-full", colorClass)}
        />
      ))}
      <style>{`
        @keyframes dotMatrixWave {
          0%, 100% {
            transform: translateY(0px) scale(0.85);
            opacity: 0.35;
          }
          50% {
            transform: translateY(-2.5px) scale(1.15);
            opacity: 1;
          }
        }
        @keyframes dotMatrixPulse {
          0%, 100% {
            opacity: 0.25;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.15);
          }
        }
        @keyframes dotMatrixScale {
          0%, 100% {
            transform: scale(0.75);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.2);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}
