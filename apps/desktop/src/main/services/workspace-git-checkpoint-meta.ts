/**
 * 检查点提交说明：把 session / run / kind 编进 subject，不改 ref 形状。
 */

export type EnjoyCheckpointKind = "baseline" | "turn"

export type EnjoyCheckpointMeta = {
  sessionId: string
  runId: string
  kind: EnjoyCheckpointKind
}

const TOKEN = /^[A-Za-z0-9_-]+$/
const SUBJECT =
  /^enjoy checkpoint(?: session=([A-Za-z0-9_-]+) run=([A-Za-z0-9_-]+) kind=(baseline|turn))?$/

export function formatCheckpointSubject(meta?: EnjoyCheckpointMeta): string {
  if (!meta || !TOKEN.test(meta.sessionId) || !TOKEN.test(meta.runId)) return "enjoy checkpoint"
  return `enjoy checkpoint session=${meta.sessionId} run=${meta.runId} kind=${meta.kind}`
}

export function parseCheckpointSubject(subject: string): Partial<EnjoyCheckpointMeta> {
  const match = SUBJECT.exec(subject.trim())
  if (!match?.[1] || !match[2] || !match[3]) return {}
  return {
    sessionId: match[1],
    runId: match[2],
    kind: match[3] as EnjoyCheckpointKind
  }
}
