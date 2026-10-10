/**
 * 列会话失败只走人话，禁止把 JS 异常原文摊到引擎选择器。
 */
export function acpSessionListFailedCopy(t: (key: string) => string): string {
  return t("chat.importAcpListFailed")
}
