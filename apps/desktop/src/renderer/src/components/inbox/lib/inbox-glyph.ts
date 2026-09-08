/**
 * 档案类型图标：按 Attention kind，不用假种子插画。
 */
import type { ComponentType } from "react"
import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiQuestionLine,
  RiRobotLine,
  RiShieldKeyholeLine
} from "@remixicon/react"
import type { AttentionKind } from "@renderer/stores/attention/attention.types"

type Glyph = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>

const GLYPHS: Record<AttentionKind, Glyph> = {
  pending_approval: RiShieldKeyholeLine,
  ask_user: RiQuestionLine,
  error: RiErrorWarningLine,
  complete: RiCheckboxCircleLine
}

export function inboxGlyph(kind: AttentionKind): Glyph {
  return GLYPHS[kind] ?? RiRobotLine
}
