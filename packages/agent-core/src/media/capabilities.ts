/**
 * 实验媒体能力标记。视频 / Realtime 默认实验，必须可降级。
 */
export const EXPERIMENTAL_MEDIA = ["video", "realtime", "stream-transcribe"] as const

export function isExperimentalMedia(kind: string): boolean {
  return (EXPERIMENTAL_MEDIA as readonly string[]).includes(kind)
}
