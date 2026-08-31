/**
 * 消息复制：有正文先抄正文，没有再抄图；成功切成勾。
 */
import { useEffect, useRef, useState } from "react"
import { RiCheckLine, RiClipboardLine } from "@remixicon/react"
import { getIde, hasIde } from "@renderer/lib/ide"
import { useChatStore, type ThreadMessage } from "@renderer/stores/chat-store"
import { MessageAction } from "@/components/ai-elements/message"
import { firstImageAsset, textToCopy } from "./copy-turn"

export function CopyMessageButton({
  message,
  prompt,
  label = "Copy message"
}: {
  message: ThreadMessage
  prompt?: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <MessageAction
      tooltip={copied ? "Copied" : label}
      label={label}
      onClick={() => {
        void copyTurn(message, prompt).then((ok) => {
          if (!ok) return
          setCopied(true)
          window.clearTimeout(timer.current)
          timer.current = window.setTimeout(() => setCopied(false), 1600)
        })
      }}
    >
      {copied ? <RiCheckLine className="size-4" /> : <RiClipboardLine className="size-4" />}
    </MessageAction>
  )
}

async function copyTurn(message: ThreadMessage, prompt?: string) {
  const store = useChatStore.getState()
  try {
    const text = textToCopy(message, prompt)
    if (text) {
      await navigator.clipboard.writeText(text)
      store.setError(null)
      return true
    }
    if (await copyImageAsset(message)) return true
    store.setError("Nothing to copy from this message.")
    return false
  } catch (error) {
    store.setError(error instanceof Error ? error.message : String(error))
    return false
  }
}

async function copyImageAsset(message: ThreadMessage) {
  const asset = firstImageAsset(message)
  if (!asset || !hasIde() || typeof ClipboardItem === "undefined") return false
  const row = (await getIde().assets.read(asset.assetId)) as {
    bytesBase64?: string
    mediaType?: string
  }
  if (!row.bytesBase64) return false
  const mediaType = row.mediaType ?? asset.mediaType
  const bytes = Uint8Array.from(atob(row.bytesBase64), (char) => char.charCodeAt(0))
  const blob = new Blob([bytes], { type: mediaType })
  await navigator.clipboard.write([new ClipboardItem({ [mediaType]: blob })])
  useChatStore.getState().setError(null)
  return true
}
