/**
 * 工具主行人话映射表（#117 首刀）。
 * 维护方 = mike / 前端。黑话（desktop_act / bundle / TTL / HMAC）禁止进主表面，进展开。
 */
import type { TranslateFn } from "@renderer/i18n"

/** 只读连续合并用的人话批标题。 */
export function humanBatchReadTitle(count: number, t: TranslateFn): string {
  return count === 1 ? t("chat.batchFilesReadOne") : t("chat.batchFilesRead", { count })
}

export function humanBatchSearchTitle(count: number, t: TranslateFn): string {
  return count === 1 ? t("chat.batchSearchesOne") : t("chat.batchSearches", { count })
}

/** 搜索主行：完成「搜了 …」；进行中保留「正在搜索 …」。 */
export function humanSearchTitle(
  query: string,
  running: boolean,
  t: TranslateFn
): string {
  const q = query.trim() || "context"
  const clipped = q.length > 50
  const shown = clipped ? q.slice(0, 50) : q
  if (running) {
    return clipped
      ? t("chat.searchingQueryMore", { query: shown })
      : t("chat.searchingQuery", { query: shown })
  }
  return clipped
    ? t("chat.humanSearchMore", { query: shown })
    : t("chat.humanSearch", { query: shown })
}

/** 读文件主行：读了登录页 */
export function humanReadTitle(leafName: string | undefined, t: TranslateFn): string {
  if (!leafName) return t("chat.readingResources")
  return t("chat.humanRead", { name: leafName })
}

/** 改/写文件主行：改了 settings.ts / 写了 page.tsx */
export function humanEditTitle(
  leafName: string | undefined,
  writing: boolean,
  t: TranslateFn
): string {
  const name = leafName?.trim()
  if (!name) return writing ? t("chat.verbWrite") : t("chat.verbEdit")
  return writing ? t("chat.humanWrite", { name }) : t("chat.humanEdit", { name })
}

/** 命令主行：跑着 → 正在跑…；完成保留短命令；拒绝单独句。 */
export function humanCommandTitle(
  shell: string | undefined,
  status: "running" | "denied" | "error" | "done" | "other",
  t: TranslateFn
): string {
  if (status === "denied") return t("chat.humanDeniedCommand")
  const short = shortCommand(shell)
  if (status === "running") {
    return short ? t("chat.humanRunning", { name: short }) : t("chat.humanRunningGeneric")
  }
  if (status === "error" && short) return t("chat.humanFailedCommand", { name: short })
  if (!shell) return t("chat.ranACommand")
  return shell.length > 70 ? `$ ${shell.slice(0, 68)}...` : `$ ${shell}`
}

/** desktop_act 主行已由 formatToolLabel 走人话；这里只挡黑话泄漏。 */
export function looksLikeToolJargon(text: string): boolean {
  return /desktop_act|bundle id|HMAC|\bTTL\b|ToolLoop/i.test(text)
}

function shortCommand(shell: string | undefined): string | undefined {
  if (!shell?.trim()) return undefined
  const first = shell.trim().split(/\s+/)[0] ?? ""
  const base = first.split(/[\\/]/).pop() ?? first
  return base.slice(0, 24) || undefined
}

/** E1 M2 停止收尾里某个工具的显示结论（与 stores/stop-settle-reducer 的 ToolStopView 同形，这里不反向依赖 store）。 */
export type StoppedToolView = "stopping" | "stuck" | "none_confirmed" | "maybe_partial" | "completed"

/**
 * E1 M2 / luna ⑥（设计 §1.3.1）：停掉的工具行标题只写状态，对象（文件名 / 命令摘要）另行弱化跟在后面。
 * 写类工具（writeFile / editFile / bash 写文件）同一套句子；禁「写了 / 改了 / 完成 / 已写入 / 已保存」。
 * 没有收尾记录（无在途工具的停止、或重开应用后）：只说「已停止」，不臆断写没写。
 * 返回 null = 不归停止收尾管（沿用原标题）。
 */
export function stoppedToolTitle(
  view: StoppedToolView | null,
  editing: boolean,
  t: TranslateFn
): string | null {
  if (view === "stopping") return t("chat.stopStopping")
  if (view === "stuck") return t("chat.stopStuck")
  if (view === "none_confirmed") return t("chat.toolStoppedNothingWritten")
  if (view === "maybe_partial") return t("chat.toolStoppedMaybePartial")
  if (view === "completed") return t("chat.toolStopped")
  return editing ? t("chat.toolStopped") : null
}
