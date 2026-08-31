/**
 * Codex 桥接适配器。OpenAI / CODEX key 来自 Providers。
 */
import { HarnessAgent } from "@ai-sdk/harness/agent"
import { createCodex } from "@ai-sdk/harness-codex"
import { createAdapterSandbox } from "../sandbox-for.ts"
import { resolveHarnessAdapter } from "../catalog.ts"
import { requireProviderKey, sharedHarnessSettings } from "./shared.ts"
import type { CreateHarnessCodingAgentInput } from "../types.ts"

export function createCodexAgent(input: CreateHarnessCodingAgentInput) {
  const adapter = resolveHarnessAdapter("codex", input.providerKind)
  if (!adapter) throw new Error("Codex adapter is missing from the catalog.")
  const key = requireProviderKey(input, "OpenAI")
  return new HarnessAgent({
    harness: createCodex({
      auth: { OPENAI_API_KEY: key, CODEX_API_KEY: key }
    }),
    sandbox: createAdapterSandbox(adapter, input),
    id: "enjoy-agents-codex",
    ...sharedHarnessSettings(input, ["bash"]),
    ...(input.model ? { model: input.model } : {})
  })
}
