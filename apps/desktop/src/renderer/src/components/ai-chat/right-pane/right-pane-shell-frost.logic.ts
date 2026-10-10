/**
 * 纯函数：右栏外壳装饰是否打开。
 * 审查栏与右侧所有 pane（空态 / 有文件 / 终端 / 文件 / 浏览器）永不挂棱镜，不看 GPU。
 */
export function shouldRightPaneShellFrost(_input?: {
  emptyPicker: boolean
  reviewActive: boolean
}): boolean {
  return false
}
