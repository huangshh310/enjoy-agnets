/**
 * ACP doctor：PATH 找到二进制后再跑 initialize，确认现场能握手。
 */
import { homedir } from "node:os"
import {
  probeAcpInitialize,
  type AgentToolPreset,
  type ProbeResult
} from "@enjoy-agents/agent-harness"
import type { AgentToolDoctorResult, AgentToolId } from "@enjoy-agents/ipc-contract"

export async function doctorAcpHandshake(input: {
  id: AgentToolId
  preset: AgentToolPreset
  probe: ProbeResult
  binaryPath?: string
}): Promise<AgentToolDoctorResult> {
  const found = {
    id: input.id,
    ok: true,
    message: input.probe.version ?? "Found.",
    version: input.probe.version,
    path: input.probe.path
  }
  if (input.preset.transport !== "acp-host") return found
  const handshake = await probeAcpInitialize({
    id: String(input.id),
    cwd: homedir(),
    override: input.binaryPath ? { binaryPath: input.binaryPath } : undefined
  })
  const suffix = handshake.authRequired ? " (login required)" : ""
  return {
    ...found,
    ok: handshake.ok,
    message: handshake.ok
      ? `${found.message} ACP initialize ok${suffix}.`
      : `${found.message} ACP initialize failed: ${handshake.message}`
  }
}
