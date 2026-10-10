/**
 * regenerate / edit / rewind：算出保留点之后 renderer 看见的尾巴。
 */
export function tailIdsAfterKeep(
  messages: ReadonlyArray<{ id: string }>,
  keepId: string
): string[] {
  const index = messages.findIndex((message) => message.id === keepId)
  if (index < 0) return []
  return messages.slice(index + 1).map((message) => message.id)
}

export function tailIdsFromInclusive(
  messages: ReadonlyArray<{ id: string }>,
  fromId: string
): string[] {
  const index = messages.findIndex((message) => message.id === fromId)
  if (index < 0) return []
  return messages.slice(index).map((message) => message.id)
}
