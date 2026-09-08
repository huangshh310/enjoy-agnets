/**
 * 各 CLI 的模型表与安装 / 登录配方。不写各家 auth.json。
 * 安装只列 npm / brew 白名单 argv；需要 curl|bash 的只给复制文本。
 */
import type { AgentToolId } from "@enjoy-agents/ipc-contract"
import type { AgentCliModelDef, AgentToolCatalog } from "./types.ts"

const CLAUDE_MODELS: AgentCliModelDef[] = [
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6" },
  { id: "claude-opus-4-6", label: "Opus 4.6" },
  { id: "claude-sonnet-5", label: "Sonnet 5" },
  { id: "claude-opus-5", label: "Opus 5" },
  { id: "claude-haiku-4-5", label: "Haiku 4.5" }
]

const CURSOR_MODELS: AgentCliModelDef[] = [
  { id: "auto", label: "Auto" },
  { id: "composer-2.5", label: "Composer 2.5" },
  { id: "composer-2.5-fast", label: "Composer 2.5 Fast" },
  { id: "cursor-grok-4.6-xhigh-fast", label: "Cursor Grok 4.6 Extra High Fast" },
  { id: "gpt-5.6-sol-medium", label: "GPT-5.6 Sol" },
  { id: "claude-sonnet-5-thinking-high", label: "Claude Sonnet 5 Thinking" }
]

const GROK_MODELS: AgentCliModelDef[] = [
  { id: "grok-4.6", label: "Grok 4.6" },
  { id: "grok-4.5", label: "Grok 4.5" }
]

const CODEX_MODELS: AgentCliModelDef[] = [
  { id: "gpt-5.4", label: "GPT-5.4" },
  { id: "gpt-5", label: "GPT-5" },
  { id: "o3", label: "o3" },
  { id: "o4-mini", label: "o4-mini" }
]

const ANTIGRAVITY_MODELS: AgentCliModelDef[] = [
  { id: "gemini-3.8-flash-high", label: "Gemini 3.8 Flash (High)" },
  { id: "gemini-3.7-flash-high", label: "Gemini 3.7 Flash (High)" },
  { id: "gemini-3.6-flash-high", label: "Gemini 3.6 Flash (High)" },
  { id: "gemini-3.1-pro-high", label: "Gemini 3.1 Pro (High)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (Thinking)" },
  { id: "claude-opus-4-6-thinking", label: "Claude Opus 4.6 (Thinking)" },
  { id: "gpt-oss-120b-medium", label: "GPT-OSS 120B (Medium)" }
]

const GEMINI_MODELS: AgentCliModelDef[] = [
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" }
]

