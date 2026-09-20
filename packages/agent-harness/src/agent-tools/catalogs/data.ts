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
    loginArgs: ["auth", "login"],
    nativePluginCopy: "claude plugin marketplace add anthropics/claude-plugins-official"
  },
  cursor: {
    models: CURSOR_MODELS,
    defaultModel: "composer-2.5",
    steps: [],
    installCommand: "curl https://cursor.com/install -fsS | bash",
    docsUrl: "https://cursor.com/docs/cli/overview",
    loginArgs: ["login"],
    nativePluginCopy: "https://cursor.com/marketplace"
  },
  grok: {
    models: GROK_MODELS,
    defaultModel: "grok-4.6",
    steps: [],
    installCommand: "curl -fsSL https://x.ai/cli/install.sh | bash",
    docsUrl: "https://docs.x.ai/build/overview",
    loginArgs: ["login"],
    nativePluginCopy: "grok plugin marketplace list"
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
    loginArgs: ["login"],
    nativePluginCopy: "codex plugin marketplace list"
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
    loginBinary: "agy",
    nativePluginCopy: "agy plugin list"
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
    loginArgs: [],
    nativePluginCopy: "gemini extensions install https://github.com/gemini-cli-extensions/security"
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
    loginArgs: ["auth", "login"],
    nativePluginCopy: "opencode plugin list"
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
    loginArgs: [],
    nativePluginCopy: "pi list"
  },
  hermes: {
    models: [],
    steps: [],
    installCommand: 'cd ~/.hermes/hermes-agent && uv pip install -e ".[acp]"',
    docsUrl: "https://hermes-agent.nousresearch.com/docs/developer-guide/programmatic-integration",
    loginArgs: ["acp", "--setup"],
    loginBinary: "hermes",
    nativePluginCopy: "hermes plugins --help"
  },
  amp: {
    models: [],
    steps: [],
    installCommand: "curl -fsSL https://ampcode.com/install.sh | bash",
    docsUrl: "https://ampcode.com",
    loginArgs: ["login"],
    loginBinary: "amp",
    nativePluginCopy: "amp plugins repositories"
  },
  deepseek: {
    models: [
      { id: "deepseek-chat", label: "DeepSeek-V3 (Chat)" },
      { id: "deepseek-reasoner", label: "DeepSeek-R1 (Reasoner)" }
    ],
    defaultModel: "deepseek-chat",
    steps: [
      {
        manager: "npm",
        args: ["install", "-g", "@deepseek-ai/dsh"],
        uninstallArgs: ["uninstall", "-g", "@deepseek-ai/dsh"]
      }
    ],
    installCommand: "npm i -g @deepseek-ai/dsh",
    docsUrl: "https://github.com/deepseek-ai/deepseek-harness",
    loginArgs: ["web"],
    nativePluginCopy: "dsh plugin --profile acp add @openma/dsh-agents-plugins-bridge@latest"
  },
  omp: {
    models: [],
    steps: [],
    installCommand: "curl -fsSL https://omp.sh/install | sh",
    docsUrl: "https://ohmypi.xyz/",
    loginArgs: []
  },
  qwen: {
    models: [
      { id: "qwen3-coder-plus", label: "Qwen3 Coder Plus" },
      { id: "qwen3-max", label: "Qwen3 Max" }
    ],
    defaultModel: "qwen3-coder-plus",
    steps: [
      {
        manager: "npm",
        args: ["install", "-g", "@qwen-code/qwen-code"],
        uninstallArgs: ["uninstall", "-g", "@qwen-code/qwen-code"]
      }
    ],
    installCommand: "npm i -g @qwen-code/qwen-code",
    docsUrl: "https://github.com/QwenLM/qwen-code",
    loginArgs: [],
    nativePluginCopy: "qwen --help"
  },
  kimi: {
    models: [{ id: "kimi-k2.5", label: "Kimi K2.5" }],
    defaultModel: "kimi-k2.5",
    steps: [],
    installCommand: "See https://github.com/MoonshotAI/kimi-cli/releases",
    docsUrl: "https://github.com/MoonshotAI/kimi-cli",
    loginArgs: ["login"],
    nativePluginCopy: "kimi --help"
  },
  codebuddy: {
    models: [],
    steps: [
      {
        manager: "npm",
        args: ["install", "-g", "@tencent-ai/codebuddy-code"],
        uninstallArgs: ["uninstall", "-g", "@tencent-ai/codebuddy-code"]
      }
    ],
    installCommand: "npm i -g @tencent-ai/codebuddy-code",
    docsUrl: "https://www.codebuddy.cn/cli/",
    loginArgs: [],
    nativePluginCopy: "codebuddy --help"
  },
  glm: {
    models: [
      { id: "glm-4.7", label: "GLM-4.7" },
      { id: "glm-5", label: "GLM-5" }
    ],
    defaultModel: "glm-4.7",
    steps: [
      {
        manager: "npm",
        args: ["install", "-g", "glm-acp-agent"],
        uninstallArgs: ["uninstall", "-g", "glm-acp-agent"]
      }
    ],
    installCommand: "npm i -g glm-acp-agent",
    docsUrl: "https://github.com/stefandevo/glm-acp-agent",
    loginArgs: [],
    nativePluginCopy: "glm-acp-agent --help"
  },
  minimax: {
    models: [{ id: "MiniMax-M2.5", label: "MiniMax M2.5" }],
    defaultModel: "MiniMax-M2.5",
    steps: [
      {
        manager: "npm",
        args: ["install", "-g", "@minimax-ai/code"],
        uninstallArgs: ["uninstall", "-g", "@minimax-ai/code"]
      }
    ],
    installCommand: "npm i -g @minimax-ai/code",
    docsUrl: "https://github.com/MiniMax-AI",
    loginArgs: ["login"],
    nativePluginCopy: "mcode --help"
  },
  qoder: {
    models: [],
    steps: [
      {
        manager: "npm",
        args: ["install", "-g", "@qoder-ai/qodercli"],
        uninstallArgs: ["uninstall", "-g", "@qoder-ai/qodercli"]
      }
    ],
    installCommand: "npm i -g @qoder-ai/qodercli",
    docsUrl: "https://docs.qoder.com/cli/acp",
    loginArgs: [],
    nativePluginCopy: "qodercli --help"
  }
}
