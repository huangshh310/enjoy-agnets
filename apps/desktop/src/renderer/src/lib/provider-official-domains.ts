/**
 * 预设 → 官方地址白名单（luna #164 S5a 要求 1、leo rv164d M1、luna 边界规则）。失败卡 / 余额提示只在端点主机
 * 是这家官方地址时说预设品牌、给充值链接，否则说主机名（见 provider-face）。
 *
 * 两种登记方式：
 * - **域名后缀**（PROVIDER_OFFICIAL_DOMAINS）：在标签边界上匹配。后缀 `openai.com` 认 `openai.com`、`api.openai.com`、
 *   `foo.openai.com`，不认 `evilopenai.com`（不在点上）、`openai.com.evil.com`（后缀不在末尾）。
 *   **只给确认没有用户 / 第三方能占用子域的域名用**：这个域名下所有子域都归这家自己的 API 服务。
 * - **精确主机**（PROVIDER_OFFICIAL_HOSTS）：其余每一家。域名下有用户能占的子域（z.ai 的 `*.space.z.ai`、
 *   MiniMax 的 `*.space.minimax.io`、火山引擎 / BytePlus 的 TOS 桶 `*.tos-<区域>.volces.com`），
 *   或者没法确认有没有的，一律只认预设里的端点主机和官方文档写明的 API 主机，别的子域说主机名。
 * 两种都不认空标签（`api..openai.com`、`.openai.com`）。
 *
 * 覆盖一键预设列表（@enjoy-agents/providers/presets）里每一家；测试逐个检查预设自带的每个端点（含 regions）
 * 都算自家官方地址，新增预设没登记会直接挂测试。
 *
 * 本地预设（预设列表里 group 为 local 的，目前是 Ollama / LM Studio；custom 除外）没有官方域名：本机地址算官方
 * （luna #164 ② / S4 / 第 3 轮）：localhost、*.localhost、0.0.0.0、127.0.0.0/8 整段、::1、::（任意端口）。局域网别的机器说主机名。
 * 这些本机地址对云端预设一律不算官方（OpenAI 预设指到 localhost:8080 说 localhost，指到 ollama.localhost 说 ollama.localhost）。
 */
import { PROVIDER_PRESETS } from "@enjoy-agents/providers/presets"

/** 后缀匹配：只放确认没有用户 / 第三方可占子域的域名。 */
export const PROVIDER_OFFICIAL_DOMAINS: Readonly<Record<string, readonly string[]>> = {
  openai: ["openai.com"], // Azure OpenAI 是 *.openai.azure.com，不在这里
  anthropic: ["anthropic.com"], // 用户内容在 claude.site / claude.ai
  deepseek: ["deepseek.com"],
  kimi: ["moonshot.cn", "moonshot.ai", "kimi.com", "kimi.ai"], // 用户站点在 *.kimi.link
  qwen: [
    "dashscope.aliyuncs.com", // 北京；香港是 cn-hongkong.dashscope.aliyuncs.com
    "dashscope-intl.aliyuncs.com", // 新加坡（国际站）
    "dashscope-us.aliyuncs.com", // 美国（弗吉尼亚）
    "maas.aliyuncs.com" // 百炼业务空间专属域名 {WorkspaceId}.{region}.maas.aliyuncs.com（阿里云分配，只跑百炼）
  ]
}

