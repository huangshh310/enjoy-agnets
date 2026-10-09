/**
 * 标题栏窗口按钮跟系统走：macOS 左上角红绿灯，其它系统右侧线标。
 * renderer 没有 nodeIntegration，用 navigator 判断，不要读 process.platform。
 */
export function isMacWindowChrome(): boolean {
  if (typeof navigator === "undefined") return false
  return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)
}
