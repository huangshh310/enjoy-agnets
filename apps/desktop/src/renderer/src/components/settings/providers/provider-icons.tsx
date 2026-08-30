/**
 * 供应商与模型品牌图标组件：使用 @lobehub/icons 官方彩色/矢量组件。
 */
import {
  Anthropic,
  Claude,
  DeepSeek,
  Gemini,
  Groq,
  Kimi,
  Minimax,
  Ollama,
  OpenAI,
  OpenRouter,
  Qwen,
  SiliconCloud,
  Zhipu
} from "@lobehub/icons"
import { RiPlugLine, RiServerLine } from "@remixicon/react"
import type { ApiStyle, ProviderKind } from "@enjoy-agents/providers/presets"

export function ProviderIcon({
  kind,
  apiStyle,
  size = 20,
  className
}: {
  kind?: ProviderKind | string
  apiStyle?: ApiStyle | string
  size?: number
  className?: string
}) {
  switch (kind) {
    case "deepseek":
      return <DeepSeek.Color size={size} className={className} />
    case "openai":
      return <OpenAI size={size} className={className} />
    case "anthropic":
      return <Claude.Color size={size} className={className} />
    case "openrouter":
      return <OpenRouter.Color size={size} className={className} />
    case "google":
      return <Gemini.Color size={size} className={className} />
    case "kimi":
      return <Kimi.Color size={size} className={className} />
    case "zhipu":
      return <Zhipu.Color size={size} className={className} />
    case "qwen":
      return <Qwen.Color size={size} className={className} />
    case "groq":
      return <Groq size={size} className={className} />
    case "siliconflow":
      return <SiliconCloud.Color size={size} className={className} />
    case "minimax":
      return <Minimax.Color size={size} className={className} />
    case "ollama":
      return <Ollama size={size} className={className} />
    case "custom":
      return <RiServerLine className={className} style={{ width: size, height: size }} />
    default:
      if (apiStyle === "anthropic") {
        return <Anthropic size={size} className={className} />
      }
      if (apiStyle === "openai-responses") {
        return <RiServerLine className={className} style={{ width: size, height: size }} />
      }
      if (apiStyle === "openai") {
        return <OpenAI size={size} className={className} />
      }
      return <RiPlugLine className={className} style={{ width: size, height: size }} />
  }
}
