/**
 * 空 Composer ↑ / ↓ 召回：纯状态机。不带回附件；一改字就变成普通草稿。
 */

export type RecallState = {
  index: number | null
  snapshot: string
}

export const EMPTY_RECALL_STATE: RecallState = { index: null, snapshot: "" }

export function caretOnFirstLine(value: string, selectionStart: number): boolean {
  return !value.slice(0, Math.max(0, selectionStart)).includes("\n")
}

export function caretOnLastLine(value: string, selectionStart: number): boolean {
  return !value.slice(Math.max(0, selectionStart)).includes("\n")
}

export function applyRecallUp(input: {
  value: string
  prompts: string[]
  state: RecallState
  caretOnFirstLine: boolean
  composerBusy: boolean
}): { value: string; state: RecallState } | null {
  if (input.composerBusy || input.prompts.length === 0) return null
  const empty = input.value.trim().length === 0
  const recalling = input.state.index !== null && input.value === input.state.snapshot
  if (!empty && !(recalling && input.caretOnFirstLine)) return null
  const nextIndex = empty ? 0 : (input.state.index ?? -1) + 1
  const next = input.prompts[nextIndex]
  if (!next || (next === input.value && input.state.index === nextIndex)) return null
  return { value: next, state: { index: nextIndex, snapshot: next } }
}

export function applyRecallDown(input: {
  value: string
  prompts: string[]
  state: RecallState
  caretOnLastLine: boolean
  composerBusy: boolean
}): { value: string; state: RecallState } | null {
  if (input.composerBusy || input.state.index === null) return null
  if (input.value !== input.state.snapshot || !input.caretOnLastLine) return null
  if (input.state.index === 0) return { value: "", state: EMPTY_RECALL_STATE }
  const nextIndex = input.state.index - 1
  const next = input.prompts[nextIndex]
  if (!next) return { value: "", state: EMPTY_RECALL_STATE }
  return { value: next, state: { index: nextIndex, snapshot: next } }
}
