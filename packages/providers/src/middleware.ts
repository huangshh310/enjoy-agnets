/**
 * wrapLanguageModel：默认指令 / 温度 / maxTokens 只在 main 注入。
 * 密钥不得进入 prompt。
 */
import {
  defaultInstructionsMiddleware,
  defaultSettingsMiddleware,
  wrapLanguageModel,
  type LanguageModel,
  type LanguageModelMiddleware
} from "ai"

export type MiddlewareDefaults = {
  instructions?: string
  temperature?: number
  maxTokens?: number
}

export function mergeModelSettings(
  defaults: MiddlewareDefaults,
  override: MiddlewareDefaults
): MiddlewareDefaults {
  return {
    instructions: override.instructions ?? defaults.instructions,
    temperature: override.temperature ?? defaults.temperature,
    maxTokens: override.maxTokens ?? defaults.maxTokens
  }
}

/** 套上 SDK 中间件；无默认值时原样返回，避免空 wrap。 */
export function wrapWithDefaults(model: LanguageModel, defaults: MiddlewareDefaults): LanguageModel {
  const middleware = middlewaresFor(defaults)
  if (middleware.length === 0) return model
  return wrapLanguageModel({ model: model as never, middleware }) as LanguageModel
}

function middlewaresFor(defaults: MiddlewareDefaults) {
  const list: LanguageModelMiddleware[] = []
  if (defaults.instructions?.trim()) {
    list.push(defaultInstructionsMiddleware({ instructions: defaults.instructions.trim() }))
  }
  if (defaults.temperature != null || defaults.maxTokens != null) {
    list.push(
      defaultSettingsMiddleware({
        settings: {
          temperature: defaults.temperature,
          maxOutputTokens: defaults.maxTokens
        }
      })
    )
  }
  return list
}
