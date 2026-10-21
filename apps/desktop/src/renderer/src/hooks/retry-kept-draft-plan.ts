/**
 * 白卡「再发一次」/「再试一次」怎么走（纯判定，便于测）。
 * jojo P2（#136 r4）：只重发**被留下的那一句**（字 + 它自己的附件），恰好一条；输入框里的新字 / 新图是下一条草稿，不动。
 * leo r5 MUST 1（fail closed）：那一句必须**原样**还在输入框里——作为整行（可多行，只容忍行首行尾空白），
 * 且它的附件 chip 一个不少；被改过（「看看这张图片吧」）、被并进别的句子（「继续之前先跑一下测试」）、
 * 图被删掉——都不重发，也绝不自动发输入框：按钮隐藏，卡上改说「内容还在输入框里，改好后点发送」。
 * leo r5 MUST 2：没有还稿快照（不是这次回滚还回来的）同样不给按钮。
 * jojo P2（E1 PR）：输入框必须**正好**是被留下的那一句——同样的字（只容忍行首行尾空白）、同一组图，一张不多一张不少。
 * 失败后又加了图 / 加了字（之前把它当「下一条草稿」）：点了会发出「原句 + 图 A」、图 B 留在框里，
 * 不是用户以为的那一发（jojo pr136r6-gate-16/20/21）。这时也隐藏按钮，卡上说「改好后点发送就行，不会自动发出。」。
 * - resend-kept：重发那一句（输入框里就只有它，发完清空）；
 * - retry-turn：用户句还在线程里（keptUserMessage），原地重跑，不碰输入框；
 * - none：不给按钮。
 */
export type RetryKeptDraftPlan = "resend-kept" | "retry-turn" | "none"

export type KeptForPlan = { text: string; assetIds: readonly string[] }

const lines = (text: string) => text.split(/\r?\n/)
const trimBlankEdges = (rows: string[]) => {
  let start = 0
  let end = rows.length
  while (start < end && !rows[start]!.trim()) start++
  while (end > start && !rows[end - 1]!.trim()) end--
  return rows.slice(start, end)
}

/**
 * 那一句是否原样整行留在输入框里；是则返回去掉它之后的输入框（下一条草稿，一个字不截），否则 null。
 * 只容忍每行行首 / 行尾空白（还稿合并、粘贴会带）；行内任何改动都算改过。
 */
export function composerWithoutKept(current: string, kept: string): string | null {
  const want = trimBlankEdges(lines(kept)).map((row) => row.trim())
  if (want.length === 0) return current
  const rows = lines(current)
  for (let at = 0; at + want.length <= rows.length; at++) {
    if (want.every((row, i) => rows[at + i]!.trim() === row)) {
      return trimBlankEdges([...rows.slice(0, at), ...rows.slice(at + want.length)]).join("\n")
    }
  }
  return null
}

export function retryKeptDraftPlan(input: {
  kept: KeptForPlan | null
  lastUserPending: boolean
  composer: string
  composerAssetIds: readonly string[]
}): RetryKeptDraftPlan {
  const kept = input.kept
  if (kept && (kept.text.trim() || kept.assetIds.length > 0)) {
    return composerEqualsKept(input.composer, input.composerAssetIds, kept) ? "resend-kept" : "none"
  }
  if (input.lastUserPending) return "retry-turn"
  return "none"
}

/** 输入框是不是正好就是被留下的那一句：字一样（行首行尾空白不算）、图是同一组（不多不少）。 */
export function composerEqualsKept(composer: string, composerAssetIds: readonly string[], kept: KeptForPlan): boolean {
  const have = new Set(composerAssetIds)
  const want = new Set(kept.assetIds)
  if (have.size !== want.size || [...want].some((id) => !have.has(id))) return false
  if (!kept.text.trim()) return !composer.trim()
  return composerWithoutKept(composer, kept.text) === ""
}
