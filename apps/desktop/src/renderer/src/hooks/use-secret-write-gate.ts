/**
 * 钥匙串闸：只有明确 false 才挡保存；缺字段表示 kai 的合约还没到。
 */
import { useState } from "react"
import { useChatReadiness } from "./use-chat-readiness"
import type { SecretWriteErrorCode } from "@renderer/lib/secret-write"

export function useSecretWriteGate() {
  const blocked = useChatReadiness().data?.secretStorageAvailable === false
  const [writeCode, setWriteCode] = useState<SecretWriteErrorCode | null>(null)
  return {
    blocked,
    writeCode,
    setWriteCode,
    noticeCode: (blocked ? "KEYCHAIN_UNAVAILABLE" : writeCode) as SecretWriteErrorCode | null
  }
}
