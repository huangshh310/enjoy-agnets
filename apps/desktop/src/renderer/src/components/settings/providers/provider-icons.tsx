/**
 * 供应商与模型品牌图标组件：使用 @lobehub/icons 官方彩色/矢量组件。
 */
import {
  Anthropic,
  Antigravity,
  Baichuan,
  Claude,
  Cursor,
  DeepSeek,
  Doubao,
  Gemini,
  Grok,
  Groq,
  Hunyuan,
  Kimi,
  Minimax,
  Mistral,
  Ollama,
  OpenAI,
  OpenRouter,
  Perplexity,
  Qwen,
  SiliconCloud,
  Spark,
  Stepfun,
  Together,
  Wenxin,
  ZeroOne,
  Zhipu
} from "@lobehub/icons"
import { RiCloudLine, RiImageLine, RiMicLine, RiPlugLine, RiServerLine, RiVoiceprintLine } from "@remixicon/react"
import type { ApiStyle, ProviderKind } from "@enjoy-agents/providers/presets"

export function ProviderIcon({
  kind,
  name,
  apiStyle,
  size = 20,
  className
}: {
  kind?: ProviderKind | string
  name?: string
  apiStyle?: ApiStyle | string
  size?: number
  className?: string
}) {
  const normName = (name || "").toLowerCase().trim()

  // 优先根据明确的 preset kind 匹配
  if (kind && kind !== "custom") {
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
      case "doubao":
        return <Doubao.Color size={size} className={className} />
      case "wenxin":
        return <Wenxin.Color size={size} className={className} />
      case "hunyuan":
        return <Hunyuan.Color size={size} className={className} />
      case "stepfun":
        return <Stepfun size={size} className={className} />
      case "zeroone":
        return <ZeroOne.Color size={size} className={className} />
      case "baichuan":
        return <Baichuan.Color size={size} className={className} />
      case "spark":
        return <Spark.Color size={size} className={className} />
      case "xai":
        return <Grok size={size} className={className} />
      case "mistral":
        return <Mistral.Color size={size} className={className} />
      case "together":
        return <Together.Color size={size} className={className} />
      case "perplexity":
        return <Perplexity.Color size={size} className={className} />
      case "ollama":
        return <Ollama size={size} className={className} />
      case "fal":
      case "replicate":
        return <RiImageLine className={className} style={{ width: size, height: size }} />
      case "elevenlabs":
        return <RiVoiceprintLine className={className} style={{ width: size, height: size }} />
      case "deepgram":
        return <RiMicLine className={className} style={{ width: size, height: size }} />
      case "cohere":
        return <RiServerLine className={className} style={{ width: size, height: size }} />
      case "gateway":
        return <RiCloudLine className={className} style={{ width: size, height: size }} />
    }
  }

  // 若为 custom 或其他未识别 kind，根据名称特征智能推导
  if (normName.includes("grok") || normName.includes("xai")) {
    return <Grok size={size} className={className} />
  }
  if (normName.includes("deepseek")) {
    return <DeepSeek.Color size={size} className={className} />
  }
  if (normName.includes("openai") || normName.includes("chatgpt")) {
    return <OpenAI size={size} className={className} />
  }
  if (normName.includes("claude") || normName.includes("anthropic")) {
    return <Claude.Color size={size} className={className} />
  }
  if (normName.includes("gemini") || normName.includes("google")) {
    return <Gemini.Color size={size} className={className} />
  }
  if (normName.includes("doubao") || normName.includes("volcengine") || normName.includes("bytedance")) {
    return <Doubao.Color size={size} className={className} />
  }
  if (normName.includes("wenxin") || normName.includes("qianfan") || normName.includes("baidu") || normName.includes("ernie")) {
    return <Wenxin.Color size={size} className={className} />
  }
  if (normName.includes("hunyuan") || normName.includes("tencent")) {
    return <Hunyuan.Color size={size} className={className} />
  }
  if (normName.includes("stepfun") || normName.includes("step-")) {
    return <Stepfun size={size} className={className} />
  }
  if (normName.includes("zeroone") || normName.includes("01.ai") || normName.includes("lingyi") || normName.includes("yi-")) {
    return <ZeroOne.Color size={size} className={className} />
  }
  if (normName.includes("baichuan")) {
    return <Baichuan.Color size={size} className={className} />
  }
  if (normName.includes("spark") || normName.includes("xfyun") || normName.includes("iflytek") || normName.includes("讯飞")) {
    return <Spark.Color size={size} className={className} />
  }
  if (normName.includes("together")) {
    return <Together.Color size={size} className={className} />
  }
  if (normName.includes("qwen") || normName.includes("dashscope") || normName.includes("aliyun")) {
    return <Qwen.Color size={size} className={className} />
  }
  if (normName.includes("kimi") || normName.includes("moonshot")) {
    return <Kimi.Color size={size} className={className} />
  }
  if (normName.includes("openrouter")) {
    return <OpenRouter.Color size={size} className={className} />
  }
  if (normName.includes("silicon") || normName.includes("siliconflow")) {
    return <SiliconCloud.Color size={size} className={className} />
  }
  if (normName.includes("groq")) {
    return <Groq size={size} className={className} />
  }
  if (normName.includes("ollama")) {
    return <Ollama size={size} className={className} />
  }
  if (normName.includes("mistral")) {
    return <Mistral.Color size={size} className={className} />
  }
  if (normName.includes("perplexity") || normName.includes("sonar")) {
    return <Perplexity.Color size={size} className={className} />
  }
  if (normName.includes("zhipu") || normName.includes("glm")) {
    return <Zhipu.Color size={size} className={className} />
  }
  if (normName.includes("minimax")) {
    return <Minimax.Color size={size} className={className} />
  }

  if (kind === "custom") {
    return <RiServerLine className={className} style={{ width: size, height: size }} />
  }

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

