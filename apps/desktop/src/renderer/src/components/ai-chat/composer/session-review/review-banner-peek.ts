/**
 * 改动条 / 待验收横幅主句。有 path 必须点名文件；占位句只在真的没有 path。
 */
import type { SessionReviewFile } from "./session-review.types"

type Translate = (key: string, vars?: Record<string, string | number>) => string

export function reviewBannerPeek(
  files: SessionReviewFile[],
  opts: { stopped?: boolean; placeholder?: boolean },
  t: Translate
): string {
  if (files.length > 0 && opts.stopped) {
    return t("chat.sessionReviewStopped", { n: files.length })
  }
  if (files.length === 1) {
    const name = files[0]?.name ?? files[0]?.path ?? ""
    return t("chat.stackedFilesChangedNamed", { n: 1, name })
  }
  if (files.length > 0) return t("chat.stackedFilesChanged", { n: files.length })
  if (opts.placeholder) return t("chat.sessionReviewCommandPlaceholder")
  return t("chat.environmentChanges")
}
