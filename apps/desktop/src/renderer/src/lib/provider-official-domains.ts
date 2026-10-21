/**
 * 预设 → 官方域名白名单（luna #164 S5a 要求 1）。失败卡只在端点主机属于这家官方域名时说预设品牌，
 * 否则说主机名（见 provider-face）。
 *
 * 按**域名后缀、在标签边界上**匹配：后缀 `openai.com` 认 `openai.com`、`api.openai.com`、`foo.openai.com`，
 * 不认 `evilopenai.com`（不在点上）、`openai.com.evil.com`（后缀不在末尾）。
 * 覆盖一键预设列表（@enjoy-agents/providers/presets）里每一家，国内站 + 国际站 + 各区域 / 套餐主机；
 * 测试会逐个检查预设自带的每个端点（含 regions）都落在自家白名单里，新增预设没登记会直接挂测试。
 *
 * 共享云的域名只收这家模型服务专用的那一段，不收整个云：阿里云收 `dashscope*.aliyuncs.com` / `maas.aliyuncs.com`，
 * 不收 `aliyuncs.com`（函数计算 `*.fc.aliyuncs.com` 上能架代理）；百度只收 `qianfan.baidubce.com`；
 * 腾讯只收混元的两个主机；Google 只收 `generativelanguage.googleapis.com`；Vercel 只收 `ai-gateway.vercel.sh`。
 * 火山方舟的数据面是 `ark.<区域>.volces.com`，区域在中间，只能收 `volces.com`（火山引擎自己的服务域名）。
 * 本地预设（Ollama / LM Studio）没有官方域名：只认预设自带的 127.0.0.1（provider-face 里按预设主机精确匹配）。
 */

export const PROVIDER_OFFICIAL_DOMAINS: Readonly<Record<string, readonly string[]>> = {
  // 国际厂商
  openai: ["openai.com"],
  anthropic: ["anthropic.com"],
  deepseek: ["deepseek.com"],
  google: ["generativelanguage.googleapis.com"],
  xai: ["x.ai"],
  groq: ["groq.com"],
  mistral: ["mistral.ai"],
  perplexity: ["perplexity.ai"],
  // 国内厂商（含国际站 / 编程套餐）
  kimi: ["moonshot.cn", "moonshot.ai", "kimi.com", "kimi.ai"],
  zhipu: ["bigmodel.cn"],
  zai: ["z.ai"],
  minimax: ["minimax.io", "minimaxi.com", "minimax.chat"],
  stepfun: ["stepfun.com", "stepfun.ai"],
  qwen: [
    "dashscope.aliyuncs.com", // 北京；香港是 cn-hongkong.dashscope.aliyuncs.com
    "dashscope-intl.aliyuncs.com", // 新加坡（国际站）
    "dashscope-us.aliyuncs.com", // 美国（弗吉尼亚）
    "maas.aliyuncs.com", // 业务空间专属域名 {WorkspaceId}.{region}.maas.aliyuncs.com / trial.{region}.maas.aliyuncs.com
    "qianwenaiapi.com" // Token Plan
  ],
  doubao: [
    "volces.com", // 火山方舟 ark.cn-beijing.volces.com、ark.cn-shanghai.volces.com…
    "bytepluses.com" // BytePlus ModelArk（方舟国际版）ark.ap-southeast.bytepluses.com、ark.eu-west.bytepluses.com
  ],
  wenxin: ["qianfan.baidubce.com"],
  hunyuan: ["hunyuan.cloud.tencent.com", "hunyuan.tencentcloudapi.com"],
  xiaomi: ["xiaomimimo.com"],
  zeroone: ["lingyiwanwu.com", "01.ai"],
  baichuan: ["baichuan-ai.com"],
  spark: ["xf-yun.com"],
  // 聚合 / 中转平台（它们自己的官方地址）
  openrouter: ["openrouter.ai"],
  siliconflow: ["siliconflow.cn", "siliconflow.com"],
  together: ["together.xyz", "together.ai"],
  modelscope: ["modelscope.cn"],
  aihubmix: ["aihubmix.com"],
  // 媒体 / Gateway
  fal: ["fal.run", "fal.ai"],
  replicate: ["replicate.com"],
  elevenlabs: ["elevenlabs.io"],
  deepgram: ["deepgram.com"],
  cohere: ["cohere.com", "cohere.ai"],
  gateway: ["ai-gateway.vercel.sh"]
}

/** 主机名规整：小写、去掉 IPv6 方括号、去掉末尾的根点（`api.openai.com.`）。 */
export function normalizeHost(host: string | null | undefined): string | undefined {
  const value = host
    ?.trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/, "")
  return value || undefined
}

/** host 是 suffix 本身，或是它的子域（在「.」上切开）。 */
export function hostHasDomainSuffix(host: string, suffix: string): boolean {
  const h = normalizeHost(host)
  const s = normalizeHost(suffix)
  if (!h || !s) return false
  return h === s || h.endsWith(`.${s}`)
}

/** 端点主机属于这个预设的官方域名（后缀匹配）。 */
export function isOfficialDomain(kind: string, host: string): boolean {
  if (!Object.hasOwn(PROVIDER_OFFICIAL_DOMAINS, kind)) return false
  return PROVIDER_OFFICIAL_DOMAINS[kind]!.some((suffix) => hostHasDomainSuffix(host, suffix))
}
