/**
 * 各 CLI 的模型表与安装 / 登录配方。不写各家 auth.json。
 * 安装只列 npm / brew 白名单 argv；需要 curl|bash 的只给复制文本。
 */
import type { AgentToolId } from "@enjoy-agents/ipc-contract"
import {
  ANTIGRAVITY_MODELS,
  CLAUDE_MODELS,
  CODEX_MODELS,
  CURSOR_MODELS,
  GEMINI_MODELS,
  GROK_MODELS
} from "./models.ts"
import type { AgentToolCatalog } from "./types.ts"

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
    selfUpdateArgs: ["update"],
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
  droid: {
    models: [],
    steps: [
      {
        manager: "npm",
        args: ["install", "-g", "droid"],
        uninstallArgs: ["uninstall", "-g", "droid"]
      }
    ],
    installCommand: "npm i -g droid",
    docsUrl: "https://docs.factory.ai/cli/getting-started/overview",
    loginArgs: [],
    selfUpdateArgs: ["update"],
    nativePluginCopy: "droid plugin --help"
  },
  devin: {
    models: [],
    steps: [
      {
        manager: "brew",
        args: ["install", "--cask", "devin-cli"],
        uninstallArgs: ["uninstall", "--cask", "devin-cli"]
      }
    ],
    installCommand:
      process.platform === "win32"
        ? "irm https://static.devin.ai/cli/setup.ps1 | iex"
        : "curl -fsSL https://cli.devin.ai/install.sh | bash",
    docsUrl: "https://docs.devin.ai/cli",
    loginArgs: ["auth", "login"],
    selfUpdateArgs: ["update"],
    nativePluginCopy: "devin --help"
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
