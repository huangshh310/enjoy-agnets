/**
 * 钥匙串闸：只有明确 false 才预检黄条并禁保存。
 * 缺字段经合约 `.catch(true)` 不当不可用。写失败码另走红字。
 */
import { useState } from "react"
import { useChatReadiness } from "./use-chat-readiness"
import { secretWriteUi, type SecretWriteErrorCode } from "@renderer/lib/secret-write"

export function useSecretWriteGate() {
  const blocked = useChatReadiness().data?.secretStorageAvailable === false
  const [writeCode, setWriteCode] = useState<SecretWriteErrorCode | null>(null)
  const ui = secretWriteUi(blocked ? false : true, writeCode)
  return {
    blocked,
    writeCode,
    setWriteCode,
    preflight: ui.preflight,
    errorCode: ui.errorCode
  }
}
