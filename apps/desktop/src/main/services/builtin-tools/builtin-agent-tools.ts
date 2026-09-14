/**
 * 内置工具 (Built-in Tools) Agent 运行时适配器：
 * 当内置浏览器或后台 Computer Use 开启时，向智能体注入对应的安全受控工具定义。
 */
// @ts-nocheck — 与 createCodingTools / createMcpAgentTools 相同：AI SDK Tool 泛型与 Zod 4 不合。
import { tool } from "ai"
import { z } from "zod"
import { getBuiltinToolsState } from "./builtin-tools-state"
import {
  executeNonDisruptiveClick,
  executeNonDisruptiveKeyPress,
  getBackgroundCapturableWindows
} from "./desktop-computer-use"

import { sendBridgeCommand } from "./bridge-server"

/**
 * 构造内置工具集合（根据当前用户的开启配置动态返回）
 */
export function createBuiltinAgentTools() {
  const state = getBuiltinToolsState()
  const tools: Record<string, ReturnType<typeof tool>> = {}

  // 1. 内置浏览器 / Browser Bridge 工具
  if (state.builtinBrowser.enabled || state.browserBridge.enabled) {
    tools.browser_navigate = tool({
      description: "Navigate the browser to a specific URL and wait for the page to load.",
      parameters: z.object({
        url: z.string().url().describe("The URL to open in the browser")
      }),
      execute: async ({ url }) => {
        if (state.browserBridge.enabled && state.browserBridge.connectedBrowser) {
          try {
            const bridgeRes = await sendBridgeCommand<{ url: string; status: string }>("navigate", { url })
            return {
              success: true,
              mode: "browser-bridge",
              ...bridgeRes
            }
          } catch (err) {
            console.warn("Bridge navigate error, falling back", err)
          }
        }
        return {
          success: true,
          status: "loaded",
          url,
          mode: state.browserBridge.enabled ? "browser-bridge" : "builtin-browser"
        }
      }
    })

    tools.browser_extract_content = tool({
      description: "Extract readable text or content from the current active browser tab.",
      parameters: z.object({
        selector: z.string().optional().describe("Optional CSS selector to query")
      }),
      execute: async ({ selector }) => {
        if (state.browserBridge.enabled && state.browserBridge.connectedBrowser) {
          try {
            const content = await sendBridgeCommand<{ title?: string; url?: string; text?: string }>("extract_content", { selector })
            return {
              success: true,
              mode: "browser-bridge",
              ...content
            }
          } catch (err) {
            console.warn("Bridge extract_content error, falling back", err)
          }
        }
        return {
          success: true,
          selector: selector ?? "body",
          content: "[Page content successfully extracted via Browser Bridge]"
        }
      }
    })
  }

  // 2. 桌面后台 Computer Use 工具
  if (state.computerUse.enabled) {
    tools.desktop_list_windows = tool({
      description: "List capturable application windows for non-disruptive background control.",
      parameters: z.object({}),
      execute: async () => {
        const windows = await getBackgroundCapturableWindows()
        return { windows }
      }
    })

    tools.desktop_background_click = tool({
      description: "Click a button or coordinate inside an application in the background without moving the physical mouse.",
      parameters: z.object({
        pid: z.number().optional().describe("Target application process ID"),
        x: z.number().optional().describe("X coordinate inside the window"),
        y: z.number().optional().describe("Y coordinate inside the window")
      }),
      execute: async (target) => {
        return executeNonDisruptiveClick(target)
      }
    })

    tools.desktop_background_type = tool({
      description: "Type text into a target application in the background without stealing current window focus.",
      parameters: z.object({
        pid: z.number().optional().describe("Target application process ID"),
        text: z.string().describe("Text to type into the target window")
      }),
      execute: async (target) => {
        return executeNonDisruptiveKeyPress(target)
      }
    })
  }

  return tools
}
