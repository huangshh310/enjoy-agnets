/**
 * 内置工具 (Built-in Tools) IPC 契约：
 * 1. 浏览器：内置浏览器、Browser Bridge 与 Chrome 扩展配对。
 * 2. 桌面：三端 Computer Use 与系统权限状态。
 */
import { z } from "zod"
import { DesktopAlwaysAllowAppKeys } from "./desktop-always-allow.ts"

export const BuiltinBrowserState = z.object({
  enabled: z.boolean().default(false)
})
export type BuiltinBrowserState = z.infer<typeof BuiltinBrowserState>

export const BrowserBridgeState = z.object({
  enabled: z.boolean().default(false),
  port: z.number().default(47823),
  pairingCode: z.string(),
  connectedBrowser: z.string().nullable().default(null),
  extensionInstalled: z.boolean().default(false)
})
export type BrowserBridgeState = z.infer<typeof BrowserBridgeState>

export const DesktopComputerUseState = z.object({
  enabled: z.boolean().default(false),
  accessibilityGranted: z.boolean().default(false),
  screenCaptureGranted: z.boolean().default(false),
  screenVisuals: z.boolean().default(true),
  /** 当前会话表是否有 desktop_act:*。默认关，不落盘。 */
  anyDesktopSession: z.boolean().default(false),
  /** CU-P1-A 持久簿投影。只读列表；写入走 allow_always / revokeAlwaysAllow。 */
  alwaysAllowApps: DesktopAlwaysAllowAppKeys,
  session: z.enum(["macos", "windows", "x11", "wayland", "none"]).optional()
})
export type DesktopComputerUseState = z.infer<typeof DesktopComputerUseState>

export const DesktopDoctorReport = z.object({
  success: z.boolean(),
  line: z.string(),
  session: z.enum(["macos", "windows", "x11", "wayland", "none"]).optional(),
  backgroundClick: z.boolean().optional(),
  code: z.string().optional(),
  /** 即将 spawn 的 helper，不是 Electron 宿主。绿只认 helperSigned + helper AX。 */
  helperPath: z.string().nullable().optional(),
  helperSigned: z.boolean().optional(),
  helperIdentity: z.string().nullable().optional(),
  helperMatchesSpawn: z.boolean().optional(),
  helperTeamId: z.string().nullable().optional(),
  trusted: z.boolean().optional(),
  accessibility: z.boolean().optional(),
  hostAccessibility: z.boolean().optional(),
  screenCapture: z.boolean().optional(),
  /** helper 自己的输入监听，不是宿主 Electron。未签名时不得当成已授权。 */
  inputMonitoring: z.boolean().optional()
})
export type DesktopDoctorReport = z.infer<typeof DesktopDoctorReport>

export const DesktopView = z.object({
  observationId: z.string(),
  appName: z.string(),
  appKey: z.string().optional(),
  elements: z.array(
    z.object({
      id: z.string(),
      role: z.string(),
      name: z.string(),
      clickable: z.boolean()
    })
  ),
  thumbnailDataUrl: z.string().optional()
})
export type DesktopView = z.infer<typeof DesktopView>

/** 审批卡约定字段；approval.required.args 仍是 unknown，renderer 用此 parse。 */
export const DesktopActApprovalArgs = z
  .object({
    observationId: z.string(),
    action: z.string(),
    elementId: z.string().optional(),
    appName: z.string().optional(),
    appKey: z.string().optional(),
    appKeySource: z.enum(["bundleId", "exe", "aumid", "appName"]).optional(),
    elementName: z.string().optional(),
    elementRole: z.string().optional(),
    thumbnailPath: z.string().optional(),
    thumbnailDataUrl: z.string().optional(),
    previousObservationId: z.string().optional(),
    previousThumbnailPath: z.string().optional(),
    previousThumbnailDataUrl: z.string().optional(),
    previousAppName: z.string().optional(),
    previousElementName: z.string().optional(),
    /** 重拍对不上：审批 args 带 previousThumbnailPath + thumbnailPath。 */
    needsSecondConfirm: z.boolean().optional(),
    allowForeground: z.boolean().optional(),
    /** 坐标 / 切前台：为 true 时卡片隐藏「本会话允许此应用」。 */
    bypassesSessionAllow: z.boolean().optional(),
    x: z.number().optional(),
    y: z.number().optional()
  })
  .passthrough()
export type DesktopActApprovalArgs = z.infer<typeof DesktopActApprovalArgs>

export const DesktopCapturePreview = z.object({
  ok: z.boolean(),
  thumbnailDataUrl: z.string().optional(),
  code: z.string().optional()
})
export type DesktopCapturePreview = z.infer<typeof DesktopCapturePreview>

export const BuiltinToolsState = z.object({
  builtinBrowser: BuiltinBrowserState,
  browserBridge: BrowserBridgeState,
  computerUse: DesktopComputerUseState
})
export type BuiltinToolsState = z.infer<typeof BuiltinToolsState>

export const GetBuiltinToolsStateInput = z
  .object({
    sessionId: z.string().min(1).optional()
  })
  .default({})
export type GetBuiltinToolsStateInput = z.infer<typeof GetBuiltinToolsStateInput>

export const ToggleBuiltinToolInput = z.object({
  tool: z.enum(["builtinBrowser", "browserBridge", "computerUse", "screenVisuals", "anyDesktopSession"]),
  enabled: z.boolean(),
  /** anyDesktopSession 必须带当前 Enjoy sessionId，写入会话表而不是 prefs。 */
  sessionId: z.string().min(1).optional()
})
export type ToggleBuiltinToolInput = z.infer<typeof ToggleBuiltinToolInput>

export const OpenSystemPermissionInput = z.object({
  permission: z.enum(["accessibility", "screenCapture", "inputMonitoring"])
})
export type OpenSystemPermissionInput = z.infer<typeof OpenSystemPermissionInput>