/**
 * 根据模型 ID 精确匹配其 AI 品牌图标；如无法匹配则回退到供应商默认图标。
 */
export function ModelBrandIcon({
  modelId,
  providerKind,
  apiStyle,
  size = 18,
  className
}: {
  modelId?: string
  providerKind?: ProviderKind | string
  apiStyle?: ApiStyle | string
  size?: number
  className?: string
}) {
  const mid = (modelId || "").toLowerCase().trim()
  const slug = mid.includes("/") ? mid.slice(mid.lastIndexOf("/") + 1) : mid

  if (mid.includes("grok")) {
    return <Grok size={size} className={className} />
  }
  if (mid.includes("deepseek")) {
    return <DeepSeek.Color size={size} className={className} />
  }
  if (
    slug.startsWith("gpt-") ||
    slug.startsWith("o1") ||
    slug.startsWith("o3") ||
    slug.startsWith("o4") ||
    mid.includes("chatgpt") ||
    mid.includes("text-embedding")
  ) {
    return <OpenAI size={size} className={className} />
  }
  if (mid.includes("claude") || mid.includes("sonnet") || mid.includes("opus") || mid.includes("haiku")) {
    return <Claude.Color size={size} className={className} />
  }
  if (mid.includes("gemini")) {
    return <Gemini.Color size={size} className={className} />
  }
  if (mid.includes("doubao")) {
    return <Doubao.Color size={size} className={className} />
  }
  if (mid.includes("wenxin") || mid.includes("ernie")) {
    return <Wenxin.Color size={size} className={className} />
  }
  if (mid.includes("hunyuan")) {
    return <Hunyuan.Color size={size} className={className} />
  }
  if (mid.includes("stepfun") || slug.startsWith("step-") || slug.startsWith("step1") || slug.startsWith("step2")) {
    return <Stepfun size={size} className={className} />
  }
  if (mid.includes("zeroone") || slug.startsWith("yi-") || mid.includes("01-ai") || mid.includes("01.ai")) {
    return <ZeroOne.Color size={size} className={className} />
  }
  if (mid.includes("baichuan")) {
    return <Baichuan.Color size={size} className={className} />
  }
  if (mid.includes("spark") || mid.includes("xfyun") || slug.startsWith("generalv") || slug.includes("4.0ultra")) {
    return <Spark.Color size={size} className={className} />
  }
  if (mid.includes("together")) {
    return <Together.Color size={size} className={className} />
  }
  if (mid.includes("qwen")) {
    return <Qwen.Color size={size} className={className} />
  }
  if (mid.includes("kimi") || mid.includes("moonshot")) {
    return <Kimi.Color size={size} className={className} />
  }
  if (mid.includes("glm") || mid.includes("zhipu") || mid.includes("chatglm")) {
    return <Zhipu.Color size={size} className={className} />
  }
  if (mid.includes("minimax") || mid.includes("abab")) {
    return <Minimax.Color size={size} className={className} />
  }
  if (mid.includes("mistral") || mid.includes("codestral") || mid.includes("pixtral")) {
    return <Mistral.Color size={size} className={className} />
  }
  if (mid.includes("perplexity") || mid.includes("sonar")) {
    return <Perplexity.Color size={size} className={className} />
  }
  if (mid.includes("antigravity")) {
    return <Antigravity.Color size={size} className={className} />
  }
  if (mid.includes("cursor")) {
    return <Cursor size={size} className={className} />
  }
  if (mid.includes("custom") || mid.includes("自定义") || mid.includes("other") || mid === "__other__") {
    return <RiServerLine className={className} style={{ width: size, height: size }} />
  }

  return <ProviderIcon kind={providerKind} apiStyle={apiStyle} size={size} className={className} />
}
