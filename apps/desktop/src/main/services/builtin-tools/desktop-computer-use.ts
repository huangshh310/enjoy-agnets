/**
 * macOS 后台非干扰 Computer Use 引擎：
 * 通过 Accessibility API (AXUIElement) 与 Process-targeted 事件分发，
 * 实现真正的后台静默控制，绝不劫持用户物理鼠标或打断前台操作。
 */
import { app, desktopCapturer } from "electron"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import path from "node:path"
import fs from "node:fs"
import { checkDesktopPermissions } from "./builtin-tools-state"
import { triggerScreenAction } from "./screen-overlay-service"

const execFileAsync = promisify(execFile)

function getHelperBinaryPath(): string | null {
  const candidates = [
    path.join(app.getAppPath(), "resources/bin/mac-event-poster"),
    path.join(process.cwd(), "apps/desktop/resources/bin/mac-event-poster"),
    path.resolve(__dirname, "../../resources/bin/mac-event-poster")
  ]
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c
    } catch {
      // ignore
    }
  }
  return null
}

export interface BackgroundTargetApp {
  pid: number
  name: string
  bundleId?: string
}

export interface BackgroundActionResult {
  success: boolean
  error?: string
}

/**
 * 检查当前机器是否具备后台 Computer Use 所需的系统权限
 */
export function canExecuteBackgroundComputerUse(): {
  ready: boolean
  missingPermissions: Array<"accessibility" | "screenCapture">
} {
  const perms = checkDesktopPermissions()
  const missing: Array<"accessibility" | "screenCapture"> = []
  if (!perms.accessibility) missing.push("accessibility")
  if (!perms.screenCapture) missing.push("screenCapture")
  return {
    ready: missing.length === 0,
    missingPermissions: missing
  }
}

/**
 * 获取用于后台操作的可用窗口列表（基于 Electron desktopCapturer 与 ScreenCaptureKit 契约）
 */
export async function getBackgroundCapturableWindows(): Promise<Array<{
  id: string
  name: string
  appPid?: number
}>> {
  const perms = checkDesktopPermissions()
  if (!perms.screenCapture) {
    throw new Error("Screen capture permission not granted. Background window capture is unavailable.")
  }

  try {
    triggerScreenAction({ action: "observe", text: "正在感知与枚举桌面窗口..." })
    const sources = await desktopCapturer.getSources({
      types: ["window"],
      thumbnailSize: { width: 1, height: 1 }
    })

    return sources.map((source) => ({
      id: source.id,
      name: source.name,
      appPid: source.appIcon ? undefined : undefined
    }))
  } catch (err) {
    console.error("Failed to list capturable windows", err)
    return []
  }
}

/**
 * 后台点击指定应用的坐标或指定控件：
 * 采用目标进程消息队列注入或 AXUIElement 动作，避免移动用户屏幕上的硬件光标。
 */
export async function executeNonDisruptiveClick(
  target: { pid?: number; windowId?: string; x?: number; y?: number }
): Promise<BackgroundActionResult> {
  const check = canExecuteBackgroundComputerUse()
  if (!check.ready) {
    return {
      success: false,
      error: `Missing required system permissions: ${check.missingPermissions.join(", ")}`
    }
  }

  try {
    if (process.platform !== "darwin") {
      return { success: false, error: "Non-disruptive background control is currently optimized for macOS" }
    }

    if (target.pid && target.x !== undefined && target.y !== undefined) {
      triggerScreenAction({
        action: "click",
        x: target.x,
        y: target.y,
        targetName: `PID ${target.pid}`
      })
      const binary = getHelperBinaryPath()
      if (!binary) {
        return { success: false, error: "Background click helper is not available." }
      }
      await execFileAsync(binary, ["click", String(target.pid), String(target.x), String(target.y)])
      return { success: true }
    }

    return { success: false, error: "Background click needs a target pid and coordinates." }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}

/**
 * 后台按键/文本输入：
 * 直接投递至目标进程焦点，不影响当前前台活动窗口。
 */
export async function executeNonDisruptiveKeyPress(
  target: { pid?: number; text?: string; key?: string }
): Promise<BackgroundActionResult> {
  const check = canExecuteBackgroundComputerUse()
  if (!check.ready) {
    return {
      success: false,
      error: `Missing required system permissions: ${check.missingPermissions.join(", ")}`
    }
  }

  try {
    if (process.platform !== "darwin") {
      return { success: false, error: "Non-disruptive background control is currently optimized for macOS" }
    }

    if (target.pid && target.text) {
      triggerScreenAction({
        action: "type",
        text: target.text,
        targetName: `PID ${target.pid}`
      })
      const binary = getHelperBinaryPath()
      if (!binary) {
        return { success: false, error: "Background type helper is not available." }
      }
      await execFileAsync(binary, ["type", String(target.pid), target.text])
      return { success: true }
    }

    return { success: false, error: "Background type needs a target pid and text." }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }
  }
}
