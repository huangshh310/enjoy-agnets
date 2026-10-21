/**
 * main 侧「可对话路线」快照缓存 + 推送。从 chat-readiness 拆出来、不拉引擎列表 / 档案等重模块：
 * 发送回写校验态（credential-send-outcome）要能立刻改缓存并推（jojo #169 P3），不必等整张重算。
 */
import { BrowserWindow } from "electron"
import type { ChatReadiness } from "@enjoy-agents/ipc-contract/chat-readiness"
import type { CredentialCheck } from "@enjoy-agents/ipc-contract/credential-check"
import { readinessWithCredentialCheck } from "./readiness-credential-patch.ts"

let cached: ChatReadiness | undefined

export function peekCachedChatReadiness(): ChatReadiness | undefined {
  return cached
}

export function rememberChatReadinessSnapshot(snapshot: ChatReadiness): ChatReadiness {
  cached = snapshot
  return snapshot
}

export function emitChatReadiness(snapshot: ChatReadiness): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (window.isDestroyed()) continue
    window.webContents.send("chat.readiness", snapshot)
  }
}

/**
 * 发送回写了档案校验态：在缓存快照上只改这一项、立刻推。没算过快照就不推，等整张重算。
 * 401 之后整张重算要列引擎、ping 本机模型（各 400ms），那段空窗里渲染端还当密钥正常。
 */
export function pushCredentialCheckNow(profileId: string, check: CredentialCheck): void {
  if (!cached) return
  const next = readinessWithCredentialCheck(cached, profileId, check)
  if (next === cached) return
  cached = next
  emitChatReadiness(next)
}

/** 测试用：放一张缓存快照。 */
export function setCachedChatReadinessForTest(snapshot: ChatReadiness | undefined): void {
  cached = snapshot
}
