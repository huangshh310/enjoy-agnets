// @ts-nocheck — 与 createCodingTools 相同：Zod 4 + AI SDK Tool 泛型。
/**
 * 向用户提问并停车：答案在审批放行后从 host.takeQuestionAnswers 取出。
 */
import { tool } from "ai"
import {
  AskUserQuestionsInputSchema,
  normalizeAskUserQuestions
} from "@enjoy-agents/ipc-contract"
import type { AgentWorkspaceHost } from "../runtime-context"
import { ASK_USER_QUESTIONS_TOOL } from "./ask-user-questions-name.ts"

export function createAskUserQuestionsTool(host: AgentWorkspaceHost) {
  return {
    [ASK_USER_QUESTIONS_TOOL]: tool({
      description:
        "Ask the user one or more multiple-choice questions before continuing. Use in Plan mode when a product or architecture choice is blocking. Do not guess. 2–5 options per question.",
      inputSchema: AskUserQuestionsInputSchema,
      execute: async (input) => {
        const questions = normalizeAskUserQuestions(input)
        if (questions.length === 0) {
          throw new Error("ASK_USER_QUESTIONS_EMPTY")
        }
        const answers = host.takeQuestionAnswers?.() ?? {}
        return { questions, answers }
      }
    })
  }
}
