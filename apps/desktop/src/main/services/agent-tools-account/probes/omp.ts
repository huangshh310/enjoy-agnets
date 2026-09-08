/**
 * Oh My Pi：模型认 `omp models`。登录走 ACP authenticate，这里只报是否找到 CLI。
 */
import type { InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { catalogFor } from "@enjoy-agents/agent-harness"
import { parseProviderModelLines } from "../parse-cli-lines"
import { runSafeCli } from "../run-cli"

export async function probeOmp(
  command: string,
  cwd: string
): Promise<Omit<InspectAgentToolResult, "id">> {
  const raw = await runSafeCli("omp", command, ["models"], { cwd })
  const inspected = raw ? parseProviderModelLines(raw) : []
  return {
    authAccount: {
      loggedIn: Boolean(raw),
      authMethod: "ACP authenticate or /login",
      organization: "Oh My Pi"
    },
    models: inspected.length ? inspected : [...(catalogFor("omp")?.models ?? [])]
  }
}
