# spec/agent-cli

> 本机 Agent CLI 工具箱：探测、配置、ACP 开流。最后更新：2026-09-09

Usage L1–L4、三路命名与能力矩阵见 [`m1-usage-and-capabilities.md`](./m1-usage-and-capabilities.md)。

## 当前真相

ACP 宿主已接线：Claude / Cursor / **Grok Build** / Codex / Antigravity / Gemini / OpenCode / Pi（`pi-acp`）/ Hermes / Amp（`amp-acp`）/ DeepSeek（`dsh --profile acp`）/ Oh My Pi（`omp acp`）。聊天默认 Enjoy Local（ToolLoop + Providers）。Composer 用单个 AgentPicker 切本机 CLI，走 **ACP stdio**。旧 Vercel Harness 只在 Enjoy 本地时可用。renderer 不探测 PATH、不 spawn。

| `runtimeId` / 传输 | 谁在跑 | 密钥 |
|---|---|---|
| `enjoy-local` / `local` | ToolLoop | Providers vault |
| `claude` `cursor` `grok` `codex` `antigravity` `gemini` `opencode` `pi` `hermes` `amp` `deepseek` `omp` / `acp-host` | 本机 CLI + ACP | 各家 `login` / `authenticate`；DeepSeek 可选 `DEEPSEEK_API_KEY` 注入 |
| 旧 `codingRuntime=harness` / `sdk-sandbox` | `HarnessAgent` + 沙箱 | Providers + Vercel token |

Pi 官方协议是 `pi --mode rpc`，Enjoy 只 spawn 已安装的 `pi-acp`（禁止 `npx`、禁止把 `pi` 当 ACP）。Amp 官方没有 `amp acp`，只 spawn `amp-acp`，登录是 `amp login`。Gemini 用 `gemini --acp`（禁止 `--experimental-acp`）。OMP 是完整编码智能体（`omp acp`），不是技能根。DeepSeek 本机 CLI 是 `dsh --profile acp`，缺二进制不要回落 Enjoy Local。

Antigravity 探测 `agy-acp` 再 `agy`。桥接 spawn `agy-acp`（无额外参数）；官方 CLI spawn `agy --acp`。自定义路径必须是该 CLI 白名单 basename 的绝对路径。