export const AGENT_TOOL_CATALOGS: Partial<Record<AgentToolId, AgentToolCatalog>> = {
  claude: {
    models: CLAUDE_MODELS,
    defaultModel: "claude-sonnet-4-6",
    steps: [
      {
        manager: "npm",
        args: ["install", "-g", "@anthropic-ai/claude-code"],
        uninstallArgs: ["uninstall", "-g", "@anthropic-ai/claude-code"]
      }
    ],
    installCommand: "npm i -g @anthropic-ai/claude-code",
    docsUrl: "https://docs.anthropic.com/en/docs/claude-code",
    loginArgs: ["auth", "login"]
  },
  cursor: {
    models: CURSOR_MODELS,
    defaultModel: "composer-2.5",
    steps: [],
    installCommand: "curl https://cursor.com/install -fsS | bash",
    docsUrl: "https://cursor.com/docs/cli/overview",
    loginArgs: ["login"]
  },
  grok: {
    models: GROK_MODELS,
    defaultModel: "grok-4.6",
    steps: [],
    installCommand: "curl -fsSL https://x.ai/cli/install.sh | bash",
    docsUrl: "https://docs.x.ai/build/overview",
    loginArgs: ["login"]
  },
  codex: {
    models: CODEX_MODELS,
    defaultModel: "gpt-5.4",
    steps: [
      {
        manager: "npm",
        args: ["install", "-g", "@openai/codex"],
        uninstallArgs: ["uninstall", "-g", "@openai/codex"]
      }
    ],
    installCommand: "npm i -g @openai/codex",
    docsUrl: "https://github.com/openai/codex",
    loginArgs: ["login"]
  },
  antigravity: {
    models: ANTIGRAVITY_MODELS,
    defaultModel: "gemini-3.8-flash-high",
    steps: [
      {
        manager: "brew",
        args: ["install", "antigravity-cli"],
        uninstallArgs: ["uninstall", "antigravity-cli"]
      }
    ],
    installCommand: "brew install antigravity-cli",
    docsUrl: "https://antigravity.google/product/antigravity-cli",
    loginArgs: ["login"],
    loginBinary: "agy"
  },
  gemini: {
    models: GEMINI_MODELS,
    defaultModel: "gemini-2.5-pro",
    steps: [
      {
        manager: "npm",
        args: ["install", "-g", "@google/gemini-cli"],
        uninstallArgs: ["uninstall", "-g", "@google/gemini-cli"]
      }
    ],
    installCommand: "npm i -g @google/gemini-cli",
    docsUrl: "https://geminicli.com/docs/cli/acp-mode/",
    loginArgs: []
  },
  opencode: {
    models: [
      { id: "glm-5", label: "GLM 5" },
      { id: "minimax-m2.5", label: "MiniMax M2.5" },
      { id: "kimi-k2.5", label: "Kimi K2.5" }
    ],
    steps: [
      {
        manager: "npm",
        args: ["install", "-g", "opencode-ai"],
        uninstallArgs: ["uninstall", "-g", "opencode-ai"]
      }
    ],
    installCommand: "npm i -g opencode-ai",
    docsUrl: "https://opencode.ai/docs/acp",
    loginArgs: ["auth", "login"]
  },
  pi: {
    models: [],
    steps: [
      {
        manager: "npm",
        args: ["install", "-g", "@earendil-works/pi-coding-agent"],
        uninstallArgs: ["uninstall", "-g", "@earendil-works/pi-coding-agent"]
      },
      {
        manager: "npm",
        args: ["install", "-g", "pi-acp"],
        uninstallArgs: ["uninstall", "-g", "pi-acp"]
      }
    ],
    installCommand: "npm i -g @earendil-works/pi-coding-agent pi-acp",
    docsUrl: "https://github.com/svkozak/pi-acp",
    loginArgs: []
  },
  hermes: {
    models: [],
    steps: [],
    installCommand: 'cd ~/.hermes/hermes-agent && uv pip install -e ".[acp]"',
    docsUrl: "https://hermes-agent.nousresearch.com/docs/developer-guide/programmatic-integration",
    loginArgs: ["acp", "--setup"],
    loginBinary: "hermes"
  },
  amp: {
    models: [],
    steps: [],
    installCommand: "curl -fsSL https://ampcode.com/install.sh | bash",
    docsUrl: "https://ampcode.com",
    loginArgs: ["login"],
    loginBinary: "amp"
  },
  deepseek: {
    models: [{ id: "deepseek-v4-pro", label: "DeepSeek V4 Pro" }],
    defaultModel: "deepseek-v4-pro",
    steps: [
      {
        manager: "npm",
        args: ["install", "-g", "@deepseek-ai/dsh"],
        uninstallArgs: ["uninstall", "-g", "@deepseek-ai/dsh"]
      }
    ],
    installCommand: "npm i -g @deepseek-ai/dsh",
    docsUrl: "https://github.com/deepseek-ai/deepseek-harness",
    loginArgs: []
  },
  omp: {
    models: [],
    steps: [],
    installCommand: "curl -fsSL https://omp.sh/install | sh",
    docsUrl: "https://ohmypi.xyz/",
    loginArgs: []
  }
}