/** 精确主机：预设里的端点主机 + 官方文档写明的 API 主机。 */
export const PROVIDER_OFFICIAL_HOSTS: Readonly<Record<string, readonly string[]>> = {
  qwen: ["token-plan.maas.qianwenaiapi.com"],
  google: ["generativelanguage.googleapis.com"],
  xai: ["api.x.ai"],
  groq: ["api.groq.com"],
  mistral: ["api.mistral.ai", "codestral.mistral.ai"],
  perplexity: ["api.perplexity.ai"],
  zhipu: ["open.bigmodel.cn"],
  zai: ["api.z.ai"], // *.space.z.ai 是用户部署的全栈应用
  minimax: ["api.minimax.io", "api.minimaxi.com", "api.minimax.chat"], // *.space.minimax(i).* 是用户应用
  stepfun: ["api.stepfun.com", "api.stepfun.ai"],
  doubao: [
    // volces.com / bytepluses.com 下有用户命名的 TOS 桶，只认方舟数据面
    "ark.cn-beijing.volces.com",
    "ark.cn-shanghai.volces.com",
    "ark.cn-guangzhou.volces.com",
    "ark.ap-southeast.bytepluses.com",
    "ark.eu-west.bytepluses.com"
  ],
  wenxin: ["qianfan.baidubce.com"],
  hunyuan: ["api.hunyuan.cloud.tencent.com", "hunyuan.tencentcloudapi.com"],
  xiaomi: ["api.xiaomimimo.com", "token-plan-cn.xiaomimimo.com", "token-plan-sgp.xiaomimimo.com", "token-plan-ams.xiaomimimo.com"],
  zeroone: ["api.lingyiwanwu.com", "api.01.ai"],
  baichuan: ["api.baichuan-ai.com"],
  spark: ["spark-api-open.xf-yun.com"],
  openrouter: ["openrouter.ai"],
  siliconflow: ["api.siliconflow.cn", "api.siliconflow.com"],
  together: ["api.together.xyz"],
  modelscope: ["api-inference.modelscope.cn"],
  aihubmix: ["aihubmix.com"],
  fal: ["fal.run", "queue.fal.run"],
  replicate: ["api.replicate.com"],
  elevenlabs: ["api.elevenlabs.io"],
  deepgram: ["api.deepgram.com"],
  cohere: ["api.cohere.com", "api.cohere.ai"],
  gateway: ["ai-gateway.vercel.sh"]
}

/** 主机名规整：小写、去掉 IPv6 方括号、去掉**一个**末尾根点（`api.openai.com.`）。末尾连着两个以上的点不动，算空标签；规整两次结果不变。 */
export function normalizeHost(host: string | null | undefined): string | undefined {
  const value = host
    ?.trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/([^.])\.$/, "$1")
  return value || undefined
}

/** 有空标签（`api..openai.com`、`.openai.com`、`openai.com..`）：不是正常主机名，永远不算官方。 */
function hasEmptyLabel(host: string): boolean {
  return host.split(".").includes("")
}

/** host 是 suffix 本身，或是它的子域（在「.」上切开）；有空标签的不算。 */
export function hostHasDomainSuffix(host: string, suffix: string): boolean {
  const h = normalizeHost(host)
  const s = normalizeHost(suffix)
  if (!h || !s || hasEmptyLabel(h)) return false
  return h === s || h.endsWith(`.${s}`)
}

function ownList(map: Readonly<Record<string, readonly string[]>>, kind: string): readonly string[] {
  return Object.hasOwn(map, kind) ? map[kind]! : []
}

/** 端点主机属于这个云端预设的官方地址：后缀表（标签边界）或精确主机表。 */
export function isOfficialDomain(kind: string, host: string): boolean {
  const h = normalizeHost(host)
  if (!h || hasEmptyLabel(h)) return false
  if (ownList(PROVIDER_OFFICIAL_HOSTS, kind).includes(h)) return true
  return ownList(PROVIDER_OFFICIAL_DOMAINS, kind).some((suffix) => hostHasDomainSuffix(h, suffix))
}

/** 本机地址（规整后）：localhost、*.localhost（RFC 6761，解析到本机）、0.0.0.0、127.0.0.0/8、::1、::。只对本地预设算官方。 */
export function isThisMachineHost(host: string | null | undefined): boolean {
  const h = normalizeHost(host)
  if (!h || hasEmptyLabel(h)) return false
  if (h.endsWith(".localhost")) return true
  if (h === "localhost" || h === "0.0.0.0" || h === "::1" || h === "::") return true
  // WHATWG URL 已把 IPv4 规整成十进制四段（127.1、0x7f.0.0.1 → 127.0.0.1），这里只认四段十进制
  const m = /^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h)
  return m != null && m.slice(1).every((part) => Number(part) <= 255)
}

/** 本地预设：预设列表里 group 为 local 的（custom 除外）。 */
export const LOCAL_PRESET_KINDS: readonly string[] = PROVIDER_PRESETS.filter(
  (preset) => preset.group === "local" && preset.kind !== "custom"
).map((preset) => preset.kind)

/** 端点主机算不算这个预设的官方地址：本地预设看本机地址，云端预设看官方白名单（本机地址不算）。 */
export function isOfficialEndpointHost(kind: string, host: string): boolean {
  if (LOCAL_PRESET_KINDS.includes(kind)) return isThisMachineHost(host)
  return isOfficialDomain(kind, host)
}
