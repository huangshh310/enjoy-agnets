import { type ApiStyle } from "./api-styles"
import { MEDIA_PROVIDER_PRESETS } from "./presets-media"

export { isMediaNativeKind, isMediaOnlyKind } from "./presets-media"

export { API_STYLES, API_STYLE_OPTIONS, apiStyleLabel, isApiStyle, type ApiStyle } from "./api-styles"

export const PROVIDER_KINDS = [
  "deepseek",
  "openai",
  "anthropic",
  "openrouter",
  "ollama",
  "google",
  "kimi",
  "zhipu",
  "qwen",
  "groq",
  "siliconflow",
  "minimax",
  "doubao",
  "wenxin",
  "hunyuan",
  "stepfun",
  "zeroone",
  "baichuan",
  "spark",
  "xai",
  "mistral",
  "together",
  "perplexity",
  "custom",
  "fal",
  "replicate",
  "elevenlabs",
  "deepgram",
  "cohere",
  "gateway"
] as const

export type ProviderKind = (typeof PROVIDER_KINDS)[number]

export function parseProviderKind(value: string): ProviderKind {
  if ((PROVIDER_KINDS as readonly string[]).includes(value)) return value as ProviderKind
  throw new Error("Unknown provider kind.")
}

export type CatalogModel = {
  id: string
  label: string
  /** 该模型自称的上下文窗口（token）；探测 / Gateway 写入，不要按 id 猜 */
  contextWindow?: number
  /** 最大输出 token，目录有则带上 */
  maxOutputTokens?: number
}

export type ProviderPreset = {
  kind: ProviderKind
  name: string
  description: string
  defaultBaseURL: string
  /** 默认/首选接入协议 */
  apiStyle: ApiStyle
  /** 该供应商官方或常见支持的协议列表（如 DeepSeek 同时支持 openai 与 anthropic；OpenAI 支持 openai 与 openai-responses） */
  supportedApiStyles?: readonly ApiStyle[]
  /** 针对特定协议的专属 Base URL（例如 deepseek + anthropic -> "https://api.deepseek.com/anthropic"） */
  baseURLForStyle?: Partial<Record<ApiStyle, string>>
  requiresKey: boolean
  docsURL?: string
  models: CatalogModel[]
}

export function supportedApiStylesFor(preset: ProviderPreset): readonly ApiStyle[] {
  if (preset.supportedApiStyles && preset.supportedApiStyles.length > 0) {
    return preset.supportedApiStyles
  }
  return [preset.apiStyle]
}