Composer：顶部分组导轨 + 下层面板。「本地」只有 Enjoy Local（下层供应商 + 模型）；「本机助手 / CLI」已装与未装都上轨（未装点开下面板一键安装 / 复制命令）；即将推进溢出。OMP 左栏分三路：**catalog** = `omp auth-broker list` 的可 `/login` 供应商（OAuth / 设备码 / 粘贴密钥 / 本机引擎）；**custom** = `~/.omp/agent/models.yml` 或扩展注册、但不在 list 里的 id；已登录 = `omp models` 里出现过 selector。自定义只标「自定义」，**不画登录**（`auth-broker login` 会报 Unknown provider）。未登录 catalog 用实心「登录」；main **pipe stdin+stdout**，看见可空回车的提问（GitHub Enterprise）先写空行，再读 `Open this URL in your browser` 后 `shell.openExternal`，进程不 detach，好让 callback / device poll 活着。禁止 `stdio: ignore`（会把 URL 扔掉，也会让 readline 在打出 URL 前直接挂掉）。打开授权页只回 `browser_opened` / `device:<userCode>`，进程继续等 localhost callback / device poll；官方打印 `Credentials saved` 才 `logged_in` 并拉回 Enjoy 窗口。Picker 不得在打开页面时立刻当成已登录，必须 `inspect({ refresh: true })` 等到该 provider `loggedIn`。密钥供应商打开仪表盘后回 `needs_tui`。禁止读 `models.yml` 的 apiKey / headers 值，只抽 provider id。右栏才是该供应商模型，行首图标按 `cliModelFamilyKey` 走模型族（Claude / Gemini / GPT 等）；无族名回落引擎标，不要 `ProviderIcon` 插头，也不要一律画 Oh My Pi 灰圆。`inspect.providers` 未回时左栏显示「正在读取供应商」，不要假装「没有供应商」。进程 `exit 0` 或打开授权页都不是已登录。禁止把供应商名当成唯一模型，也不要把 Antigravity 一家同时带出的 Claude/Gemini 当成「只有一家所以不分栏」。胶囊/导轨项只画品牌、引擎名、模型、就绪灯（有额度才 `UsagePill`）。**禁止**常驻 `ACP · 订阅登录` / `本地 ToolLoop` / `ACP Stdio` 及同类协议路径微标。底栏按 `composerChromeFor(runtimeId)` 显隐：切到本机助手只留 `+`、审批盾牌、引擎胶囊、发送；Fast / 五档思考 / 执行模式 / 语音隐藏。切 runtime **不清空** store 里的 Fast / 思考档 / 模式。空会话直切并 `bindSessionRuntime`；有用户轮走 `EngineHandoffCard`，确认后 dispose 旧 ACP，brief 只进系统/隐藏上下文；确认卡与「已交接」微条互斥，取消不留微条。CLI 面板不写检测到的路径，也不写协议标签。未找到：白名单 `npm` / `brew` 一键安装 + 复制命令，文档为链接，无装饰粉边；`curl \| bash` 只展示不执行。已安装可「打开登录」：Picker 与设置共用 `completeCliEngineLogin` / `completeCliProviderLogin`，spawn 之后必须 `inspect({ refresh: true })` 等到 `authAccount.loggedIn`（OMP 还要等供应商 `loggedIn`）。禁止把 detached spawn 文案翻成已登录。`loggedIn===null` 是「检测」不是就绪。需登录时导轨可点开面板，但 `canBindEngine` 为假，发送口 `guardComposerSend` 拦下并打开 Picker。`ACP_AUTH_REQUIRED` 映射 `auth`，主钮打开登录，禁止跳供应商设置。设置「设为主引擎」走 `requestEngineSwitch`，有用户轮出交接坞。`agent.run` 带 `runtimeId`。胶囊就绪灯只信 `engineReadiness==="ready"`，不是 `status===ready`。沙箱不上导轨。协议/登录细节只进设置分段、能力矩阵、配置边界与文档。

每家一份静态 `RuntimeCapabilities`（`packages/ipc-contract/src/runtime-capabilities.ts`）。`list` 投影到 `AgentToolPublic.capabilities`。UI **不信** ACP `initialize.agentCapabilities`。未声明 = 不做。ACP 开流忽略 `fast` / `reasoningEffort` / 执行模式，不传 `session/set_mode`。纠偏对 ACP 是下一轮 `session/prompt` 文本，不是 Cursor 原生 steer。Enjoy 自定义说明经 `composeAcpPrompt` 垫在用户句前（`[Enjoy custom instructions]`），不把工作区 AGENTS.md 再灌一遍（CLI 自己读盘）。Enjoy Local Fast 开且 profile 有 `fastModelId` 才换模型。

