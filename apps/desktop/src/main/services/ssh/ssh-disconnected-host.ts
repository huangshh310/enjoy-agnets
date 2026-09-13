/**
 * 未接通 / 已断开的 SSH host：拒绝 IO，不列本机目录冒充远端。
 */
import type { AgentWorkspaceHost } from "@enjoy-agents/agent-core"
import { disconnectedError, notReadyError } from "./ssh-errors.ts"
import type { SshStatus } from "./ssh.types.ts"

export function createDisconnectedHost(status: SshStatus = "disconnected"): AgentWorkspaceHost {
  const fail = () => {
    throw status === "disconnected" || status === "failed" || status === "idle"
      ? disconnectedError("io")
      : notReadyError(status)
  }
  return {
    readFile: async () => fail(),
    writeFile: async () => fail(),
    editFile: async () => fail(),
    listDir: async () => fail(),
    glob: async () => fail(),
    grep: async () => fail(),
    bash: async () => fail(),
    gitStatus: async () => fail(),
    gitDiff: async () => fail(),
    gitLog: async () => fail(),
    gitCommit: async () => fail(),
    gitPush: async () => fail(),
    gitBranch: async () => fail()
  }
}
