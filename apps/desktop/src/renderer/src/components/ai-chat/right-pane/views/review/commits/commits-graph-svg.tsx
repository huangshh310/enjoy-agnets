/**
 * 线性提交轨：一条竖线 + 节点圆。git log 没有 parent 图，禁止用 index 伪装车道。
 */

import type { CommitListItem } from "../types/review.types"

const ROW_HEIGHT = 64
const X = 22

export function CommitsGraphSvg(props: {
  commits: CommitListItem[]
  totalHeight?: number
}) {
  const { commits, totalHeight } = props
  const svgHeight = totalHeight || Math.max(commits.length * ROW_HEIGHT, 240)

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 z-0"
      width={48}
      height={svgHeight}
      aria-hidden
    >
      {commits.length > 1 ? (
        <line
          x1={X}
          y1={ROW_HEIGHT / 2}
          x2={X}
          y2={(commits.length - 1) * ROW_HEIGHT + ROW_HEIGHT / 2}
          className="stroke-separator-border"
          strokeWidth={2}
        />
      ) : null}
      {commits.map((commit, index) => {
        const y = index * ROW_HEIGHT + ROW_HEIGHT / 2
        return (
          <circle
            key={commit.id}
            cx={X}
            cy={y}
            r={index === 0 ? 5 : 3.5}
            className={
              commit.isMerge
                ? "fill-background-primary-default stroke-accent-500"
                : "fill-accent-500 stroke-accent-500"
            }
            strokeWidth={index === 0 || commit.isMerge ? 2 : 0}
          />
        )
      })}
    </svg>
  )
}
