/**
 * Computer Use 会话入参与钩子。执行器协议保持三端同一套字段。
 */
import type { Observation } from "@enjoy-agents/agent-core/computer-use"
import type { ExecutorCommand } from "./executor-command.ts"
import type { CodesignInfo } from "./executor-identity.ts"

export type DesktopPermissions = { accessibility: boolean; screenCapture: boolean }

export type ActInput = {
  observationId: string
  action: string
  elementId?: string
  button?: "left" | "right" | "middle"
  count?: number
  text?: string
  key?: string
  x?: number
  y?: number
  x2?: number
  y2?: number
  dy?: number
  allowForeground?: boolean
  waitMs?: number
  appName?: string
  elementName?: string
  elementRole?: string
  appKey?: string
  pid?: number
  thumbnailPath?: string
}

export type DesktopSessionHooks = {
  permissions?: () => DesktopPermissions
  captureThumb?: (pid?: number) => Promise<string | null>
  onView?: (view: { observationId: string; appName: string; elements: Observation["elements"]; thumbnailPath?: string }) => void
  now?: () => number
  ttlMs?: number
  /** 与真实 spawn 同一条 resolve；单测可塞假路径。 */
  resolveCommand?: () => ExecutorCommand | null
  inspectCodesign?: (filePath: string) => CodesignInfo
  identityPlatform?: NodeJS.Platform
  expectedIdentity?: string | null
}

export type DesktopSession = {
  doctor: () => Promise<Record<string, unknown>>
  listApps: () => Promise<Record<string, unknown>>
  snapshot: (pid?: number) => Promise<Record<string, unknown>>
  act: (input: ActInput) => Promise<Record<string, unknown>>
  screenshot: (pid?: number) => Promise<Record<string, unknown>>
  peek: (observationId: string) => Observation | null
  lookup: (observationId: string) => Observation | null
  freeze: (observationId: string) => boolean
  release: (observationId: string) => void
}
