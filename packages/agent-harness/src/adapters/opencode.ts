/**
 * OpenCode 桥接适配器。模型配置走 OpenCode 自己的目录。
 */
import { HarnessAgent } from "@ai-sdk/harness/agent"
import { createOpenCode } from "@ai-sdk/harness-opencode"
import { createAdapterSandbox } from "../sandbox-for.ts"
import { resolveHarnessAdapter } from "../catalog.ts"
import { sharedHarnessSettings } from "./shared.ts"
import type { CreateHarnessCodingAgentInput } from "../types.ts"

export function createOpenCodeAgent(input: CreateHarnessCodingAgentInput) {
  const adapter = resolveHarnessAdapter("opencode", input.providerKind)
  if (!adapter) throw new Error("OpenCode adapter is missing from the catalog.")
  const key = input.credentials.providerApiKey.trim()
  return new HarnessAgent({
    // OpenCode 1.0.95 钉 provider-utils 5.0.33，与 harness 1.0.94 的 5.0.34 Schema 品牌不兼容，运行时同形。
    harness: createOpenCode(
      key ? { auth: { OPENAI_API_KEY: key, ANTHROPIC_API_KEY: key } } : {}
    ) as never,
    sandbox: createAdapterSandbox(adapter, input),
    id: "enjoy-agents-opencode",
    ...sharedHarnessSettings(input),
    ...(input.model ? { model: input.model } : {})
  })
}
