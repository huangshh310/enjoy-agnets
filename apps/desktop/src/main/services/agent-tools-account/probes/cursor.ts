/**
 * Cursor：账号来自官方 status/about；用量只认 Dashboard includedSpend/limit。
 */
import type { InspectAgentToolResult } from "@enjoy-agents/ipc-contract"
import { catalogFor } from "@enjoy-agents/agent-harness"
import { mergeCursorAbout, parseCursorModels, parseCursorStatus } from "../parse"
import { runSafeCli } from "../run-cli"
import { readCursorOfficialQuota } from "../session-usage"
import { officialOrEmpty } from "./shared"

export async function probeCursor(
  command: string,
  cwd: string
): Promise<Omit<InspectAgentToolResult, "id">> {
  const [statusRaw, aboutRaw, modelsRaw, official] = await Promise.all([
    runSafeCli("cursor", command, ["status", "--format", "json"], { cwd }),
    runSafeCli("cursor", command, ["about", "--format", "json"], { cwd }),
    runSafeCli("cursor", command, ["models"], { cwd }),
    readCursorOfficialQuota()
  ])
  const fromStatus = statusRaw ? parseCursorStatus(statusRaw) : undefined
  const authAccount = mergeCursorAuth(fromStatus, aboutRaw)
  const models = modelsRaw ? parseCursorModels(modelsRaw) : [...(catalogFor("cursor")?.models ?? [])]
  return {
    authAccount,
    quotaInfo: officialOrEmpty(
      Boolean(authAccount?.loggedIn),
      official,
      authAccount?.tier ?? "Cursor",
      authAccount?.currentModel
    ),
    models
  }
}

function mergeCursorAuth(
  fromStatus: ReturnType<typeof parseCursorStatus>,
  aboutRaw: string | null
) {
  if (aboutRaw && fromStatus) return mergeCursorAbout(fromStatus, aboutRaw)
  if (aboutRaw) {
    return mergeCursorAbout(
      { loggedIn: false, authMethod: "agent login", organization: "Cursor" },
      aboutRaw
    )
  }
  return fromStatus
}
