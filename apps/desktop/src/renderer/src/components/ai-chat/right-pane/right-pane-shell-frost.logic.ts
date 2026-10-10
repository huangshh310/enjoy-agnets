/**
 * 纯函数：右栏外壳装饰是否打开。审查栏任何状态（空/有文件）都不挂装饰。
 */
export function shouldRightPaneShellFrost(input: {
  emptyPicker: boolean
  reviewActive: boolean
}): boolean {
  if (input.emptyPicker) return false
  if (input.reviewActive) return false
  return true
}
