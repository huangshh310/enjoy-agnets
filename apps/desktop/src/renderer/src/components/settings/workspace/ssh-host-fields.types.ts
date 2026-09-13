/**
 * SSH 主机表单草稿。私钥内容与登录密码都不回填。
 */
import type { SshAuth, SshHost, SshHostSource, SshHostUpsertInput } from "@enjoy-agents/ipc-contract"

export type SshHostDraft = {
  id?: string
  alias: string
  host: string
  user: string
  port: string
  keyPath: string
  password: string
  /** 已保存过密码的主机，留空表示不改。 */
  passwordSaved?: boolean
  source?: SshHostSource
}

export function emptyHostDraft(): SshHostDraft {
  return { alias: "", host: "", user: "", port: "22", keyPath: "", password: "" }
}

export function hostToDraft(host: SshHost): SshHostDraft {
  return {
    id: host.id,
    alias: host.alias,
    host: host.host,
    user: host.user,
    port: String(host.port),
    keyPath: host.keyPath || "",
    password: "",
    passwordSaved: host.auth === "password",
    source: host.source
  }
}

export function draftToUpsert(draft: SshHostDraft): SshHostUpsertInput {
  const keyPath = draft.keyPath.trim()
  const password = draft.password.trim()
  const auth = resolveDraftAuth(keyPath, password, draft.passwordSaved)
  return {
    ...(draft.id ? { id: draft.id } : {}),
    alias: draft.alias.trim() || `${draft.user.trim()}@${draft.host.trim()}`,
    host: draft.host.trim(),
    user: draft.user.trim(),
    port: Number(draft.port) || 22,
    auth,
    ...(keyPath ? { keyPath } : {}),
    ...(password ? { password } : {}),
    ...(draft.source ? { source: draft.source } : {})
  }
}

function resolveDraftAuth(keyPath: string, password: string, passwordSaved?: boolean): SshAuth {
  if (keyPath) return "keypath"
  if (password || passwordSaved) return "password"
  return "agent"
}
