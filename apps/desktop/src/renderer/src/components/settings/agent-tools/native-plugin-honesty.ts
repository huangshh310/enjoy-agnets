/**
 * 智能体抽屉宿主扩展诚实态：已启用计数或引擎不支持，禁止绿灯「已就绪」。
 */
import { capabilitiesFor } from "@enjoy-agents/ipc-contract/runtime-capabilities"

export type NativePluginHonesty =
  | { kind: "unsupported"; mcp: boolean; skills: boolean; mcpCount: number; skillCount: number }
  | { kind: "enabled"; mcpCount: number; skillCount: number }

export function nativePluginHonesty(input: {
  runtimeId: string
  trustedMcp: number
  skillCount: number
}): NativePluginHonesty {
  const cap = capabilitiesFor(input.runtimeId)
  const mcpUnsupported = cap.hostMcp === "none" && input.trustedMcp > 0
  const skillsUnsupported = cap.hostSkills === "none" && input.skillCount > 0
  if (mcpUnsupported || skillsUnsupported) {
    return {
      kind: "unsupported",
      mcp: mcpUnsupported,
      skills: skillsUnsupported,
      mcpCount: input.trustedMcp,
      skillCount: input.skillCount
    }
  }
  return { kind: "enabled", mcpCount: input.trustedMcp, skillCount: input.skillCount }
}
