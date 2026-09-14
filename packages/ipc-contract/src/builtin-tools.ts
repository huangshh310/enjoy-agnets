/**
 * 内置工具 (Built-in Tools) IPC 契约：
 * 1. 浏览器：内置浏览器、Browser Bridge 与 Chrome 扩展配对。
 * 2. 桌面：macOS 后台 Computer Use 与系统权限状态管理。
 */
import { z } from "zod"

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
  screenVisuals: z.boolean().default(true)
})
export type DesktopComputerUseState = z.infer<typeof DesktopComputerUseState>

export const BuiltinToolsState = z.object({
  builtinBrowser: BuiltinBrowserState,
  browserBridge: BrowserBridgeState,
  computerUse: DesktopComputerUseState
})
export type BuiltinToolsState = z.infer<typeof BuiltinToolsState>

export const ToggleBuiltinToolInput = z.object({
  tool: z.enum(["builtinBrowser", "browserBridge", "computerUse", "screenVisuals"]),
  enabled: z.boolean()
})
export type ToggleBuiltinToolInput = z.infer<typeof ToggleBuiltinToolInput>

export const OpenSystemPermissionInput = z.object({
  permission: z.enum(["accessibility", "screenCapture"])
})
export type OpenSystemPermissionInput = z.infer<typeof OpenSystemPermissionInput>
