/**
 * 每个进程只 restore 一次。窗口重建不得再扫库。
 */
let runningClaimed = false
let waitingClaimed = false
let waitingSettled = false

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

export function markRestoreWaitingSettled(): void {
  waitingSettled = true
}

export function isRestoreWaitingSettled(): boolean {
  return waitingSettled
}

export function resetRestoreWaitingOnceForTests(): void {
  waitingClaimed = false
  waitingSettled = false
}