export function defaultBaseURLFor(preset: ProviderPreset, style?: ApiStyle): string {
  if (style && preset.baseURLForStyle?.[style]) {
    return preset.baseURLForStyle[style]!
  }
  return preset.defaultBaseURL
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    kind: "deepseek",
    name: "DeepSeek",
    description: "Official DeepSeek Chat and Reasoner models. Supports both OpenAI /v1 and Anthropic Messages.",
    defaultBaseURL: "https://api.deepseek.com/v1",
    apiStyle: "openai",
    supportedApiStyles: ["openai", "anthropic"],
    baseURLForStyle: {
      openai: "https://api.deepseek.com/v1",
      anthropic: "https://api.deepseek.com/anthropic"
    },
    requiresKey: true,
    docsURL: "https://api-docs.deepseek.com/",
    models: [
      { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash" },
      { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro" },
      { id: "deepseek-chat", label: "DeepSeek Chat (legacy)" },
      { id: "deepseek-reasoner", label: "DeepSeek Reasoner" }
    ]
  },
  {
    kind: "openai",
    name: "OpenAI",
    description: "Official OpenAI API, supporting Chat Completions and Responses API.",
    defaultBaseURL: "https://api.openai.com/v1",
    apiStyle: "openai",
    supportedApiStyles: ["openai", "openai-responses"],
    baseURLForStyle: {
      openai: "https://api.openai.com/v1",
      "openai-responses": "https://api.openai.com/v1"
    },
    requiresKey: true,
    docsURL: "https://platform.openai.com/docs",
    models: [
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
      { id: "gpt-4o", label: "GPT-4o" }
    ]
  },
  {
    kind: "anthropic",
    name: "Anthropic",
    description: "Claude Messages API.",
    defaultBaseURL: "https://api.anthropic.com",
    apiStyle: "anthropic",
    supportedApiStyles: ["anthropic"],
    requiresKey: true,
    docsURL: "https://docs.anthropic.com/",
    models: [
      { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
      { id: "claude-opus-4", label: "Claude Opus 4" }
    ]
  },
  {
    kind: "openrouter",
    name: "OpenRouter",
    description: "One key for many upstream models. Supports OpenAI, Messages, and Responses.",
    defaultBaseURL: "https://openrouter.ai/api/v1",
    apiStyle: "openai",
    supportedApiStyles: ["openai", "anthropic", "openai-responses"],
    baseURLForStyle: {
      openai: "https://openrouter.ai/api/v1",
      anthropic: "https://openrouter.ai/api/v1",
      "openai-responses": "https://openrouter.ai/api/v1"
    },
    requiresKey: true,
    docsURL: "https://openrouter.ai/docs",
    models: [
      { id: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini" },
      { id: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5" },
      { id: "deepseek/deepseek-chat", label: "DeepSeek Chat" }
    ]
  },
  {
    kind: "google",
    name: "Google Gemini",
    description: "Official Gemini API. OpenAI-compatible URLs still work if you keep /openai.",
    defaultBaseURL: "https://generativelanguage.googleapis.com/v1beta",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://ai.google.dev/gemini-api/docs",
    models: [
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" }
    ]
  },
  {
    kind: "doubao",
    name: "火山引擎 / 豆包 (Doubao)",
    description: "字节跳动火山方舟大模型服务平台，支持高性价比与超长上下文的 Doubao 系列模型。",
    defaultBaseURL: "https://ark.cn-beijing.volces.com/api/v3",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://www.volcengine.com/docs/82379",
    models: [
      { id: "doubao-1-5-pro-32k", label: "Doubao 1.5 Pro 32K" },
      { id: "doubao-1-5-pro-256k", label: "Doubao 1.5 Pro 256K" },
      { id: "doubao-1-5-lite-32k", label: "Doubao 1.5 Lite 32K" },
      { id: "doubao-pro-128k", label: "Doubao Pro 128K" }
    ]
  },
  {
    kind: "wenxin",
    name: "百度千帆 / 文心一言 (Wenxin)",
    description: "百度智能云千帆大模型平台 OpenAI 兼容接口，提供 ERNIE 旗舰模型与高性价比轻量模型。",
    defaultBaseURL: "https://qianfan.baidubce.com/v2",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://cloud.baidu.com/doc/WENXINWORKSHOP/index.html",
    models: [
      { id: "ernie-4.0-turbo-8k", label: "ERNIE 4.0 Turbo 8K" },
      { id: "ernie-4.0-turbo-128k", label: "ERNIE 4.0 Turbo 128K" },
      { id: "ernie-speed-128k", label: "ERNIE Speed 128K" },
      { id: "ernie-lite-8k", label: "ERNIE Lite 8K" }
    ]
  },
  {
    kind: "qwen",
    name: "通义千问 (Qwen / DashScope)",
    description: "阿里云百炼大模型服务平台兼容端点，涵盖 Qwen 全系列推理与编程模型。",
    defaultBaseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://help.aliyun.com/zh/model-studio/developer-reference/compatibility-of-openai-with-dashscope",
    models: [
      { id: "qwen-plus", label: "Qwen Plus" },
      { id: "qwen-turbo", label: "Qwen Turbo" },
      { id: "qwen-coder-plus", label: "Qwen Coder Plus" }
    ]
  },
  {
    kind: "kimi",
    name: "Kimi / Moonshot",
    description: "Moonshot OpenAI-compatible API.",
    defaultBaseURL: "https://api.moonshot.cn/v1",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://platform.moonshot.cn/docs",
    models: [
      { id: "kimi-k2-turbo-preview", label: "Kimi K2 Turbo" },
      { id: "moonshot-v1-auto", label: "Moonshot Auto" }
    ]
  },
  {
    kind: "zhipu",
    name: "智谱 GLM (Zhipu)",
    description: "智谱开放平台 OpenAI 兼容接口，涵盖 GLM 旗舰语言模型与代码大模型。",
    defaultBaseURL: "https://open.bigmodel.cn/api/paas/v4",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://open.bigmodel.cn/dev/api",
    models: [
      { id: "glm-4.6", label: "GLM-4.6" },
      { id: "glm-4-flash", label: "GLM-4 Flash" }
    ]
  },
  {
    kind: "minimax",
    name: "MiniMax",
    description: "MiniMax OpenAI-compatible API.",
    defaultBaseURL: "https://api.minimax.chat/v1",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://platform.minimaxi.com/document/guides/chat-model/pro",
    models: [{ id: "MiniMax-M2", label: "MiniMax M2" }]
  },
  {
    kind: "hunyuan",
    name: "腾讯混元 (Tencent Hunyuan)",
    description: "腾讯云混元大模型官方兼容接口，提供混元 Turbo 及代码与通用大模型。",
    defaultBaseURL: "https://api.hunyuan.cloud.tencent.com/v1",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://cloud.tencent.com/document/product/1729",
    models: [
      { id: "hunyuan-turbo", label: "Hunyuan Turbo" },
      { id: "hunyuan-standard", label: "Hunyuan Standard" },
      { id: "hunyuan-code", label: "Hunyuan Code" }
    ]
  },
  {
    kind: "stepfun",
    name: "阶跃星辰 (Stepfun)",
    description: "阶跃星辰 Step 系列大模型，具备出色的中文理解、逻辑推理与多模态能力。",
    defaultBaseURL: "https://api.stepfun.com/v1",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://platform.stepfun.com/docs",
    models: [
      { id: "step-2-16k", label: "Step 2 (16K)" },
      { id: "step-1-8k", label: "Step 1 (8K)" },
      { id: "step-1v-8k", label: "Step 1V (Vision 8K)" }
    ]
  },
  {
    kind: "zeroone",
    name: "零一万物 (01.AI / Yi)",
    description: "零一万物大模型开放平台，提供极速响应的 Yi-Lightning 与高智商 Yi-Large 模型。",
    defaultBaseURL: "https://api.lingyiwanwu.com/v1",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://platform.lingyiwanwu.com/docs",
    models: [
      { id: "yi-lightning", label: "Yi Lightning" },
      { id: "yi-large", label: "Yi Large" },
      { id: "yi-medium", label: "Yi Medium" }
    ]
  },
  {
    kind: "baichuan",
    name: "百川智能 (Baichuan)",
    description: "百川智能大模型开放平台，专注于优质中文大模型推理与知识增强。",
    defaultBaseURL: "https://api.baichuan-ai.com/v1",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://platform.baichuan-ai.com/docs",
    models: [
      { id: "Baichuan4-Air", label: "Baichuan 4 Air" },
      { id: "Baichuan4-Turbo", label: "Baichuan 4 Turbo" },
      { id: "Baichuan3-Turbo", label: "Baichuan 3 Turbo" }
    ]
  },
  {
    kind: "spark",
    name: "讯飞星火 (iFlyTek Spark)",
    description: "科大讯飞星火认知大模型，在教育、办公、编程与中文领域拥有深厚积累。",
    defaultBaseURL: "https://spark-api-open.xf-yun.com/v1",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://www.xfyun.cn/doc/spark/Web.html",
    models: [
      { id: "generalv3.5", label: "Spark Max (v3.5)" },
      { id: "4.0Ultra", label: "Spark 4.0 Ultra" },
      { id: "generalv3", label: "Spark Pro (v3.0)" },
      { id: "general", label: "Spark Lite" }
    ]
  },
  {
    kind: "siliconflow",
    name: "SiliconFlow (硅基流动)",
    description: "中国顶级开源大模型高速推理服务平台，汇聚 DeepSeek、Qwen、GLM 等开源旗舰。",
    defaultBaseURL: "https://api.siliconflow.cn/v1",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://docs.siliconflow.cn/",
    models: [
      { id: "deepseek-ai/DeepSeek-V3", label: "DeepSeek V3" },
      { id: "Qwen/Qwen2.5-72B-Instruct", label: "Qwen2.5 72B" }
    ]
  },
  {
    kind: "xai",
    name: "xAI (Grok)",
    description: "xAI 官方 API，提供 Grok-2 旗舰大模型及多模态推理能力。",
    defaultBaseURL: "https://api.x.ai/v1",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://docs.x.ai/",
    models: [
      { id: "grok-2-latest", label: "Grok 2 Latest" },
      { id: "grok-2-mini", label: "Grok 2 Mini" },
      { id: "grok-beta", label: "Grok Beta" }
    ]
  },
  {
    kind: "mistral",
    name: "Mistral AI",
    description: "欧洲顶级开源与商业大模型平台，提供 Mistral Large 与专精编程的 Codestral。",
    defaultBaseURL: "https://api.mistral.ai/v1",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://docs.mistral.ai/",
    models: [
      { id: "mistral-large-latest", label: "Mistral Large" },
      { id: "codestral-latest", label: "Codestral" },
      { id: "mistral-small-latest", label: "Mistral Small" },
      { id: "pixtral-large-latest", label: "Pixtral Large" }
    ]
  },
  {
    kind: "together",
    name: "Together AI",
    description: "全球领先的开源模型云端推理平台，托管 Llama 3.3、Qwen 2.5、DeepSeek 等。",
    defaultBaseURL: "https://api.together.xyz/v1",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://docs.together.ai/",
    models: [
      { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", label: "Llama 3.3 70B Turbo" },
      { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", label: "Qwen 2.5 72B Turbo" },
      { id: "deepseek-ai/DeepSeek-R1", label: "DeepSeek R1 (Together)" }
    ]
  },
  {
    kind: "perplexity",
    name: "Perplexity AI",
    description: "具备实时联网搜索增强能力的推理模型，支持 Sonar 系列。",
    defaultBaseURL: "https://api.perplexity.ai",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://docs.perplexity.ai/",
    models: [
      { id: "sonar-pro", label: "Sonar Pro" },
      { id: "sonar", label: "Sonar" },
      { id: "sonar-reasoning", label: "Sonar Reasoning" }
    ]
  },
  {
    kind: "groq",
    name: "Groq",
    description: "Fast OpenAI-compatible inference.",
    defaultBaseURL: "https://api.groq.com/openai/v1",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://console.groq.com/docs",
    models: [
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B" }
    ]
  },
  {
    kind: "ollama",
    name: "Ollama",
    description: "Local models. Key is optional.",
    defaultBaseURL: "http://127.0.0.1:11434/v1",
    apiStyle: "openai",
    requiresKey: false,
    docsURL: "https://ollama.com/",
    models: [
      { id: "llama3.1", label: "Llama 3.1" },
      { id: "qwen2.5-coder", label: "Qwen 2.5 Coder" }
    ]
  },
  {
    kind: "custom",
    name: "Custom endpoint",
    description: "Any third-party host. Pick the protocol it actually speaks.",
    defaultBaseURL: "",
    apiStyle: "openai",
    supportedApiStyles: ["openai", "anthropic", "openai-responses"],
    requiresKey: true,
    models: []
  },
  ...(MEDIA_PROVIDER_PRESETS as ProviderPreset[])
]

export function presetFor(kind: ProviderKind): ProviderPreset {
  return (
    PROVIDER_PRESETS.find((preset) => preset.kind === kind) ??
    PROVIDER_PRESETS.find((preset) => preset.kind === "custom")!
  )
}

export function normalizeBaseURL(value: string): string {
  return value.trim().replace(/\/+$/, "")
}

export {
  adviseCatalogUrl,
  catalogBaseCandidates,
  catalogPersistBase,
  CatalogError,
  htmlCatalogError,
  resolveCatalogBaseURL,
  type CatalogAdvice,
  type CatalogErrorCode
} from "./catalog-url"
