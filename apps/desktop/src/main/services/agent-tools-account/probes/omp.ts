/**
 * Oh My Pi：模型认 `omp models --json`；可登录认 `omp auth-broker list --json`；
 * 自定义只从 models.yml 抽 id，不读 apiKey。
 */
import type { InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { catalogFor } from "@enjoy-agents/agent-harness"
import { mergeOmpProviders, parseOmpAuthBrokerList } from "../parse-omp-auth"
import { parseOmpModels } from "../parse-cli-lines"
import { readOmpCustomProviderIds } from "../parse-omp-custom"
import { runSafeCli } from "../run-cli"

export async function probeOmp(
  command: string,
  cwd: string
): Promise<Omit<InspectAgentToolResult, "id">> {
  const [jsonRaw, listRaw, customIds] = await Promise.all([
    runSafeCli("omp", command, ["models", "--json"], { cwd }),
    runSafeCli("omp", command, ["auth-broker", "list", "--json"], { cwd }),
    readOmpCustomProviderIds()
  ])
  let inspected = jsonRaw ? parseOmpModels(jsonRaw) : []
  if (inspected.length === 0) {
    const textRaw = await runSafeCli("omp", command, ["models"], { cwd })
    inspected = textRaw ? parseOmpModels(textRaw) : []
  }
  const models = inspected.length ? inspected : [...(catalogFor("omp")?.models ?? [])]
  const providers = mergeOmpProviders(
    listRaw ? parseOmpAuthBrokerList(listRaw) : [],
    models,
    customIds
  )
  const signedIn = providers.filter((item) => item.loggedIn)
  return {
    authAccount: {
      loggedIn: signedIn.length > 0 || models.length > 0,
      authMethod: "omp auth-broker login <provider>",
      organization: "Oh My Pi",
      accountName: signedIn[0]?.label
    },
    models,
    providers
  }
}
