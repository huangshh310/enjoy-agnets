/**
 * stub「very slow」：约 1.5s 一词、共约 15s，中途停一张写盘审批。
 * 只给 isE2eStub 用，用来验 Stop → 已停止，以及写后 Stop → 待验收。
 */
export const STUB_VERY_SLOW_PROMPT = "very slow"
export const STUB_WRITE_SLOW_NOTE_PROMPT = "please write slow note"
export const STUB_VERY_SLOW_MS = 1500

/** 单测可把 ENJOY_E2E_STUB_SLOW_MS=0，避免真等 15s。 */
export function verySlowDelayMs(): number {
  const raw = process.env.ENJOY_E2E_STUB_SLOW_MS
  if (raw == null || raw === "") return STUB_VERY_SLOW_MS
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : STUB_VERY_SLOW_MS
}
export const STUB_VERY_SLOW_WORDS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten"
] as const

import { isE2eStub } from "./e2e-stub-gate.ts"

export function isVerySlowPrompt(prompt: string): boolean {
  return isE2eStub() && /\bvery slow\b/i.test(prompt)
}

/** 先停写盘审批，允许后再慢流正文，方便中途 Stop / 出错。 */
export function isWriteSlowNotePrompt(prompt: string): boolean {
  return isE2eStub() && /please write slow note/i.test(prompt)
}

export function verySlowHead(): string {
  return STUB_VERY_SLOW_WORDS.slice(0, 5).join(" ")
}

export function verySlowTail(): string {
  return STUB_VERY_SLOW_WORDS.slice(5).join(" ")
}
