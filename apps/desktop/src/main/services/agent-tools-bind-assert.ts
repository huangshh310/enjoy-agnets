/**
 * 绑定校验：协议必须对上。主机名警告留给抽屉，不要在 upsert 里把选择打回官方登录。
 */
import {
  composeBoundAgentModels,
  pickBoundModelId,
  providersCompatibleWith
} from "@enjoy-agents/ipc-contract"
import { readVault, resolvedStyle } from "./secrets-vault"

export async function assertAndClampBind(input: {
  id: string
  useCustomProvider?: boolean
  providerId?: string
  modelId?: string
}): Promise<{ modelId?: string }> {
  if (input.useCustomProvider !== true || !input.providerId) {
    return { modelId: input.modelId }
  }
  const vault = await readVault()
  const profile = vault.profiles.find((item) => item.id === input.providerId)
  if (!profile) throw new Error("That provider profile was not found.")
  if (!profile.enabled) throw new Error("Enable the provider before binding it.")
  const style = resolvedStyle(profile)
  if (!providersCompatibleWith(input.id, { ...profile, apiStyle: style })) {
    throw new Error("This provider protocol cannot bind to this CLI.")
  }
  const models = composeBoundAgentModels(profile.models)
  if (profile.models?.length && models.length === 0) {
    throw new Error("Enable at least one model on this provider.")
  }
  return { modelId: pickBoundModelId(input.modelId, models) ?? input.modelId }
}
