/**
 * 差异行配色。默认是成功绿 / 错误红；易辨认改走 accent 与 status-yellow。
 * 禁止 raw red/green。
 */
export type DiffPalette = "default" | "distinct"

export const DIFF_PALETTE_STORAGE_KEY = "enjoy-agents-diff-palette"

export function parseDiffPalette(value: string | null): DiffPalette {
  return value === "distinct" ? "distinct" : "default"
}

export function diffTone(palette: DiffPalette = "default") {
  if (palette === "distinct") {
    return {
      addRow: "bg-accent-500/10 text-accent-500",
      delRow: "bg-status-yellow-background/40 text-status-yellow-text",
      addBar: "bg-accent-500",
      delBar: "bg-status-yellow-text",
      addMark: "text-accent-500",
      delMark: "text-status-yellow-text",
      addWord: "bg-accent-500/30",
      addStat: "text-accent-500",
      delStat: "text-status-yellow-text"
    }
  }
  return {
    addRow: "bg-state-success-text/10 text-state-success-text dark:text-state-success-text",
    delRow: "bg-background-tertiary-error/10 text-text-error-primary dark:text-text-error-primary",
    addBar: "bg-state-success-base",
    delBar: "bg-background-tertiary-error",
    addMark: "text-state-success-text dark:text-state-success-text",
    delMark: "text-text-error-primary dark:text-text-error-primary",
    addWord: "bg-state-success-text/30",
    addStat: "text-state-success-text dark:text-state-success-text",
    delStat: "text-text-error-primary dark:text-text-error-primary"
  }
}
