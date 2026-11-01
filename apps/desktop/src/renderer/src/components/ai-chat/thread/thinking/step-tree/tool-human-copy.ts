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
