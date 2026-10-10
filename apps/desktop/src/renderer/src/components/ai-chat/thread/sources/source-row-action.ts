/**
 * 本轮来源行点击：工作区文件打开，找不到就展开片段。纯函数，单测不碰 IPC。
 */
import { isHttpSource } from "./source-path.ts"
import { sourceBadgeKind } from "./source-detail.ts"
import type { TurnSourceChip } from "./source-chip.ts"

export type SourceOpenView = "diff" | "preview"

export type SourceRowPlan =
  | { action: "open"; path: string; startLine?: number; view: SourceOpenView }
  | { action: "expand" }
  | { action: "none" }

/** 知识库 / 只读一律查看文件；本轮写过的 file 才走差异。非 git 没有差异可看。 */
export function planSourceOpenView(
  chip: Pick<TurnSourceChip, "path" | "kind">,
  thisTurnChangedPaths: readonly string[]
): SourceOpenView {
  if (sourceBadgeKind(chip.kind) === "knowledge") return "preview"
  const path = chip.path?.trim().replaceAll("\\", "/")
  if (path && thisTurnChangedPaths.some((item) => item.replaceAll("\\", "/") === path)) {
    return "diff"
  }
  return "preview"
}

/** 非 git 工作区没有审查差异，本轮写过的 file 也改走查看文件。 */
export function resolveSourceOpenView(
  view: SourceOpenView,
  gitRepo: boolean | null
): SourceOpenView {
  if (view === "diff" && gitRepo === false) return "preview"
  return view
}

/** 工作区内相对路径才允许打开；盘符 / `..` / URL 就地展开。 */
export function isWorkspaceRelPath(path?: string): boolean {
  const normalized = (path ?? "").trim().replaceAll("\\", "/")
  if (!normalized || isHttpSource(normalized)) return false
  if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized)) return false
  if (normalized.split("/").some((part) => part === "..")) return false
  return true
}

/** 知识库 cite 不能只用 sourceId：同一来源多文件会撞 id，两行一起亮。 */
export function sourceChipStableId(input: {
  sourceId?: string
  path?: string
  startLine?: number
}): string {
  const path = input.path?.trim().replaceAll("\\", "/")
  if (path) return `${path}:${input.startLine ?? 0}`
  return (input.sourceId ?? "").trim()
}

export function planSourceRowClick(
  chip: TurnSourceChip,
  fileExists: boolean,
  thisTurnChangedPaths: readonly string[] = []
): SourceRowPlan {
  const badge = sourceBadgeKind(chip.kind)
  if (badge === "skill" || badge === "mcp") return { action: "none" }
  const path = chip.path?.trim()
  if (badge === "knowledge") {
    if (path && isWorkspaceRelPath(path) && fileExists) {
      return {
        action: "open",
        path,
        startLine: chip.startLine,
        view: planSourceOpenView(chip, thisTurnChangedPaths)
      }
    }
    return path || chip.snippet?.trim() ? { action: "expand" } : { action: "none" }
  }
  if (path) {
    return {
      action: "open",
      path,
      startLine: chip.startLine,
      view: planSourceOpenView(chip, thisTurnChangedPaths)
    }
  }
  return { action: "none" }
}

export function canActivateSourceRow(chip: TurnSourceChip): boolean {
  return planSourceRowClick(chip, true).action !== "none" || planSourceRowClick(chip, false).action !== "none"
}
