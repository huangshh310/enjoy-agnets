/**
 * 实验媒体门闩：纯函数，供 hook 与 node 测试共用。
 */
import { composerRunKind } from "./composer-run-kind.ts"

export function videoRunNeedsExperimental(
  modelId: string,
  capabilities: string[] | undefined,
  experimentalMedia: boolean
) {
  return composerRunKind(modelId, capabilities) === "video" && !experimentalMedia
}
