/**
 * stub「本轮账本」夹具数据。不碰 db，给 node:test 和 bootstrap 共用。
 */
import type { ThreadToolCall } from "@enjoy-agents/ipc-contract"

export const E2E_LEDGER_SESSION_TITLE = "本轮账本"

const LONG_TSC =
  "pnpm exec tsc --pretty false --noEmit --incremental false --project apps/desktop/tsconfig.web.json"
const LONG_LINT =
  "pnpm lint --max-warnings=0 --report-unused-disable-directives --format stylish"
const LONG_TEST =
  "pnpm --filter @enjoy-agents/desktop test --test-name-pattern=run-ledger-truncation-at-1100px"

export function shouldSeedE2eLedger(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (env.ENJOY_E2E_STUB !== "1") return false
  return env.ENJOY_E2E_LEDGER === "1" || env.ENJOY_DEV_SEED_AUTO_P2 === "1"
}

export function ledgerFixtureTools(): ThreadToolCall[] {
  return [
    {
      id: "ledger_bash_tsc",
      name: "bash",
      state: "output-available",
      args: { command: LONG_TSC },
      result: { stdout: "tsc ok" }
    },
    {
      id: "ledger_bash_lint",
      name: "bash",
      state: "output-available",
      args: { command: `${LONG_TSC} && ${LONG_LINT}` },
      result: { stdout: "lint ok" }
    },
    {
      id: "ledger_bash_test",
      name: "bash",
      state: "output-error",
      errorText: "exit 1",
      args: { command: LONG_TEST },
      result: { exitCode: 1, stderr: "failed" }
    },
    {
      id: "ledger_read_rail",
      name: "read_file",
      state: "output-available",
      args: {
        path: "apps/desktop/src/renderer/src/components/ai-chat/run-ledger/run-ledger-rail.tsx"
      }
    },
    {
      id: "ledger_edit_row",
      name: "edit_file",
      state: "output-available",
      args: {
        path: "apps/desktop/src/renderer/src/components/ai-chat/run-ledger/run-ledger-row.tsx"
      }
    }
  ]
}
