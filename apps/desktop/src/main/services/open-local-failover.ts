/**
 * 多 Key 开流。SDK 的 result 要等 fullStream 开始拉才有值。
 * 泵在消费完流之后才读 result，所以用 getter，避免开流当时把 undefined 拷走。
 */
import type { OpenedCodingStream } from "./open-coding-stream-input"
import { streamWithKeyFailover } from "./provider-key-failover"

export function openFailoverStream(
  openWith: (apiKey: string) => Promise<unknown>,
  keys: readonly string[],
  abortSignal: AbortSignal,
  hostInject: OpenedCodingStream["hostInject"]
): OpenedCodingStream {
  const holder: { current?: unknown } = {}
  const stream = streamWithKeyFailover(keys, async (apiKey) => {
    const next = await openWith(apiKey)
    holder.current = next
    return fullStreamOf(next)
  }, abortSignal)
  return {
    stream,
    get result() {
      return holder.current
    },
    dispose: async () => undefined,
    hostInject
  }
}

function fullStreamOf(result: unknown): AsyncIterable<Record<string, unknown>> {
  const stream = (result as { fullStream?: AsyncIterable<Record<string, unknown>> }).fullStream
  if (!stream) throw new Error("Agent stream did not expose fullStream.")
  return stream
}
