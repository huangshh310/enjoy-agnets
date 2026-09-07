/**
 * 助手轮末尾的静态引导词。只在用户点击后分流，禁止超时自动发送。
 */
import { z } from "zod"
import { QuotedContext } from "./quoted-context.ts"

export const ActionChipType = z.enum(["queue", "fill_input"])
export type ActionChipType = z.infer<typeof ActionChipType>

export const ActionChip = z.object({
  id: z.string(),
  label: z.string().min(1),
  prompt: z.string().min(1),
  actionType: ActionChipType,
  referencedContext: z.array(QuotedContext).optional()
})
export type ActionChip = z.infer<typeof ActionChip>

const FENCE = /(?:^|\n):::enjoy-actions\n([\s\S]*?)\n:::(?:\n|$)/
const LINE = /^-?\s*\[(queue|fill_input|fill)\]\s+(.+)$/i
const CHIP_MAX = 4

/** 从正文里抽出引导词块；没有块则返回空数组。 */
export function parseEnjoyActionsBlock(text: string): ActionChip[] {
  const match = text.match(FENCE)
  if (!match?.[1]) return []
  const chips: ActionChip[] = []
  for (const raw of match[1].split("\n")) {
    const chip = parseActionLine(raw.trim(), chips.length)
    if (!chip) continue
    chips.push(chip)
    if (chips.length >= CHIP_MAX) break
  }
  return chips
}

/** 去掉引导词围栏，避免把协议原文渲染进气泡。 */
export function stripEnjoyActionsBlock(text: string): string {
  return text.replace(FENCE, (match) => (text.startsWith(match) ? "" : "\n")).trimEnd()
}

/** 已有 chips 优先；否则从正文解析，并始终剥掉围栏。 */
export function takeActionChips(
  content: string,
  existing?: ActionChip[]
): { content: string; chips: ActionChip[] } {
  const parsed = parseEnjoyActionsBlock(content)
  const chips = existing && existing.length > 0 ? existing : parsed
  return { content: stripEnjoyActionsBlock(content), chips }
}

function parseActionLine(line: string, index: number): ActionChip | null {
  const match = line.match(LINE)
  if (!match?.[1] || !match[2]) return null
  const actionType: ActionChipType = match[1].toLowerCase() === "queue" ? "queue" : "fill_input"
  const rest = match[2].trim()
  const colon = rest.indexOf(":")
  const label = (colon >= 0 ? rest.slice(0, colon) : rest).trim()
  const prompt = (colon >= 0 ? rest.slice(colon + 1) : rest).trim()
  if (!label || !prompt) return null
  return { id: `chip_${index}`, label, prompt, actionType }
}
