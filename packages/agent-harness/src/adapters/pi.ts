/**
 * Pi 宿主运行时。默认 just-bash，不强制 Vercel。
 */
import { HarnessAgent } from "@ai-sdk/harness/agent"
import { createPi } from "@ai-sdk/harness-pi"
import { createAdapterSandbox } from "../sandbox-for.ts"
import { resolveHarnessAdapter } from "../catalog.ts"
import { sharedHarnessSettings } from "./shared.ts"
import type { CreateHarnessCodingAgentInput } from "../types.ts"

export function createPiAgent(input: CreateHarnessCodingAgentInput) {
  const adapter = resolveHarnessAdapter("pi", input.providerKind)
  if (!adapter) throw new Error("Pi adapter is missing from the catalog.")
  const key = input.credentials.providerApiKey.trim()
  return new HarnessAgent({
    harness: createPi(key ? { auth: { OPENAI_API_KEY: key, ANTHROPIC_API_KEY: key } } : {}),
    sandbox: createAdapterSandbox(adapter, input),
    id: "enjoy-agents-pi",
    ...sharedHarnessSettings(input, ["write", "edit", "bash"]),
    ...(input.model ? { model: input.model } : {})
  })
}
