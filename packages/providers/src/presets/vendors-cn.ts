/**
 * 国产厂商：区域或套餐写在同一张卡片里。默认区域放在 regions[0]，
 * 共享的 Anthropic 根会先命中按量，避免迁移把按量档案补成套餐主机。
 */
import { definePreset, presetModel, type ProviderPreset } from "./define.ts"

const kimiCn = {
  openai: "https://api.moonshot.cn/v1",
  anthropic: "https://api.moonshot.cn/anthropic"
}
const kimiIntl = {
  openai: "https://api.moonshot.ai/v1",
  anthropic: "https://api.moonshot.ai/anthropic"
}

export const CN_VENDOR_PRESETS: ProviderPreset[] = [
  definePreset({
    kind: "kimi",
    name: "Kimi / Moonshot",
    description: "Moonshot Chat and Anthropic Messages, plus Kimi Code plan hosts.",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    regionLabel: "region",
    docsURL: "https://platform.moonshot.cn/docs",
    keysURL: "https://platform.moonshot.cn/console/api-keys",
    endpoints: kimiCn,
    regions: [
      { id: "cn", name: "China", endpoints: kimiCn, keysURL: "https://platform.moonshot.cn/console/api-keys" },
      { id: "intl", name: "Global", endpoints: kimiIntl, keysURL: "https://platform.moonshot.ai/console/api-keys" },
      {
        id: "code-cn",
        name: "Kimi Code · China",
        endpoints: { openai: "https://api.kimi.com/coding/v1", anthropic: "https://api.kimi.com/coding" },
        keysURL: "https://www.kimi.com/code/console"
      },
      {
        id: "code-intl",
        name: "Kimi Code · Global",
        endpoints: { openai: "https://api.kimi.ai/coding/v1", anthropic: "https://api.kimi.ai/coding" },
        keysURL: "https://www.kimi.com/code/console"
      }
    ],
    models: [
      presetModel("kimi-k2-turbo-preview", "Kimi K2 Turbo"),
      presetModel("moonshot-v1-auto", "Moonshot Auto")
    ]
  }),
  definePreset({
    kind: "zhipu",
    name: "智谱 GLM (Zhipu)",
    description: "智谱开放平台。按量与 Coding Plan 主机不同，Anthropic 根相同。",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    regionLabel: "plan",
    docsURL: "https://open.bigmodel.cn/dev/api",
    keysURL: "https://open.bigmodel.cn/usercenter/proj-mgmt/apikeys",
    endpoints: {
      openai: "https://open.bigmodel.cn/api/paas/v4",
      anthropic: "https://open.bigmodel.cn/api/anthropic"
    },
    regions: [
      {
        id: "api",
        name: "Pay as you go",
        endpoints: {
          openai: "https://open.bigmodel.cn/api/paas/v4",
          anthropic: "https://open.bigmodel.cn/api/anthropic"
        }
      },
      {
        id: "coding",
        name: "Coding Plan",
        endpoints: {
          openai: "https://open.bigmodel.cn/api/coding/paas/v4",
          "openai-responses": "https://open.bigmodel.cn/api/v1",
          anthropic: "https://open.bigmodel.cn/api/anthropic"
        }
      }
    ],
    models: [presetModel("glm-4.6", "GLM-4.6"), presetModel("glm-4-flash", "GLM-4 Flash")]
  }),
  definePreset({
    kind: "zai",
    name: "Z.ai",
    description: "Z.ai hosts the same pay-as-you-go and Coding Plan paths as Zhipu.",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    regionLabel: "plan",
    docsURL: "https://z.ai",
    keysURL: "https://z.ai/manage-apikey/apikey-list",
    endpoints: {
      openai: "https://api.z.ai/api/paas/v4",
      anthropic: "https://api.z.ai/api/anthropic"
    },
    regions: [
      {
        id: "api",
        name: "Pay as you go",
        endpoints: { openai: "https://api.z.ai/api/paas/v4", anthropic: "https://api.z.ai/api/anthropic" }
      },
      {
        id: "coding",
        name: "Coding Plan",
        endpoints: {
          openai: "https://api.z.ai/api/coding/paas/v4",
          "openai-responses": "https://api.z.ai/api/v1",
          anthropic: "https://api.z.ai/api/anthropic"
        }
      }
    ],
    models: [presetModel("glm-4.6", "GLM-4.6"), presetModel("glm-4-flash", "GLM-4 Flash")]
  }),
  definePreset({
    kind: "minimax",
    name: "MiniMax",
    description: "MiniMax international and China hosts. Each has Chat and Anthropic.",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    regionLabel: "region",
    docsURL: "https://platform.minimaxi.com/document/guides/chat-model/pro",
    keysURL: "https://platform.minimax.io/user-center/basic-information/interface-key",
    endpoints: {
      openai: "https://api.minimax.io/v1",
      anthropic: "https://api.minimax.io/anthropic"
    },
    regions: [
      {
        id: "intl",
        name: "Global",
        endpoints: { openai: "https://api.minimax.io/v1", anthropic: "https://api.minimax.io/anthropic" },
        keysURL: "https://platform.minimax.io/user-center/basic-information/interface-key"
      },
      {
        id: "cn",
        name: "China",
        endpoints: { openai: "https://api.minimaxi.com/v1", anthropic: "https://api.minimaxi.com/anthropic" },
        keysURL: "https://platform.minimaxi.com/user-center/basic-information/interface-key"
      }
    ],
    models: [presetModel("MiniMax-M2", "MiniMax M2")]
  }),
  definePreset({
    kind: "stepfun",
    name: "阶跃星辰 (Stepfun)",
    description: "Step Plan and pay-as-you-go, China and Global.",
    group: "vendor",
    apiStyle: "openai",
    requiresKey: true,
    regionLabel: "plan",
    docsURL: "https://platform.stepfun.com/docs",
    keysURL: "https://platform.stepfun.com/interface-key",
    endpoints: {
      openai: "https://api.stepfun.com/step_plan/v1",
      anthropic: "https://api.stepfun.com/step_plan"
    },
    regions: [
      {
        id: "plan-cn",
        name: "Step Plan · China",
        endpoints: { openai: "https://api.stepfun.com/step_plan/v1", anthropic: "https://api.stepfun.com/step_plan" }
      },
      {
        id: "api-cn",
        name: "Pay as you go · China",
        endpoints: { openai: "https://api.stepfun.com/v1", anthropic: "https://api.stepfun.com" }
      },
      {
        id: "plan-intl",
        name: "Step Plan · Global",
        endpoints: { openai: "https://api.stepfun.ai/step_plan/v1", anthropic: "https://api.stepfun.ai/step_plan" },
        keysURL: "https://platform.stepfun.ai/interface-key"
      },
      {
        id: "api-intl",
        name: "Pay as you go · Global",
        endpoints: { openai: "https://api.stepfun.ai/v1", anthropic: "https://api.stepfun.ai" },
        keysURL: "https://platform.stepfun.ai/interface-key"
      }
    ],
    models: [
      presetModel("step-2-16k", "Step 2 (16K)"),
      presetModel("step-1-8k", "Step 1 (8K)"),
      presetModel("step-1v-8k", "Step 1V (Vision 8K)")
    ]
  })
]
