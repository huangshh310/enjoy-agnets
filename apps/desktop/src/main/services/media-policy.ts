/**
 * 实验媒体开关：video / realtime 必须设置里打开后，main 才执行。
 */
import { EXPERIMENTAL_MEDIA_HINT } from "@enjoy-agents/ipc-contract"
import { readPreferences } from "./preferences"

const EXPERIMENTAL_KINDS = new Set(["video", "realtime-session"])

export function assertMediaKindAllowed(kind: string): void {
  if (!EXPERIMENTAL_KINDS.has(kind)) return
  if (readPreferences().experimentalMedia) return
  throw new Error(EXPERIMENTAL_MEDIA_HINT)
}
