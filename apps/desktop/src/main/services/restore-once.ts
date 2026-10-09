/**
 * 每个进程只 restore 一次。窗口重建不得再扫库。
 */
let runningClaimed = false
let waitingClaimed = false

export function claimRestoreRunningOnce(): boolean {
  if (runningClaimed) return false
  runningClaimed = true
  return true
}

export function claimRestoreWaitingOnce(): boolean {
  if (waitingClaimed) return false
  waitingClaimed = true
  return true
}
