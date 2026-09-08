/**
 * 提问答案的纯函数：点选、跳过、能否提交。
 */
import { ASK_OTHER_ID } from "./constants.ts"
import type { AskUserAnswer, AskUserAnswers, AskUserQuestion } from "./ask-user.types"

/** 空答案骨架。 */
export function emptyAnswer(questionId: string): AskUserAnswer {
  return { questionId, selectedIds: [] }
}

/** 合并当前题的部分字段。 */
export function mergeAnswer(
  answers: AskUserAnswers,
  questionId: string,
  patch: Partial<AskUserAnswer>
): AskUserAnswers {
  const existing = answers[questionId] ?? emptyAnswer(questionId)
  return { ...answers, [questionId]: { ...existing, ...patch, questionId } }
}

/** 单选覆盖 / 多选切换一个选项。 */
export function toggleAnswer(
  answers: AskUserAnswers,
  question: AskUserQuestion,
  optionId: string
): AskUserAnswers {
  const existing = answers[question.id] ?? emptyAnswer(question.id)
  const selected = new Set(existing.selectedIds.filter((id) => id !== ASK_OTHER_ID))
  if (question.multiSelect) {
    if (selected.has(optionId)) selected.delete(optionId)
    else selected.add(optionId)
  } else {
    selected.clear()
    selected.add(optionId)
  }
  return mergeAnswer(answers, question.id, { selectedIds: [...selected], skipped: false })
}

/** 本题标为跳过。 */
export function skipAnswer(answers: AskUserAnswers, questionId: string): AskUserAnswers {
  return { ...answers, [questionId]: { questionId, selectedIds: [], skipped: true } }
}

/** 有选项、其它文本或纯文本即可提交。 */
export function canSubmitQuestion(question: AskUserQuestion, answer?: AskUserAnswer): boolean {
  const other = answer?.otherText?.trim() ?? ""
  if (question.freeText) return Boolean(other)
  return (answer?.selectedIds.length ?? 0) > 0 || Boolean(other)
}

/** 「其它」在数字键里的下标（0-based，等于选项个数）。 */
export function otherKeyIndex(question: AskUserQuestion): number | null {
  if (!(question.allowOther || question.freeText)) return null
  return question.freeText ? 0 : question.options.length
}
