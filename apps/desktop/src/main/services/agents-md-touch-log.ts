/**
 * 工具碰到路径后，按需加载尚未进基线链的子目录 AGENTS.md。
 */
import type { ModelMessage } from "ai"
import {
  formatInstructionUpdate,
  instructionDirsForTouch,
  normalizeAgentsDirRel
} from "@enjoy-agents/ipc-contract/agents-md-chain"
import { readWorkspaceDirLayer } from "./agents-md-discover.ts"

export function createInstructionTouchLog(input: {
  workspaceRoot: string
  initialDirRels?: readonly string[]
}) {
  const seen = new Set((input.initialDirRels ?? ["."]).map((dir) => normalizeAgentsDirRel(dir)))
  const pending: ReturnType<typeof readWorkspaceDirLayer>[] = []

  function note(relativePath: string, kind?: "file" | "directory"): void {
    for (const dir of instructionDirsForTouch(relativePath, kind)) {
      const key = normalizeAgentsDirRel(dir)
      if (seen.has(key)) continue
      seen.add(key)
      const layer = readWorkspaceDirLayer(input.workspaceRoot, dir)
      if (layer) pending.push(layer)
    }
  }

  function takeNew(): ModelMessage[] {
    const layers = pending.filter((layer): layer is NonNullable<typeof layer> => Boolean(layer))
    pending.length = 0
    if (layers.length === 0) return []
    const content = formatInstructionUpdate(layers)
    if (!content) return []
    return [{ role: "user", content }]
  }

  return { note, takeNew }
}
