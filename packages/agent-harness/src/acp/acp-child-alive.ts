/**
 * Node 的 child.killed 只表示「我们发过信号」，进程可能还活着。
 * SIGKILL 升级必须看 exitCode / signalCode。
 */
export function acpChildStillAlive(child: {
  exitCode: number | null
  signalCode: NodeJS.Signals | null
}): boolean {
  return child.exitCode == null && child.signalCode == null
}
