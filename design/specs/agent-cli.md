# spec/agent-cli

> 本机 Agent CLI 工具箱：探测、配置、ACP 开流。最后更新：2026-09-06

## 当前真相

P0 已接线。聊天默认 Enjoy Local（ToolLoop + Providers）。Composer 用单个 AgentPicker 切本机 Claude / Cursor / Codex / Antigravity，走 **ACP stdio**。旧 Vercel Harness 只在 Enjoy 本地时可用。renderer 不探测 PATH、不 spawn。

| `runtimeId` / 传输 | 谁在跑 | 密钥 |
|---|---|---|
| `enjoy-local` / `local` | ToolLoop | Providers vault |
| `claude` `cursor` `codex` `antigravity` / `acp-host` | 本机 CLI + ACP | 各家 `login`；可选进程 env 注入 |
| 旧 `codingRuntime=harness` / `sdk-sandbox` | `HarnessAgent` + 沙箱 | Providers + Vercel token |

目录里还有 Gemini / OpenCode / Pi / Hermes / Amp / DeepSeek / OMP：能探测或投影技能，**不**在 P0 spawn。OMP 只是 Oh My Pi 技能根。

Antigravity 探测 `agy-acp` 再 `agy`。桥接 spawn `agy-acp`（无额外参数）；官方 CLI spawn `agy --acp`。自定义路径必须是该 CLI 白名单 basename 的绝对路径。

Composer：顶栏引擎导轨 + 下层面板。Enjoy 本地是供应商 + 模型；CLI 是该 CLI 模型表。未找到：白名单 `npm` / `brew` 安装，或复制官方命令；`curl \| bash` 只展示不执行。已安装可「打开登录」：`detached` spawn 官方 login argv，立即返回，不打开 pty。`agent.run` 带 `runtimeId`。触发器就绪灯按 `status === ready` 着色，不是永远绿灯。

设置 → 智能体：探测 / 安装 / 登录 / 模型 / 路径 / doctor。Claude / Codex 可绑定供应商：开流时注入 `ANTHROPIC_*` / `OPENAI_*`。用户点击「同步到本机」才写 `~/.claude/settings.json` 或 `~/.codex/config.toml`（先备份 `*.enjoy.bak`，文件 `0o600`，Codex 按标记块 merge）。恢复只还原备份。Composer **没有** Resume 控件。

## 不变量

- 只 spawn 该 CLI 目录白名单 basename（含自定义绝对路径）；`login` / `doctor` / ACP 同一套 `assertAllowedCommand`；`shell: false`；`cwd` = 工作区。
- 安装只跑配方里的 `npm` / `brew` argv，禁止用户自定义安装命令，禁止 `curl | bash`。
- 外部 CLI 不是默认内核。空配置 = Enjoy Local。
- 不编辑 `~/.codex/auth.json` / Claude credentials / Antigravity OAuth。模型选择只存在 Enjoy vault，靠 CLI `--model`。
- 写家目录配置必须用户点击、先备份、可还原；默认路径仍是进程 env，不是改各家 config。
- ACP `session/request_permission` → `approval.required`（HMAC），写盘 / bash 仍看现有审批偏好。
- Amp 与 OMP 不是同一个 id。

## 代码入口

- 目录与探测：`packages/agent-harness/src/agent-tools/`
- 模型表与安装配方：`packages/agent-harness/src/agent-tools/catalogs.ts`
- ACP：`packages/agent-harness/src/acp/`
- 覆盖与 IPC：`apps/desktop/src/main/services/agent-tools-*.ts`、`ipc-agent-tools.ts`
- 开流：`open-coding-stream.ts` → `streamAcpTurn`
- 设置 UI：`settings/agent-tools/`
- Composer：`agent-picker/`（输入框切 Agent / 模型 / 安装）
- 合约：`packages/ipc-contract/src/agent-tools.ts`

## 已知坑

- 官方 `@ai-sdk/harness-cursor` 要 `CURSOR_API_KEY` + 网络沙箱，和「本机已 login」不是一条路。本机 CLI 自写 ACP 薄客户端，不要把沙箱依赖带进 acp-host。
- Cursor 没有常驻 daemon；审批续跑复用同一 Enjoy `sessionId` 上的 ACP session。`dispose` 在 abort / 会话结束时再杀进程。换模型会拆掉该 session 再 spawn，带新的 `--model`。
- 中转 MiniMax 的 `reasoning_split` 与本领域无关；CLI 思考走 ACP `agent_thought_chunk`。
- `settings.get` / `agentTools.list` 只做 PATH 查找，不跑 `--version`，避免设置页卡数秒。version / `acp --check` 只走 `doctor`。
- ACP 审批只走 `waitForSubagentApproval` → `approval.required` + HMAC。`mapAcpUpdate` 不要再 yield 一份 approval，否则泵会误 park。
- renderer 不要 import `@enjoy-agents/agent-harness`（会把 `child_process` 打进渲染包）。用 `isAcpHostRuntimeId`（ipc-contract）或 `agentTools` 快照。
- 输入框不要拆「运行时 + 模型」两个控件。已安装 CLI 点左栏即切，右栏选该 CLI 模型；未安装给一键安装 / 复制命令，不要强制先去设置打勾。
- 同一 Enjoy `sessionId` 复用 ACP 进程。Regenerate 不会强制新开 CLI；上下文由 CLI 自己攒。Stop / fail 才 `disposeAcpTurn`。
- Composer 不要用纯图标 Tab：图标难认，未知 Agent 回退成 Enjoy 标会看起来像两个 Enjoy。左栏必须带名字；未知 id 用首字母，不要 `AppMark`。
- 官方 `agy` 的原生 `--acp` 仍可能未发布（上游 issue 追踪）。PATH 上有 `agy-acp` 时优先走桥接；只有 `agy` 且 `--acp` 失败时，让用户在设置里填 `agy-acp` 绝对路径，不要去读 Google 的 login 文件。
- Cursor CLI 没有可静默执行的 npm/brew 配方，一键安装会拒绝并让用户复制官方 `curl | bash`。Claude / Codex 走 `npm i -g`，Antigravity 走 `brew install antigravity-cli`。
- Finder 启动的 Electron PATH 常缺 brew/npm。探测会补 `/opt/homebrew/bin`、`/usr/local/bin`、`~/.local/bin`，但必须排在系统 PATH 后面，避免用户可写目录抢先。
- 供应商与 CLI：Enjoy 内部优先进程 env（`ANTHROPIC_BASE_URL` / `OPENAI_BASE_URL`）。写 `~/.claude/settings.json` / `~/.codex/config.toml` 仅用户点击「同步到本机」；必须先写 `*.enjoy.bak`，Codex 只改 `enjoy-agents` 标记块，恢复只还原备份。不要整文件覆盖。
- Composer 必须「顶部引擎导轨 + 下层面板」，不要三栏拼供应商+模型。
- 自定义路径若不校验 basename，`login` / `doctor` 会 spawn 任意绝对路径。vault 写入与这两条 IPC 必须走 `assertAllowedCommand`。
- ACP `initialize` / `session/new` 失败时子进程必须 `dispose`；同 session 并发用 in-flight 锁。`before-quit` / 删会话要 `disposeAllAcpSessions` / `disposeAcpSession`。
- 登录是 detached 后台进程，文案不要写成「打开终端」。
- Composer 没有 Resume。不要写进当前真相。
- `openDocs` 只允许 catalog 里的 https + host 白名单，不要只检查 `https://` 前缀。
