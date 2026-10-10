/**
 * stub 种一条带工具的「本轮账本」会话。默认空会话没有账本芯片。
 * 只在 ENJOY_E2E_LEDGER=1 或 AUTO-P2 复检入口打开；默认 SESSION_COUNT=1 不种。
 */
import { serializeAssistantPayload } from "@enjoy-agents/ipc-contract"
import { persistMessage } from "./persist-session"
import { createSession } from "./session-queries"
import { E2E_LEDGER_SESSION_TITLE, ledgerFixtureTools } from "./e2e-stub-ledger-data"

export {
  E2E_LEDGER_SESSION_TITLE,
  ledgerFixtureTools,
  shouldSeedE2eLedger
} from "./e2e-stub-ledger-data"

export async function seedE2eLedgerSession(workspaceId: string): Promise<void> {
  const session = await createSession(workspaceId, E2E_LEDGER_SESSION_TITLE)
  persistMessage(session.id, "user", "跑一遍类型检查和 lint，并把账本在窄顶栏的截断列出来。")
  persistMessage(
    session.id,
    "assistant",
    serializeAssistantPayload({
      content: "已经跑过几条长命令，点顶栏「本轮账本」看截断。",
      tools: ledgerFixtureTools()
    })
  )
}
