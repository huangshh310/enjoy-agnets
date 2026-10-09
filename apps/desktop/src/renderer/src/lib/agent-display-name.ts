/**
 * P2 引擎显示名：人话在面，真名在悬停。空则回退品牌名，禁止「未命名」当身份。
 */

export const DISPLAY_NAME_MAX = 40

/** trim + 压空白 + 截断。空串表示回退品牌名。 */
export function normalizeDisplayName(raw: string | undefined | null): string {
  return (raw ?? "").replace(/\s+/g, " ").trim().slice(0, DISPLAY_NAME_MAX)
}

const BANNED_FACES = new Set(["未命名", "未命名助手", "untitled", "untitled agent", "untitled assistant"])

function isBannedFace(face: string): boolean {
  return BANNED_FACES.has(face.toLowerCase())
}

/** 有显示名用人话，否则品牌名。永不把「未命名」当身份。 */
export function resolveEngineFace(input: {
  displayName?: string | null
  brandLabel: string
}): string {
  const face = normalizeDisplayName(input.displayName)
  if (face && !isBannedFace(face)) return face
  return input.brandLabel.trim()
}

/** 悬停 / title：品牌 · 真名。换名不是换引擎。 */
export function engineTrueNameTitle(brandLabel: string, realNameWord: string): string {
  const brand = brandLabel.trim()
  const word = realNameWord.trim()
  if (!brand) return word
  if (!word) return brand
  return `${brand} · ${word}`
}

/** Inbox 主行：人话 · 会话题。缺段不硬拼。 */
export function inboxIdentityTitle(face: string, sessionTitle: string): string {
  const name = face.trim()
  const title = sessionTitle.trim()
  if (!title) return name
  if (!name) return title
  return `${name} · ${title}`
}

/** 写回 map：空则删键，避免把空白存成身份。 */
export function nextDisplayNameMap(
  current: Record<string, string> | undefined,
  runtimeId: string,
  raw: string
): Record<string, string> {
  const next = { ...current }
  const face = normalizeDisplayName(raw)
  if (face && !isBannedFace(face)) next[runtimeId] = face
  else delete next[runtimeId]
  return next
}
