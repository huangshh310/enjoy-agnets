/**
 * 列表优先用档案上的校验；缺字段时先看本轮发送记忆，再借默认路线快照。
 * 快照 profileId 对不上 prv_* 时，靠 resolveDefaultProviderId 对上正在用的档案。
 */
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import type { CredentialCheck } from "@enjoy-agents/ipc-contract/credential-check"
import { defaultProviderId } from "./default-provider-label"

export function providerCredentialCheck(
  profileId: string,
  stored: CredentialCheck | undefined,
  readiness: ChatReadiness | undefined,
  opts?: { defaultId?: string; remembered?: CredentialCheck }
): CredentialCheck | undefined {
  if (stored) return stored
  const defaultId = opts?.defaultId ?? defaultProviderId(readiness)
  if (defaultId !== profileId) return undefined
  return opts?.remembered ?? readiness?.credentialCheck
}
