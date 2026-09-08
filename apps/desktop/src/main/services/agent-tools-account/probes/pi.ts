/**
 * Pi：ACP 入口是 pi-acp，模型表走官方 `pi --list-models`。
 */
import type { InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { catalogFor, lookupOnPath } from "@enjoy-agents/agent-harness"
import { parseProviderModelLines } from "../parse-cli-lines"
import { runSafeCli } from "../run-cli"

export async function probePi(
  _command: string,
  cwd: string
): Promise<Omit<InspectAgentToolResult, "id">> {
  const pi = await lookupOnPath("pi")
  const raw = pi ? await runSafeCli("pi", pi, ["--list-models"], { cwd }) : null
  const inspected = raw ? parseProviderModelLines(raw) : []
  return {
    authAccount: {
      loggedIn: Boolean(pi),
      authMethod: "Pi /login or API keys",
      organization: "Pi"
    },
    models: inspected.length ? inspected : [...(catalogFor("pi")?.models ?? [])]
  }
}
