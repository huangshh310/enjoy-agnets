/**
 * 内置工具 (Built-in Tools) Agent 运行时适配器：
 * 当内置浏览器或后台 Computer Use 开启时，向智能体注入对应的安全受控工具定义。
 */
// @ts-nocheck — 与 createCodingTools / createMcpAgentTools 相同：AI SDK Tool 泛型与 Zod 4 不合。
import { isReadOnlyAgentMode } from "@enjoy-agents/agent-core"
import { tool } from "ai"
import { z } from "zod"
import type { AgentMode } from "@enjoy-agents/ipc-contract"
import { getBuiltinToolsState } from "./builtin-tools-state"
import { shouldRegisterDesktopControlTools } from "./desktop-tool-gate"
import { desktopControlTools } from "./computer-use/desktop-tools"

import { sendBridgeCommand } from "./bridge-server"

const BRIDGE_MISSING = "Browser Bridge is not connected."

/**
 * 构造内置工具集合（根据当前用户的开启配置动态返回）
 */
export function createBuiltinAgentTools(mode: AgentMode = "agent") {
  if (isReadOnlyAgentMode(mode)) return {}
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
        if (!(state.browserBridge.enabled && state.browserBridge.connectedBrowser)) {
          return { success: false, url, error: BRIDGE_MISSING }
        }
        try {
          const bridgeRes = await sendBridgeCommand<{ url: string; status: string }>("navigate", { url })
          return {
            success: true,
            mode: "browser-bridge",
            ...bridgeRes
          }
        } catch (err) {
          return {
            success: false,
            url,
            error: err instanceof Error ? err.message : BRIDGE_MISSING
          }
        }
      }
    })

    tools.browser_extract_content = tool({
      description: "Extract readable text or content from the current active browser tab.",
      parameters: z.object({
        selector: z.string().optional().describe("Optional CSS selector to query")
      }),
      execute: async ({ selector }) => {
        if (!(state.browserBridge.enabled && state.browserBridge.connectedBrowser)) {
          return { success: false, selector: selector ?? "body", error: BRIDGE_MISSING }
        }
        try {
          const content = await sendBridgeCommand<{ title?: string; url?: string; text?: string }>(
            "extract_content",
            { selector }
          )
          return {
            success: true,
            mode: "browser-bridge",
            ...content
          }
        } catch (err) {
          return {
            success: false,
            selector: selector ?? "body",
            error: err instanceof Error ? err.message : BRIDGE_MISSING
          }
        }
      }
    })
  }

  if (shouldRegisterDesktopControlTools(mode, state.computerUse.enabled)) {
    Object.assign(tools, desktopControlTools())
  }

  return tools
}