设置 → 智能体：顶部分段（本机 CLI / **Registry** / 进阶沙箱 / 默认项）。本机 CLI 先卡后说明书。OMP 配置弹窗按供应商登录并等 callback，禁止无参 `login`。Registry 浏览内置目录并安装或复制命令，**不上** EngineRail。用户可添加 `custom:<slug>` stdio ACP（command/args/env/cwd，basename 白名单）。页顶提示「Enjoy 密钥不会传给 ACP」。CLI 卡在前；只读 **能力矩阵**（`RUNTIME_CAPABILITIES`）与 **配置边界** 收进默认收起的说明书。配置弹窗：探测 / 安装 / 卸载 / 登录 / 模型 / **运行偏好** / 路径 / doctor / **账号详情**。运行偏好只暴露 ACP 子命令真正认的旗标（`LAUNCH_PREFS` 目前为空，禁止为对称给 Cursor 加 Fast）；`--fast` / `--thinking` 按 capability 从 extraArgs 剥掉，否则 Cursor / Grok 会立刻 exit 1。默认不给空格分隔输入框。禁止把跳过审批的旗标做成开关。卸载只跑配方里写死的 `uninstallArgs`，UI 先 `ConfirmDialog`。Claude / Codex / DeepSeek 可绑定供应商（`providerBind`）：开流时注入 `ANTHROPIC_*` / `OPENAI_*` / `DEEPSEEK_API_KEY`。用户点击「同步到本机」才写 `~/.claude/settings.json` 或 `~/.codex/config.toml`（先备份 `*.enjoy.bak`，文件 `0o600`，Codex 按标记块 merge）。恢复只还原备份。`list` / `settings.get` 只做 PATH 查找，**不**读各家 `auth.json`。账号 / 额度 / 账号侧模型表走独立 `agentTools.inspect`，**只覆盖** `login || quota || models==inspect` 且已就绪的 CLI，**不含** Enjoy Local。只 spawn 官方公开子命令（`agent status|about|models`、`claude auth status`、`codex login status` / `codex doctor --json`、`grok models|inspect`、`agy models`、`opencode auth list|models`、`pi --list-models`、`omp models --json`、`omp auth-broker list --json`），`cwd` = 已登记工作区。Claude / Codex 账号来自这些命令 + Codex 配置里的 model/base_url（不读 api_key）。额度条只在 `quota=true` 且 inspect 有官方数字时画（Cursor Dashboard、Grok billing、Antigravity `quota_groups`）；Claude / Codex **不画空条**，诚实文案「该 CLI 无公开额度 API」。Composer 胶囊旁 `UsagePill` 同规则。L3 是 Composer 底 `SessionMeter`（无用量隐藏）。L4 是 `QuotaExhaustedCard`，不是泛化限流。禁止假填充与 5 小时/周度遥测条。Cursor 用量**只**走官方 Dashboard `GetCurrentPeriodUsage`（`includedSpend/limit`，与 Spending 文案一致，不用 `totalPercentUsed`，失败不回落 `about`/`status`）。Grok 用量**只**走官方 `cli-chat-proxy .../billing?format=credits`（`creditUsagePercent` = `/usage` 周额度），邮箱来自 `~/.grok/auth.json` 公开字段。会话 token 只在 main 用一次，不进 renderer、不写回文件。Antigravity 只用 `quota_groups.remaining_fraction` 换算已用；没有 groups 就空条，禁止对 `quota.models` 做 `100 - percentage`。卡片按当前模型族匹配额度组，未匹配不混族。禁止 90/95/100 套餐占位。Composer **没有** Resume / Fork / CLI 斜杠目录。

Grok Build：二进制 `grok`（安装目录常在 `~/.grok/bin`），ACP 为 `grok agent [--model] stdio`（`--model` 必须在 `stdio` 前），登录 `grok login`。安装是官方 `curl | bash`，只展示不执行。不要把 `~/.grok/bin/agent` 当成 Cursor。

## 不变量

- 只 spawn 该 CLI 目录白名单 basename（含自定义绝对路径）；`login` / `doctor` / `inspect` / ACP 同一套 `assertAllowedCommand`；`shell: false`；`cwd` = 工作区。
- `inspect` 只返回公开账号字段与官方打印的额度；禁止把 token / `hasAccessToken` 传给 renderer。
- 安装只跑配方里的 `npm` / `brew` argv，禁止用户自定义安装命令，禁止 `curl | bash`。
- 外部 CLI 不是默认内核。空配置 = Enjoy Local。
- 不编辑 `~/.codex/auth.json` / Claude credentials / Antigravity OAuth。模型选择只存在 Enjoy vault，靠 CLI `--model`。
- 写家目录配置必须用户点击、先备份、可还原；默认路径仍是进程 env，不是改各家 config。
- ACP `session/request_permission` → `approval.required`（HMAC），写盘 / bash 仍看现有审批偏好。
- Amp 与 OMP 不是同一个 id。Pi / Amp 的 companion 二进制只给登录与 inspect，不能当 ACP 入口。

## 代码入口

