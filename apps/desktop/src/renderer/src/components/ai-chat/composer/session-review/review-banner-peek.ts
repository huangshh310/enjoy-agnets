/**
 * 改动条 / 待验收横幅主句。有 path 必须点名文件；占位句只在真的没有 path。
 */
import type { SessionReviewFile } from "./session-review.types"

type Translate = (key: string, vars?: Record<string, string | number>) => string

export function reviewBannerPeek(
  files: SessionReviewFile[],
  opts: { stopped?: boolean; placeholder?: boolean; wroteThisTurnOnly?: boolean; maybeChanged?: boolean },
  t: Translate
): string {
  if (files.length > 0 && opts.stopped) {
    return t("chat.sessionReviewStopped", { n: files.length })
  }
  if (files.length > 0 && opts.wroteThisTurnOnly) {
    if (files.length === 1) {
      const name = files[0]?.name ?? files[0]?.path ?? ""
      return t("chat.sessionReviewWroteThisTurn", { n: 1, name })
    }
    return t("chat.sessionReviewWroteThisTurnMany", { n: files.length })
  }
  if (files.length === 1) {
    const name = files[0]?.name ?? files[0]?.path ?? ""
    return t("chat.stackedFilesChangedNamed", { n: 1, name })
  }
  if (files.length > 0) return t("chat.stackedFilesChanged", { n: files.length })
  if (opts.maybeChanged || opts.placeholder) return t("chat.sessionReviewMaybeChanged")
  return t("chat.environmentChanges")
}
