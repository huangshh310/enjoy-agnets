/**
 * 通知类型图标：安静的 Remix 线标，不用彩色圆砖。
 */
import type { ComponentType } from "react"
import {
  RiBookOpenLine,
  RiCodeSSlashLine,
  RiCpuLine,
  RiGroupLine,
  RiPulseLine,
  RiRobotLine,
  RiShieldCheckLine,
  RiStackLine,
  RiTerminalBoxLine
} from "@remixicon/react"
import type { InboxCopyKey } from "../inbox.types"

type Glyph = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>

const GLYPHS: Record<InboxCopyKey, Glyph> = {
  rustRefactor: RiCodeSSlashLine,
  shellApproved: RiTerminalBoxLine,
  hmacBound: RiShieldCheckLine,
  knowledgeIndexed: RiBookOpenLine,
  contextCompacted: RiStackLine,
  engineReady: RiCpuLine,
  providerHealthy: RiPulseLine,
  teamWelcome: RiGroupLine
}

export function inboxGlyph(copyKey: InboxCopyKey): Glyph {
  return GLYPHS[copyKey] ?? RiRobotLine
}