- 自定义 ACP / Registry：`agent-tools/custom-spawn.ts`、`coming-soon-promotion.ts`；UI `settings/agent-tools/acp-registry-*.tsx`
- 目录与探测：`packages/agent-harness/src/agent-tools/`
- 模型表与安装配方：`packages/agent-harness/src/agent-tools/catalogs/`
- ACP：`packages/agent-harness/src/acp/`
- 覆盖与 IPC：`apps/desktop/src/main/services/agent-tools-*.ts`、`ipc-agent-tools.ts`
- 开流：`open-coding-stream.ts` → `streamAcpTurn`
- 设置 UI：`settings/agent-tools/`
- Composer：`agent-picker/`（输入框切 Agent / 模型 / 安装）
- 合约：`packages/ipc-contract/src/agent-tools.ts`、`runtime-capabilities.ts`（静态保真表 + `composerChromeFor`）

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
- `list` / `settings.get` 若同步 spawn `auth status` / `agent models`，设置页会卡数秒。账号必须走 `agentTools.inspect`，UI 异步合并。`detect` / `doctor` / 登录会清空 main 缓存；设置页挂载与扫描会 `invalidate` inspect，且 refetch 带 `refresh: true`。
- 额度条跟 `capabilities.quota`：Claude / Codex `quota=false`，已登录只显示账号、不画空条。Cursor / Grok / Antigravity 才画条，百分比钉在右侧且不截断。数字必须是官方已用进度。Cursor CLI / `about` 不打印用量，要读 IDE `state.vscdb` 会话后打 Dashboard；用 `includedSpend/limit` 或 `displayMessage`，不要 `totalPercentUsed`，Dashboard 失败不要回落 `about`/`status` 猜数。Grok CLI 没有 `usage` 子命令，`/usage` 对应 billing API；可读 `auth.json` 的 email，`key` 只在 main 调官方接口。Antigravity 的 `remaining_fraction` 是剩余；没有 `quota_groups` 就空条，不要把 `quota.models` 当剩余再 `100 - n`。禁止写死 90 / 95 / 100。Enjoy Local 不走 `inspect`，不要把 vault 名 / `baseURL` 当账号详情。模型族必须严格匹配（Claude 不吃 GPT-only 组），未匹配不回落全部组。
- Composer 底栏只信静态 `RuntimeCapabilities`，不要用 ACP `initialize.agentCapabilities` 自动开 Fast / Mode / slash（各家会撒谎）。切 Cursor 看不到 Fast / 思考档 / 执行模式；切回 Enjoy Local 三件套回来，store 里的 Fast 状态保留。
- ACP 纠偏是下一轮 `session/prompt` 文本，不是 Cursor 原生 steer 通道。不要为此画第二套控件。
- Enjoy Local Fast 开着但没配 `fastModelId` = 本轮不换模型，不要假装进了极速。
- 禁止为对称给 Cursor 加 Fast 开关或往 `LAUNCH_PREFS` 填 `--fast`。将来有安全旗标必须先写进 capability 再进那张表。
- 新 ACP 宿主：`initialize` 后 `session/new`；若 `auth_required`，只对 **agent** 型 `authMethods` 调 `authenticate` 再重试一次。**terminal** 型抛 `ACP_AUTH_REQUIRED`，UI 走官方 login / `--setup`，不要在 Composer 嵌 PTY。不要广告未实现的 `terminal` / elicitation clientCapabilities。
- Gemini 必须 `gemini --acp`。`--experimental-acp` 易挂，禁止回退。
- Amp 没有官方 `amp acp`。只 spawn `amp-acp`，并把 `AMP_CLI_PATH` 指到 `amp`。登录 `amp login`，不要 `amp-acp login`。
- Pi 官方是 RPC。Enjoy 本轮不自研 RPC；只 spawn `pi-acp`。能聊、Diff/审批可能被适配器削平。禁止 spawn 时 `npx pi-acp`。
- OMP 是 `omp acp` 编码智能体，不是 `~/.omp/skills` 技能根。不要标 `skillOnly`。
- `omp models` 默认是按供应商分组的盒表，表头 `google-antigravity (N)` 会被旧解析当成唯一「模型」。必须走 `omp models --json`（或拆表行）得到 `google-antigravity/gemini-3.6-flash`。禁止把供应商名当成可选模型，也不要把 Antigravity CLI（`agy`）和 OMP 的 `google-antigravity` 供应商合成一个引擎。
- OMP 右栏若用 `AgentBrandIcon(omp)`，所有 Claude / Gemini 都会变成灰圆字母 O。必须先用 `cliModelFamilyKey` 再走 `ModelBrandIcon`；无族名回落引擎标（如 `google-antigravity` → Antigravity），不要 `ProviderIcon` 插头。Cursor 等无斜杠模型表才画引擎标。
- `status===ready` 只表示 PATH 上有二进制。`loggedIn===null`（inspect 未回）必须标「检测」，禁止当绿灯、禁止 bind、禁止发送。发送闸：`inspecting` 设 `NEED_CLI_INSPECTING`，**不要**开 Picker、不要 `NEED_CLI_LOGIN`。只有 `needs_login` / `missing` 才开登录坞。`inspect` 必须 `allSettled` + 当前引擎优先；一家 Hermes/OMP 失败不能让全家停在 `loggedIn==null`。`applyInspect` 缺 `authAccount` 时保留旧值。非 OMP 的 detached `login` 回执 `ok` 也不是已登录，必须 `waitCliEngineReady` 等到 `authAccount.loggedIn`。
- 进程 `exit 0` ≠ `logged_in`。GitHub device 打开页后进程可能还活着；若提前退出且只写了 `opened`，必须 `failed`，禁止 `finish({ message: "logged_in" })` 抢焦点。只有官方打印 `Credentials saved`（`decideOmpLogin` 的 `done`）才算完成。
- `extractLoginUrl` 禁止抓任意 `https://`。GitHub Enterprise 提示或文档链接若先出现，会跳过空回车、永远打不出 device URL。只认 `Open this URL in your browser` 下一行。
- `inspect.providers` 只在异步 inspect 合并后才有。未回时 OMP 仍要分栏，但必须显示「正在读取供应商」，不要只剩「全部模型」假装没有供应商。`applyInspect` 在 `hit.providers` 缺省时保留旧表，不要写成 `[]`。
- OMP 左栏不能只按已出现的模型 selector 分栏：`google-antigravity` 一家就会同时列出 Claude + Gemini，看起来像「已经有多家」其实只登了一家。必须列 `omp auth-broker list --json` 全表（约 70 家可 `/login`）；已登录 = 该 id 在 models 里出现过。`models.yml` 自定义**不在** list 里，有凭证才会进 `omp models`；没有凭证时只能从 yml **抽 id**（禁止读 apiKey）才能显示，且不能点登录。`omp auth-broker login` **只往 stdout 打 URL，自己不打开浏览器**。更坑的是官方会先 `readline.createInterface`：`github-copilot` 在打 `https://github.com/login/device` 之前先问 Enterprise 域名（空回车 = github.com）。`stdio: ignore` 会让 readline 立刻 `ERR_USE_AFTER_CLOSE`，GitHub 永远打不出 URL，按钮卡在「正在打开授权」。必须 `stdio: pipe`，看见 `blank for github.com` 写空行，再抽 URL / `Enter code:`。环回 OAuth（Gemini 等）同样不能在打出 URL 后把进程打死，否则 localhost callback 没了。更常见的体感坑：打开 URL 立刻 `invalidate` inspect，左栏仍是未登录；浏览器完成后没有第二次 refresh，用户以为「没有回调回来」。必须等 `Credentials saved` 再清缓存，UI 轮询 inspect，并在完成后 `app.focus`。禁止无参 `omp auth-broker login`。Fireworks / Exa / HuggingFace / GitLab 会先打仪表盘或授权 URL，再要粘贴 key / `vscode://` 回调——可以 `openExternal`，但不能代填，回 `needs_tui`。本机 `ollama` / `lm-studio` / `llama.cpp` / `vllm` 先要引擎在跑。不要读 `~/.omp/agent/agent.db`，也不要把 `auth-broker status` 当成本地登录态。禁止把 token 或授权 URL 传给 renderer；设备用户码可以进回执 `device:XXXX-XXXX`。
- 未装 CLI 不要收成「未安装 N」让人点不到安装。未装上轨，用中性胶囊「未装」而不是名字底下第二行灰字；下面板一键安装 / 复制命令。即将推出才进溢出。
- DeepSeek Harness 的 `dsh --profile acp` 仍是 developer preview，argv 以 `--help` 为准。旧 Vercel Harness `deepseek` 适配器仍占位，和本机 CLI 不是一条路。C 端导轨必须把它和 Oh My Pi 放进「本机助手 / CLI」，副标题只写未安装/需登录，禁止看起来像 Enjoy Local 的 BYOK 供应商。
- C 端胶囊/导轨禁止常驻 `ACP · 订阅登录` / `本地 ToolLoop` / `ACP Stdio` 及同类协议路径微标。协议/登录只留设置能力矩阵、配置边界与文档，不上 Composer picker。
- 七家新 CLI 本轮 `quota=false`。没有官方 usage 子命令就不画额度条。
- ACP 复用进程的 key 必须含 `toolId`。漏掉时 Claude→Cursor 会假续跑旧 stdio。有用户轮切引擎必须 `disposeSession` + `setHandoff`；brief 只进系统/隐藏上下文，禁止用户首条附注。
- 本阶段不实现 `session/set_mode`、Composer 假 slash 目录、`session/load`、跨 Agent 委派、寄生 Codex Desktop / SSH。Pi / OMP / Hermes 原生 RPC 或 TUI gateway 另开一轮。
- ACP 事件保真：`tool_call` content `type=diff` 写入 args 并 `file.changed`（Review / File Diff 能看）。`available_commands_update` **丢掉**，禁止 `structured.delta` 进气泡、禁止画假 slash。提问走 `session/request_permission` 的 `questions` → 工具名 `ask_user_questions`（现有 Fluid Dock），**不要**从 `mapAcpUpdate` 再 yield `approval.required`。附件写成工作区相对路径清单，不把二进制灌进 JSON-RPC，也不再写「未转发」。`models:"none"`（Hermes / Amp）空态写「将使用 CLI 默认模型」，不要「未找到模型」。
- 禁止写死「Cursor Pro User / 月度 Fast 额度」。
- 禁止把 token / `key` / `refresh_token` 传给 renderer，也不要写回 `auth.json` / `state.vscdb`。不读 `~/.codex/auth.json` / `~/.claude.json`。
- Grok spawn 不能把 `--model` 接到 `stdio` 后面。
- `~/.grok/bin` 必须补进探测 PATH，且排在系统 PATH 后面。不要探测名为 `agent` 的 Grok 别名，避免抢 Cursor。
- 卸载 argv 必须写在 catalog `uninstallArgs`，不要从 install 的最后一个参数拼。Cursor 没有配方，只给复制官方命令。
- 配置弹窗不要默认给 `extraArgs` 文本框。`--always-approve` / `--yolo` / `skip-permissions` 禁止做成开关。未收录旗标只出现在高级自定义。
- 自定义 ACP 的 command 必须走 `assertCustomAllowedCommand`（目录 basename 白名单）。禁止 `bash` / `node` / `npx`。cwd 自定义路径要存在且为绝对目录。
- M4 只把 OpenCode → Gemini → Pi 在硬条件全过时标 available。不要手改另外几家 comingSoon 假装已接线。
- Cursor `agent acp` 几乎只认 `--help`。Composer 极速 / 思考**不要**追加 `--fast` / `--thinking`，否则官方报 `unknown option '--fast'` 并 `ACP process exited with 1`。开流前必须丢掉这些旗标。Grok `agent stdio` 同样不认 `--fast`。ACP 退出要把 stderr 末几行带进错误，不要只报退出码。
