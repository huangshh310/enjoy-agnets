/**
 * 豆包、千帆、千问、小米与其余国产 Chat 预设。
 * 千问 Token Plan 的两条 URL 从 Magpie qwen-token-plan 原样抄来。
 */
import { definePreset, presetModel, type ProviderPreset } from "./define.ts"

const qwenCn = {
  openai: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  anthropic: "https://dashscope.aliyuncs.com/apps/anthropic"
}
const qwenIntl = {
  openai: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  anthropic: "https://dashscope-intl.aliyuncs.com/apps/anthropic"
}
const qwenPlan = {
  openai: "https://token-plan.maas.qianwenaiapi.com/compatible-mode/v1",
  anthropic: "https://token-plan.maas.qianwenaiapi.com/apps/anthropic"
}

export const CN_PLAN_PRESETS: ProviderPreset[] = [
  definePreset({
    kind: "doubao",
    name: "火山引擎 / 豆包 (Doubao)",
    description: "方舟按量、Coding Plan 与 Agent Plan。按量没有 Anthropic 根。",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    regionLabel: "plan",
    docsURL: "https://www.volcengine.com/docs/82379",
    keysURL: "https://ark.volcengine.com/region:cn-beijing/apikey",
    endpoints: {
      openai: "https://ark.cn-beijing.volces.com/api/v3",
      "openai-responses": "https://ark.cn-beijing.volces.com/api/v3"
    },
    regions: [
      {
        id: "api",
        name: "Pay as you go",
        endpoints: {
          openai: "https://ark.cn-beijing.volces.com/api/v3",
          "openai-responses": "https://ark.cn-beijing.volces.com/api/v3"
        }
      },
      {
        id: "coding",
        name: "Coding Plan",
        endpoints: {
          openai: "https://ark.cn-beijing.volces.com/api/coding/v3",
          "openai-responses": "https://ark.cn-beijing.volces.com/api/coding/v3",
          anthropic: "https://ark.cn-beijing.volces.com/api/coding"
        }
      },
      {
        id: "agent",
        name: "Agent Plan",
        endpoints: {
          openai: "https://ark.cn-beijing.volces.com/api/plan/v3",
          "openai-responses": "https://ark.cn-beijing.volces.com/api/plan/v3",
          anthropic: "https://ark.cn-beijing.volces.com/api/plan"
        }
      }
    ],
    models: [
      presetModel("doubao-1-5-pro-32k", "Doubao 1.5 Pro 32K"),
      presetModel("doubao-1-5-pro-256k", "Doubao 1.5 Pro 256K"),
      presetModel("doubao-1-5-lite-32k", "Doubao 1.5 Lite 32K"),
      presetModel("doubao-pro-128k", "Doubao Pro 128K")
    ]
  }),
  definePreset({
    kind: "wenxin",
    name: "百度千帆 / 文心一言 (Wenxin)",
    description: "千帆按量 v2，以及个人 / 企业 Token Plan。",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    regionLabel: "plan",
    docsURL: "https://cloud.baidu.com/doc/WENXINWORKSHOP/index.html",
    keysURL: "https://console.bce.baidu.com/iam/#/iam/apikey/list",
    endpoints: {
      openai: "https://qianfan.baidubce.com/v2",
      "openai-responses": "https://qianfan.baidubce.com/v2",
      anthropic: "https://qianfan.baidubce.com/anthropic"
    },
    regions: [
      {
        id: "api",
        name: "Pay as you go",
        endpoints: {
          openai: "https://qianfan.baidubce.com/v2",
          "openai-responses": "https://qianfan.baidubce.com/v2",
          anthropic: "https://qianfan.baidubce.com/anthropic"
        }
      },
      {
        id: "personal",
        name: "Token Plan Personal",
        endpoints: {
          openai: "https://qianfan.baidubce.com/v2/tokenplan/personal",
          "openai-responses": "https://qianfan.baidubce.com/v2/tokenplan/personal",
          anthropic: "https://qianfan.baidubce.com/anthropic/tokenplan/personal"
        },
        keysURL: "https://console.bce.baidu.com/qianfan/resource/token-plan"
      },
      {
        id: "team",
        name: "Token Plan Enterprise",
        endpoints: {
          openai: "https://qianfan.baidubce.com/v2/tokenplan/team",
          "openai-responses": "https://qianfan.baidubce.com/v2/tokenplan/team",
          anthropic: "https://qianfan.baidubce.com/anthropic/tokenplan/team"
        },
        keysURL: "https://console.bce.baidu.com/qianfan/resource/token-plan"
      }
    ],
    models: [
      presetModel("ernie-4.0-turbo-8k", "ERNIE 4.0 Turbo 8K"),
      presetModel("ernie-4.0-turbo-128k", "ERNIE 4.0 Turbo 128K"),
      presetModel("ernie-speed-128k", "ERNIE Speed 128K"),
      presetModel("ernie-lite-8k", "ERNIE Lite 8K")
    ]
  }),
  definePreset({
    kind: "qwen",
    name: "通义千问 (Qwen / DashScope)",
    description: "百炼中国、国际兼容端点，以及 Token Plan 主机。",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    regionLabel: "region",
    docsURL: "https://help.aliyun.com/zh/model-studio/developer-reference/compatibility-of-openai-with-dashscope",
    keysURL: "https://bailian.console.aliyun.com/?tab=model#/api-key",
    endpoints: qwenCn,
    regions: [
      { id: "cn", name: "China", endpoints: qwenCn, keysURL: "https://bailian.console.aliyun.com/?tab=model#/api-key" },
      {
        id: "intl",
        name: "Global",
        endpoints: qwenIntl,
        keysURL: "https://modelstudio.console.alibabacloud.com/?tab=playground#/api-key"
      },
      {
        id: "token-plan",
        name: "Token Plan",
        endpoints: qwenPlan,
        keysURL: "https://bailian.console.aliyun.com/cn-beijing/subscription/token-plan/personal"
      }
    ],
    models: [
      presetModel("qwen-plus", "Qwen Plus"),
      presetModel("qwen-turbo", "Qwen Turbo"),
      presetModel("qwen-coder-plus", "Qwen Coder Plus")
    ]
  }),
  definePreset({
    kind: "xiaomi",
    name: "Xiaomi MiMo",
    description: "Token Plan in China, Singapore, and Europe, plus pay as you go.",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    regionLabel: "region",
    docsURL: "https://platform.xiaomimimo.com",
    keysURL: "https://platform.xiaomimimo.com/token-plan",
    endpoints: {
      openai: "https://token-plan-cn.xiaomimimo.com/v1",
      "openai-responses": "https://token-plan-cn.xiaomimimo.com/v1",
      anthropic: "https://token-plan-cn.xiaomimimo.com/anthropic"
    },
    regions: [
      {
        id: "plan-cn",
        name: "Plan · China",
        endpoints: {
          openai: "https://token-plan-cn.xiaomimimo.com/v1",
          "openai-responses": "https://token-plan-cn.xiaomimimo.com/v1",
          anthropic: "https://token-plan-cn.xiaomimimo.com/anthropic"
        }
      },
      {
        id: "plan-sgp",
        name: "Plan · Singapore",
        endpoints: {
          openai: "https://token-plan-sgp.xiaomimimo.com/v1",
          "openai-responses": "https://token-plan-sgp.xiaomimimo.com/v1",
          anthropic: "https://token-plan-sgp.xiaomimimo.com/anthropic"
        }
      },
      {
        id: "plan-ams",
        name: "Plan · Europe",
        endpoints: {
          openai: "https://token-plan-ams.xiaomimimo.com/v1",
          "openai-responses": "https://token-plan-ams.xiaomimimo.com/v1",
          anthropic: "https://token-plan-ams.xiaomimimo.com/anthropic"
        }
      },
      {
        id: "api",
        name: "Pay as you go",
        endpoints: {
          openai: "https://api.xiaomimimo.com/v1",
          "openai-responses": "https://api.xiaomimimo.com/v1",
          anthropic: "https://api.xiaomimimo.com/anthropic"
        }
      }
    ],
    models: []
  }),
  definePreset({
    kind: "hunyuan",
    name: "腾讯混元 (Tencent Hunyuan)",
    description: "腾讯云混元大模型官方兼容接口。",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://cloud.tencent.com/document/product/1729",
    endpoints: { openai: "https://api.hunyuan.cloud.tencent.com/v1" },
    models: [
      presetModel("hunyuan-turbo", "Hunyuan Turbo"),
      presetModel("hunyuan-standard", "Hunyuan Standard"),
      presetModel("hunyuan-code", "Hunyuan Code")
    ]
  }),
  definePreset({
    kind: "zeroone",
    name: "零一万物 (01.AI / Yi)",
    description: "零一万物 Yi 系列。",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://platform.lingyiwanwu.com/docs",
    endpoints: { openai: "https://api.lingyiwanwu.com/v1" },
    models: [
      presetModel("yi-lightning", "Yi Lightning"),
      presetModel("yi-large", "Yi Large"),
      presetModel("yi-medium", "Yi Medium")
    ]
  }),
  definePreset({
    kind: "baichuan",
    name: "百川智能 (Baichuan)",
    description: "百川智能开放平台。",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://platform.baichuan-ai.com/docs",
    endpoints: { openai: "https://api.baichuan-ai.com/v1" },
    models: [
      presetModel("Baichuan4-Air", "Baichuan 4 Air"),
      presetModel("Baichuan4-Turbo", "Baichuan 4 Turbo"),
      presetModel("Baichuan3-Turbo", "Baichuan 3 Turbo")
    ]
  }),
  definePreset({
    kind: "spark",
    name: "讯飞星火 (iFlyTek Spark)",
    description: "科大讯飞星火认知大模型。",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    docsURL: "https://www.xfyun.cn/doc/spark/Web.html",
    endpoints: { openai: "https://spark-api-open.xf-yun.com/v1" },
    models: [
      presetModel("generalv3.5", "Spark Max (v3.5)"),
      presetModel("4.0Ultra", "Spark 4.0 Ultra"),
      presetModel("generalv3", "Spark Pro (v3.0)"),
      presetModel("general", "Spark Lite")
    ]
  })
]
