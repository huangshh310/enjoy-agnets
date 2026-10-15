/**
 * 出字前失败白卡上「再发一次」/「再试一次」给不给、第二行说什么（纯函数；两张卡共用，有行为测试）。
 * leo r5 / jojo / luna 锁定：
 * - 能安全重发（那一句原样在、chip 一个不少、有还稿快照）或正在重发 → 给按钮，第二行照旧（「…已放回输入框，可以直接再发。」）；
 * - 否则隐藏按钮（不是置灰），第二行**替换**成「改好后点发送就行，不会自动发出。」；原因行和 × 不变；
 * - 受限卡（无权限 / 余额）本没有还稿行时，这句就接在原因下。
 */
export type RetryCardView = { showRetry: boolean; detail: string | null }

export function retryCardView(input: {
  canRetry: boolean
  running: boolean
  restoredDetail: string | null
  editThenSend: string
}): RetryCardView {
  const showRetry = input.canRetry || input.running
  return { showRetry, detail: showRetry ? input.restoredDetail : input.editThenSend }
}
