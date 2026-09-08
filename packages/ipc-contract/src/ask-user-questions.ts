/**
 * Agent 向用户提问：步进选项 / 多选 / 其它 / 纯文本。
 * 工具名固定，审批停车后把答案写回 execute 结果。
 */
import { z } from "zod"

export const ASK_USER_QUESTIONS_TOOL = "ask_user_questions"

export const AskUserOptionSchema = z.union([
  z.string().min(1),
  z.object({
    id: z.string().optional(),
    title: z.string().min(1),
    description: z.string().optional()
  })
])

export const AskUserQuestionSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1),
  options: z.array(AskUserOptionSchema).max(9).optional(),
  multiSelect: z.boolean().optional(),
  allowOther: z.boolean().optional(),
  skippable: z.boolean().optional(),
  freeText: z.boolean().optional()
})

export const AskUserAnswerSchema = z.object({
  questionId: z.string(),
  selectedIds: z.array(z.string()),
  otherText: z.string().optional(),
  skipped: z.boolean().optional()
})

export const AskUserAnswersSchema = z.record(z.string(), AskUserAnswerSchema)

export const AskUserQuestionsInputSchema = z.object({
  questions: z.array(AskUserQuestionSchema).min(1).max(8)
})

export type AskUserOption = z.infer<typeof AskUserOptionSchema>
export type AskUserQuestion = z.infer<typeof AskUserQuestionSchema>
export type AskUserAnswer = z.infer<typeof AskUserAnswerSchema>
export type AskUserAnswers = z.infer<typeof AskUserAnswersSchema>

export type NormalizedAskOption = {
  id: string
  title: string
  description?: string
}

export type NormalizedAskQuestion = {
  id: string
  title: string
  options: NormalizedAskOption[]
  multiSelect: boolean
  allowOther: boolean
  skippable: boolean
  freeText: boolean
}

/** 从工具入参抽出规范化问题列表；先 Zod，再补稳定 id。 */
export function normalizeAskUserQuestions(raw: unknown): NormalizedAskQuestion[] {
  const list = questionsList(raw)
  const questions: NormalizedAskQuestion[] = []
  for (let index = 0; index < list.length && questions.length < 8; index++) {
    const parsed = AskUserQuestionSchema.safeParse(list[index])
    if (!parsed.success) continue
    const row = parsed.data
    questions.push({
      id: row.id?.trim() || `q-${index + 1}`,
      title: row.title.trim(),
      options: normalizeOptions(row.options),
      multiSelect: row.multiSelect === true,
      allowOther: row.allowOther === true,
      skippable: row.skippable !== false,
      freeText: row.freeText === true
    })
  }
  return questions
}

function questionsList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object" && "questions" in raw) {
    const questions = (raw as { questions?: unknown }).questions
    return Array.isArray(questions) ? questions : []
  }
  return []
}

function normalizeOptions(raw: AskUserQuestion["options"]): NormalizedAskOption[] {
  if (!raw) return []
  return raw.flatMap((item, index) => {
    if (typeof item === "string") {
      const title = item.trim()
      return title ? [{ id: `o-${index + 1}`, title }] : []
    }
    const title = item.title.trim()
    if (!title) return []
    const description = item.description?.trim()
    return [
      {
        id: item.id?.trim() || `o-${index + 1}`,
        title,
        ...(description ? { description } : {})
      }
    ]
  })
}
