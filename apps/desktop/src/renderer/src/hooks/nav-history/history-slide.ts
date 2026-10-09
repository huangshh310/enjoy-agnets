/**
 * 离开或进入的页面正在流式输出时，不做横向位移。
 */
export type HistorySlide = "back" | "forward"

export function shouldSkipHistorySlide(input: {
  sourceRunning: boolean
  destinationRunning: boolean
  reduceMotion: boolean
}): boolean {
  return input.reduceMotion || input.sourceRunning || input.destinationRunning
}
