# spec/agent-cli

> 本机 Agent CLI 工具箱：探测、配置、ACP 开流。最后更新：2026-09-20  
> 协议摘录见 [`../references/acp-protocol.md`](../references/acp-protocol.md)。

Usage L1–L4、三路命名与能力矩阵见 [`m1-usage-and-capabilities.md`](./m1-usage-and-capabilities.md)。

## 当前真相

ACP 宿主已接线：Claude / Cursor / **Grok Build** / Codex / Antigravity / Gemini / OpenCode / Pi（`pi-acp`）/ Hermes / Amp（`amp-acp`）/ DeepSeek（`dsh --profile acp`）/ Oh My Pi（`omp acp`）/ **Qwen Code** / **Kimi CLI** / **CodeBuddy** / **GLM Agent** / **MiniMax Code** / **Qoder CLI**。聊天默认 Enjoy Local（ToolLoop + Providers）。Composer 用单个 AgentPicker 切本机 CLI，走 **ACP stdio**。旧 Vercel Harness 只在 Enjoy 本地时可用。renderer 不探测 PATH、不 spawn。

Composer 思考档：**Enjoy 本地**仍是五档 `reasoningEffort`。本机助手不画那条能量条。Grok / Claude / Codex 用静态种子（ACP `configId`：Grok/Codex `reasoning_effort`，Claude `effort`）+ 开流后 `session/new` 的 `configOptions` 覆盖；改档走 `session/set_config_option`，回执完整表回写 Composer。**禁止** `--thinking` 塞进 ACP argv，也禁止把 Enjoy 本地 `reasoningEffort` 串进 ACP `thoughtLevel`。Cursor / Gemini / Antigravity 仍是「思考 · 跟模型」。没广告且无种子的引擎（含多数国产 CLI 在 live 广告前）不画思考控件。协议细节见 [`../references/acp-protocol.md`](../references/acp-protocol.md)。

| `runtimeId` / 传输 | 谁在跑 | 密钥 |
|---|---|---|
| `enjoy-local` / `local` | ToolLoop | Providers vault |
| `claude` `cursor` `grok` `codex` `antigravity` `gemini` `opencode` `pi` `hermes` `amp` `deepseek` `omp` `qwen` `kimi` `codebuddy` `glm` `minimax` `qoder` / `acp-host` | 本机 CLI + ACP | 各家 `login` / `authenticate`；DeepSeek 可选 `DEEPSEEK_API_KEY` 注入；GLM 用 Coding Plan Key |
| 旧 `codingRuntime=harness` / `sdk-sandbox` | `HarnessAgent` + 沙箱 | Providers + 隔离令牌 |

Pi 官方协议是 `pi --mode rpc`，Enjoy 只 spawn 已安装的 `pi-acp`（禁止 `npx`、禁止把 `pi` 当 ACP）。Amp 官方没有 `amp acp`，只 spawn `amp-acp`，登录是 `amp login`。Gemini 用 `gemini --acp`（禁止 `--experimental-acp`）。OMP 是完整编码智能体（`omp acp`），不是技能根。DeepSeek 本机 CLI 是 `dsh --profile acp`，缺二进制不要回落 Enjoy Local。

Antigravity 探测 `agy-acp` 再 `agy`。桥接 spawn `agy-acp`（无额外参数）；官方 CLI spawn `agy --acp`。自定义路径必须是该 CLI 白名单 basename 的绝对路径。

Composer：顶部分组导轨 + 下层面板。「本地」只有 Enjoy Local（下层供应商 + 模型）；「本机助手 / CLI」已装与未装都上轨（未装点开下面板一键安装 / 复制命令）；即将推进溢出。OMP 左栏分三路：**catalog** = `omp auth-broker list` 的可 `/login` 供应商（OAuth / 设备码 / 粘贴密钥 / 本机引擎）；**custom** = `~/.omp/agent/models.yml` 或扩展注册、但不在 list 里的 id；已登录 = `omp models` 里出现过 selector。自定义只标「自定义」，**不画登录**（`auth-broker login` 会报 Unknown provider）。未登录 catalog 用实心「登录」；main **pipe stdin+stdout**，看见可空回车的提问（GitHub Enterprise）先写空行，再读 `Open this URL in your browser` 后 `shell.openExternal`，进程不 detach，好让 callback / device poll 活着。禁止 `stdio: ignore`（会把 URL 扔掉，也会让 readline 在打出 URL 前直接挂掉）。打开授权页只回 `browser_opened` / `device:<userCode>`，进程继续等 localhost callback / device poll；官方打印 `Credentials saved` 才 `logged_in` 并拉回 Enjoy 窗口。Picker 不得在打开页面时立刻当成已登录，必须 `inspect({ refresh: true })` 等到该 provider `loggedIn`。密钥供应商打开仪表盘后回 `needs_tui`。禁止读 `models.yml` 的 apiKey / headers 值，只抽 provider id。右栏才是该供应商模型，行首图标按 `cliModelFamilyKey` 走模型族（Claude / Gemini / GPT 等）；无族名回落引擎标，不要 `ProviderIcon` 插头，也不要一律画 Oh My Pi 灰圆。`inspect.providers` 未回时左栏显示「正在读取供应商」，不要假装「没有供应商」。进程 `exit 0` 或打开授权页都不是已登录。禁止把供应商名当成唯一模型，也不要把 Antigravity 一家同时带出的 Claude/Gemini 当成「只有一家所以不分栏」。胶囊/导轨项只画品牌、引擎名、模型、就绪灯（有额度才 `UsagePill`）。**禁止**常驻 `ACP · 订阅登录` / `本地 ToolLoop` / `ACP Stdio` 及同类协议路径微标。底栏按 `composerChromeFor(runtimeId)` 显隐：切到本机助手只留 `+`、审批盾牌、引擎胶囊、发送；Fast / 五档思考 / 执行模式 / 语音隐藏。切 runtime **不清空** store 里的 Fast / 思考档 / 模式。空会话直切并 `bindSessionRuntime`；有用户轮走 `EngineHandoffCard`，确认后 dispose 旧 ACP，brief 只进系统/隐藏上下文；确认卡与「已交接」微条互斥，取消不留微条。同 `runtimeId` 换模型不是 handoff：Composer 顶栏模型芯片只列当前引擎 advertised / 档案模型，经 `setSessionRuntime.modelId` 写会话覆盖；`models===none` 禁用。ACP 可拆**子进程** session 再 spawn `--model`，Enjoy session id 不变，不是 M3 handoff，C 端不写「已切换引擎」「换模会重开会话」。见 I1 短锁。SSH 工作区时 ACP spawn 经本机 `ssh` 跑远端 catalog basename，cwd 是远端路径，本机 argv 不是远端 CLI 假路径。CLI 面板不写检测到的路径，也不写协议标签。未找到：白名单 `npm` / `brew` 一键安装 + 复制命令，文档为链接，无装饰粉边；`curl \| bash` 只展示不执行。已安装可「打开登录」：Picker 与设置共用 `completeCliEngineLogin` / `completeCliProviderLogin`，spawn 之后必须 `inspect({ refresh: true })` 等到 `authAccount.loggedIn`（OMP 还要等供应商 `loggedIn`）。禁止把 detached spawn 文案翻成已登录。`loggedIn===null` 是「检测」不是就绪。仅官方四家（Cursor / Grok / Antigravity / Amp）走登录闭环：检测中 / 打开授权中 / 已登录 / 失败人话，视觉真源 [`previews/cli-a-official-login.html`](../previews/cli-a-official-login.html)（锁 tip `a0ac8f5`）。打开授权回 `browser_opened` 只进入「授权中」，必须 `inspect` 确认 `loggedIn` 才就绪；失败一行人话 + 重试，动力源仍是「官方登录 · …」；抽屉无假 vault。需登录时导轨可点开面板，但 `canBindEngine` 为假，发送口 `guardComposerSend` 拦下。`authorizing` / `inspecting` 不开登录坞；`needs_login` / `login_failed` / `missing` 才开 Picker。`ACP_AUTH_REQUIRED` 映射 `auth`，主钮打开登录，禁止跳供应商设置。设置「设为主引擎」走 `requestEngineSwitch`，有用户轮出交接坞。`agent.run` 带 `runtimeId`。胶囊就绪灯只信 `engineReadiness==="ready"`，不是 `status===ready`。沙箱不上导轨。协议/登录细节只进设置分段、能力矩阵、配置边界与文档。

每家一份静态 `RuntimeCapabilities`（`packages/ipc-contract/src/runtime-capabilities.ts`）。`list` 投影到 `AgentToolPublic.capabilities`。UI **不信** ACP `initialize.agentCapabilities`。未声明 = 不做。ACP 开流忽略 `fast` / 执行模式，不传 `session/set_mode`。思考档认 `session/new.configOptions` 的 `thought_level`，改档走 `session/set_config_option`（`agentTools.setConfigOption`）；无活会话则等下一轮 `session/new`。Grok / Claude / Codex 在广告到达前用静态种子。禁止 `--thinking` argv。纠偏对 ACP 是下一轮 `session/prompt` 文本，不是 Cursor 原生 steer。Enjoy 自定义说明与宿主技能索引经 `composeAcpPrompt` 垫在用户句前（`[Enjoy custom instructions]`），不把工作区 AGENTS.md 再灌一遍（CLI 自己读盘）。P0-S：CLI **只消费** Enjoy `#/mcp` / `#/skills` 投影（`hostExtensionsFor` + `host.inject`），不把 `~/.claude|codex|…/skills` 或 `dsh plugin add` 当第二 SoT；不在宿主跑 Cordis / hooks / `plugin.ts`。Enjoy Local Fast 开且 profile 有 `fastModelId` 才换模型。

设置 → 智能体：顶部分段（本机 CLI / **Registry** / 进阶沙箱 / 默认项）。本机 CLI 先同构表后说明书。进阶沙箱 C 端字段是隔离令牌 / 团队 ID / 项目 ID，不上品牌名，也不上 Composer 导轨。未找到密表行：主槽可「一键安装 / 安装中… / 重试」；失败必须一行人话原因 + 复制，禁止假进度条（见 [`previews/p0-sandbox-debrand-install-states.html`](../previews/p0-sandbox-debrand-install-states.html)）。CLI-B（Pi / Hermes / 自定义 ACP）与密表 / Registry 同构，视觉锁 [`previews/cli-b-registry-install.html`](../previews/cli-b-registry-install.html)（锁 tip `6c02931`）：未找到有 npm/brew 配方才一键（Pi），否则仅复制（Hermes / OMP / 自定义），禁止假就绪、假一键；已装未就绪动力源写「官方登录 · 检测中/未登录」，自定义永远 —，禁止假 BYOK；检测中主槽「检测中…」，≠ 绿灯就绪；无公开账号探针的 `inspect` 回 `loggedIn: false`，禁止永远停在检测中。OMP 配置弹窗按供应商登录并等 callback，禁止无参 `login`。Registry 未找到详情写「还没装好这个助手」+ 安装命令，有配方一键否则复制为主，**不上** EngineRail。用户可添加 `custom:<slug>` stdio ACP（command/args/env/cwd，basename 白名单）。env 值落盘前经 `safeStorage` 加密（`enc:` 前缀标记，读写边界加解密；加密不可用回退明文），不要把 `*_API_KEY` 明文写进 settings JSON。页顶：管理供应商 / 扫描 / 体检 + 一行可关提示「Enjoy 密钥不会带过去」。CLI **密表**在前（助手 | 动力源 | 操作），1:1 [`previews/local-cli-dense-p0.html`](../previews/local-cli-dense-p0.html)（锁 tip `8bd7f6e`，唯一真源）。助手列：品牌 · 名 · 状态点（已安装 / 未找到 / 规划）；`homeSynced` 才在名旁画「已同步」，「官方仍保留」只进抽屉。次行只拼 `{version} · {路径短名}`（Enjoy `— · 内置`，缺段 `—`），禁止 doctor / 安装长句；过旧 / 不兼容例外 1:1 [`previews/p0-e-cli-outdated.html`](../previews/p0-e-cli-outdated.html)（锁 tip `4d33f07`）：助手列警告点「需更新」，次行可写 `需更新 · v1.2（要 ≥1.5）`，升级后回到版本 · 路径短名。动力源同构贴左：全状态统一轻胶囊与状态微标点（绿/蓝/黄/灰/浅灰）；去除非必要的「供应商 · 」与「官方登录 · 」机械前缀；自选/OMP显示为加权层次「档案 / 模型」；官方直连显示「官方直连」（绿点）/「官方账号 · 未登录」（浅灰点）/「正在检测...」（脉冲点）；未安装项显示弱态轻胶囊「需先安装」强呼应操作列；自定义ACP为「—」。只信 `providerBind`，自定义 `classifyPowerSource=none`，不造假 vault。操作列定宽主槽（设为主引擎 / ✓ 当前 / 一键安装 / 检测中…，复制-only 留空）+ 图标次钮（⚙ 配置 / 复制）。助手列已装但 `loggedIn==null` 画「检测中…」，不是「已安装」绿灯。列表不画额度条、「额度进配置」、doctor、邮箱、绝对路径、能力芯片、表底协议词。Cursor/Grok 已装仍有动力源行。只读 **能力矩阵**（`RUNTIME_CAPABILITIES`）与 **配置边界** 收进默认收起的说明书。配置走右侧抽屉（同壳、**576px**、顶栏名称+配置提示+关闭），所有助手同一壳：正文顶信任卡 1:1 [`previews/p0-b-drawer-trust.html`](../previews/p0-b-drawer-trust.html)（锁 tip `f48ab0d`）——健康四态 + 次级「运行体检」；过旧健康行另认 [`previews/p0-e-cli-outdated.html`](../previews/p0-e-cli-outdated.html)：`版本过旧 · 当前 v1.2 · 需要 ≥1.5` +「查看更新说明 / 复制更新命令」，动力源可留「官方登录 · 已登录」+「需更新」旁标，主槽禁设为主引擎，发送闸「请先更新本机助手」，禁止绿灯就绪 / 自动强制升级 / 假 BYOK；抽屉正文随后沉浸嵌入专属「用量与额度」板块（`AgentToolUsageSection`，聚合官方额度进度条、本地今日/昨日/近30天Token消耗汇总、30天趋势 Sparkline、官方控制台直达外链与直达订阅大盘），再才是「这个助手用」。「这个助手用」永远是决策位。可绑：标签+双行（账号行只写档案名，模型单独一行）→ 也用于圆片（不含沙箱）→ 同步次级 `<details>`。仅官方：只读登录态 + 登录 CTA，禁止假 vault 下拉。OMP：同一槽、文案「OMP 供应商」，不是 Enjoy 档案。绑了 Enjoy 档案后，`inspect.authAccount` 只作「官方登录仍保留 · 仅系统终端」旁注，禁止把 inspect 名 / CUSTOM / 当前模型 / 邮箱画成当前供应商。运行偏好只暴露 ACP 子命令真正认的旗标（`LAUNCH_PREFS` 目前为空，禁止为对称给 Cursor 加 Fast）；`--fast` / `--thinking` 按 capability 从 extraArgs 剥掉，否则 Cursor / Grok 会立刻 exit 1。默认不给空格分隔输入框。禁止把跳过审批的旗标做成开关。卸载只跑配方里写死的 `uninstallArgs`，UI 先 `ConfirmDialog`。供应商引用见下节。`list` / `settings.get` 只做 PATH 查找，**不**读各家 `auth.json`。账号 / 额度 / 账号侧模型表走独立 `agentTools.inspect`，**只覆盖** `login || quota || models==inspect` 或带 `requiredVersion` 且已就绪的 CLI，**不含** Enjoy Local。`inspect` 把官方 `cliVersion` 或 `--version` 并进 `version`，list 投影 `requiredVersion`（`CLI_MIN_COMPATIBLE`），低于要求则 `engineReadiness==="outdated"`。只 spawn 官方公开子命令（`agent status|about|models`、`claude auth status`、`codex login status` / `codex doctor --json`、`grok models|inspect`、`agy models`、`opencode auth list|models`、`pi --list-models`、`omp models --json`、`omp auth-broker list --json`），`cwd` = 已登记工作区。Claude / Codex 账号来自这些命令 + Codex 配置里的 model/base_url（不读 api_key）。额度条只在 `quota=true` 且 inspect 有官方数字时画（Cursor Dashboard、Grok billing、Antigravity `quota_groups`）；Claude / Codex **不画空条**，诚实文案「该 CLI 无公开额度 API」。Composer 胶囊旁 `UsagePill` 同规则。L3 是 Composer 底 `SessionMeter`（无用量隐藏）。L4 是 `QuotaExhaustedCard`，不是泛化限流。禁止假填充与 5 小时/周度遥测条。Cursor 用量**只**走官方 Dashboard `GetCurrentPeriodUsage`（`includedSpend/limit`，与 Spending 文案一致，不用 `totalPercentUsed`，失败不回落 `about`/`status`）。Grok 用量**只**走官方 `cli-chat-proxy .../billing?format=credits`（`creditUsagePercent` = `/usage` 周额度），邮箱来自 `~/.grok/auth.json` 公开字段。会话 token 只在 main 用一次，不进 renderer、不写回文件。Antigravity 只用 `quota_groups.remaining_fraction` 换算已用；没有 groups 就空条，禁止对 `quota.models` 做 `100 - percentage`。卡片按当前模型族匹配额度组，未匹配不混族。禁止 90/95/100 套餐占位。Composer **没有** Resume / Fork / 把 ACP `available_commands` 画成 Composer 斜杠条（那些进 ⌘L）。Enjoy Local 自己的 `/` 只列模式命令与已安装技能，不是 CLI 假目录。

### 供应商引用（应用 vs 同步）

交互目标（下拉选来源、模型族标、也用于其他助手、禁止空 Enjoy）见 [`cli-bind-ux.md`](../references/cli-bind-ux.md)。下面是开流与家目录的当前真相。

Enjoy 只有一份 Providers vault。智能体只引用档案，不在智能体页做供应商 CRUD，也不做 `127.0.0.1` 协议代理。

`providerBind`：`claude=anthropic`、`codex=openai`、`deepseek=deepseek`、`gemini=google`、`opencode=opencode`。Cursor / Grok / Antigravity / Amp / 自定义 ACP = `none`（列表仍画「官方登录 · 已登录/未登录」，抽屉只读官方态，**禁止假 BYOK**）。OMP 也是 `none`，但动力源槽文案是「OMP 供应商」，不是 Enjoy vault。兼容过滤走 `providersCompatibleWith`：DeepSeek 放宽支持所有 OpenAI 兼容供应商（`kind=deepseek`、`style=openai`、`kind=openai`、`kind=siliconflow` 等，因 dsh 原生使用 OpenAI 协议）；Claude 仅 Anthropic；Codex 仅 OpenAI；Gemini 仅 Google。分类见 `classifyPowerSource`，不要按品牌特判 Cursor/Grok。

- **应用（默认）**：打开 `useCustomProvider` 后，Enjoy 开该 ACP 注入子进程 env + `--model`。不点同步，系统终端里的同名 CLI 仍用自己的登录。绑定档案没 Key 时开流失败（「先在供应商里保存密钥」），禁止静默退回官方登录。env 键：Claude `ANTHROPIC_*`（含 `ANTHROPIC_MODEL`）、Codex `OPENAI_*`、DeepSeek `DEEPSEEK_*`、Gemini `GEMINI_*`、OpenCode `ENJOY_OPENCODE_KEY` 外加协议对应键。
- **同步到本机**：用户点击才写家目录，先 `*.enjoy.bak`，文件 `0o600`，恢复只还原备份。不读不写 `auth.json` / Claude credentials。
  - Claude：`~/.claude/settings.json` 的 `env`（`ANTHROPIC_BASE_URL` / `AUTH_TOKEN` / `ANTHROPIC_MODEL`）
  - Codex：`~/.codex/config.toml` 标记块内 `model_provider = "enjoy"` + `[model_providers.enjoy]`（`env_key = "OPENAI_API_KEY"`，**禁止**顶层 `api_key`）；`openai-responses` → `wire_api=responses`，纯 Chat Completions 可能不可用
  - OpenCode：`~/.config/opencode/opencode.json` 的 `provider.enjoy`，`apiKey: "{env:ENJOY_OPENCODE_KEY}"`
  - Gemini：`~/.gemini/.env` Enjoy 标记段 `GEMINI_*`
  - DeepSeek：只 env，没有稳定官方文件，不同步家目录
- 本机 CLI **表行**动力源列永远在：可绑=`供应商 · 档案 · 模型` 或 `官方登录 · 已登录/未登录/检测中/授权中/失败`；仅官方=`官方登录 · 已登录/未登录/检测中/授权中/失败`；OMP=`OMP 供应商 · … · 模型`；未找到 / 空=`—`。列表可写短路径 `bin/xxx`，禁绝对路径 / 额度 / 邮箱 / 协议微标。`list` 投影 `homeSynced`（只看 `*.enjoy.bak`）。配置是右侧抽屉。「这个助手用」永远在官方账号区之前。可绑才是一条下拉（官方登录 + 可筛选档案，多协议才分组）。支持「快速填入 API Key」就地配置浮层（填 Key / Base URL、连通性测试、安全存入 Vault 并自动绑定为动力源）；保留菜单外次级链「添加供应商档案」跳转 `#/settings/providers` 完整管理，禁止菜单内「+ 添加 {品牌} 供应商」。仅官方没有这条下拉，也没有添加链。绑定后 Composer 胶囊正文仍是引擎 · vault 模型，档案名进 title；Composer 模型表**只列该档案 models[]**。图标按 `cliModelFamilyKey`；认不出族回落档案 `ProviderIcon`。`engineReadiness`：`useCustomProvider + providerId` 时**不走**官方 `needs_login` / `inspecting`；档案没 Key 才 `needs_key`。`upsert` / 开流再跑 `providersCompatibleWith`。也用于其他兼容 CLI 用短标签，**不上沙箱**。同步到本机默认折叠。`#/settings/agent?tool=<id>` 闪行。供应商 Configured 芯片反链；删除仍被引用先解绑。会话运行遇到「远端未找到 {bin}」时，`ThreadErrorBanner` 分类为 `remote_cli_missing`，展示智能引导卡片并提供「一键切换为 Enjoy 本地运行」与「复制远端安装命令」。

Grok Build：二进制 `grok`（安装目录常在 `~/.grok/bin`），ACP 为 `grok agent [--model] [--plugin-dir <host-plugin>] stdio`（`--model` / `--plugin-dir` 必须在 `stdio` 前），登录 `grok login`。`--plugin-dir` 指向 Enjoy 收成的宿主技能包装（`plugin.json` + `skills/`，无 hooks）；SSH 不传。安装是官方 `curl | bash`，只展示不执行。不要把 `~/.grok/bin/agent` 当成 Cursor。

## 不变量

- 只 spawn 该 CLI 目录白名单 basename（含自定义绝对路径）；`login` / `doctor` / `inspect` / ACP 同一套 `assertAllowedCommand`；`shell: false`；`cwd` = 工作区。
- `inspect` 只返回公开账号字段与官方打印的额度；禁止把 token / `hasAccessToken` 传给 renderer。无公开 login 探针（Hermes / Amp / 自定义）必须回 `loggedIn: false`，禁止缺 `authAccount` 让 UI 永远检测中。
- 安装只跑配方里的 `npm` / `brew` argv，禁止用户自定义安装命令，禁止 `curl | bash`。
- 外部 CLI 不是默认内核。空配置 = Enjoy Local。
- 不编辑 `~/.codex/auth.json` / Claude credentials / OpenCode `auth.json` / Antigravity OAuth。模型选择只存在 Enjoy vault，靠 CLI `--model`。
- 写家目录配置必须用户点击、先备份、可还原；默认路径仍是进程 env，不是改各家 config。不做本地协议转换代理；跨协议档案不可选。
- ACP `session/request_permission` → `approval.required`（HMAC），写盘 / bash 仍看现有审批偏好。
- Amp 与 OMP 不是同一个 id。Pi / Amp 的 companion 二进制只给登录与 inspect，不能当 ACP 入口。

## 代码入口

- 自定义 ACP / Registry：`agent-tools/custom-spawn.ts`、`coming-soon-promotion.ts`；UI `settings/agent-tools/acp-registry-*.tsx`、`acp-registry-missing.tsx`、`list-row-phase.ts`；无探针 inspect `inspect-empty.ts`
- 目录与探测：`packages/agent-harness/src/agent-tools/`
- 模型表与安装配方：`packages/agent-harness/src/agent-tools/catalogs/`
- ACP：`packages/agent-harness/src/acp/`（收尸账本 `acp-child-store.ts` / `acp-child-ledger.ts`）
- 绑定交互：[`../references/cli-bind-ux.md`](../references/cli-bind-ux.md)；UI `settings/agent-tools/agent-tool-provider*.tsx`、`bind-source/`
- 覆盖与 IPC：`apps/desktop/src/main/services/agent-tools-*.ts`、`ipc-agent-tools.ts`
- 绑定兼容 / 引用派生：`packages/ipc-contract/src/provider-agent-bind.ts`；开流 env：`provider-bind-env.ts`；家目录格式：`cli-config-format.ts`
- 开流：`open-coding-stream.ts` → `open-acp-stream.ts` → `streamAcpTurn`
- 设置 UI：`settings/agent-tools/`（表行 `agent-tool-row.tsx`，次行 `list-secondary.ts`，安装态 `install-row-copy.ts`，仅官方登录闭环 `official-login/`，动力源 `power-source/`，抽屉信任卡 `drawer-trust/`，过旧诚实态 `cli-outdated/`）；进阶沙箱 `settings-harness.tsx`；审批发现性 `settings/approval-discover/`（密表之上共享摘要条，不加列）
- Composer：`agent-picker/`（输入框切 Agent / 模型 / 安装）
- 合约：`packages/ipc-contract/src/agent-tools.ts`、`runtime-capabilities.ts`（静态保真表 + `composerChromeFor`）

## 已知坑

- 官方 `@ai-sdk/harness-cursor` 要 `CURSOR_API_KEY` + 网络沙箱，和「本机已 login」不是一条路。本机 CLI 自写 ACP 薄客户端，不要把沙箱依赖带进 acp-host。
- Cursor 没有常驻 daemon；审批续跑复用同一 Enjoy `sessionId` 上的 ACP session。`dispose` 在 abort / 会话结束时再杀进程。换模型（I1）会拆掉该 **ACP** session 再 spawn，带新的 `--model`。Enjoy `sessionId` 不变，不是 M3 handoff，C 端不写「换模会重开会话」。
- 中转 MiniMax 的 `reasoning_split` 与本领域无关；CLI 思考走 ACP `agent_thought_chunk`。
- `settings.get` / `agentTools.list` 只做 PATH 查找，不跑 `--version`，避免设置页卡数秒。version / `acp --check` 只走 `doctor` 与异步 `inspect`（官方 `cliVersion` 优先，缺了再 `--version`）。缺当前版本不假警告。
- ACP 审批只走 `waitForSubagentApproval` → `approval.required` + HMAC。`mapAcpUpdate` 不要再 yield 一份 approval，否则泵会误 park。
- renderer 不要 import `@enjoy-agents/agent-harness`（会把 `child_process` 打进渲染包）。用 `isAcpHostRuntimeId`（ipc-contract）或 `agentTools` 快照。
- 输入框不要拆「运行时 + 模型」两个控件。已安装 CLI 点左栏即切，右栏选该 CLI 模型；未安装给一键安装 / 复制命令，不要强制先去设置打勾。
- 同一 Enjoy `sessionId` 复用 ACP 进程。Regenerate 不会强制新开 CLI；上下文由 CLI 自己攒。Stop 只 `session/cancel`，**禁止**杀子进程。换引擎 / 换模型 / 删会话 / 增删 MCP / 子进程已死 / 退出应用才 `disposeAcpSession`。Enjoy 侧 fail 但 CLI 仍活着时同样不杀。
- `#/mcp` 已信任行经 `hostExtensionsFor` 进 `session/new.mcpServers`；技能索引进 `composeAcpPrompt`。`mapAcpUpdate` 把 `plan` 映射为 `todo_write`，进 Todo Dock。
- 配置抽屉以「宿主扩展与能力」看板为主视觉：图形化呈现已自动连接的已信任 MCP 外部工具数量与技能数量，并提供直通「扩展与能力中心」主按钮。原生插件复制命令（如 DSH Bridge 等）默认收进底部折叠的开发者高级选项，禁止主屏大黑框终端说教，普通用户无需碰终端。命令必须可粘贴，禁止 `<package>` / `<github-url>` 占位。禁止假「已连接」。Enjoy 不代跑 Cordis / hooks / 各家 Plugin JS。
- Composer 不要用纯图标 Tab：图标难认，未知 Agent 回退成 Enjoy 标会看起来像两个 Enjoy。左栏必须带名字；未知 id 用首字母，不要 `AppMark`。
- 官方 `agy` 的原生 `--acp` 仍可能未发布（上游 issue 追踪）。PATH 上有 `agy-acp` 时优先走桥接；只有 `agy` 且 `--acp` 失败时，让用户在设置里填 `agy-acp` 绝对路径，不要去读 Google 的 login 文件。
- Cursor CLI 没有可静默执行的 npm/brew 配方，一键安装会拒绝并让用户复制官方 `curl | bash`。Claude / Codex 走 `npm i -g`，Antigravity 走 `brew install antigravity-cli`。
- Finder 启动的 Electron PATH 常缺 brew/npm。探测会补 `/opt/homebrew/bin`、`/usr/local/bin`、`~/.local/bin`，但必须排在系统 PATH 后面，避免用户可写目录抢先。
- 供应商与 CLI：Enjoy 内部优先进程 env。写家目录仅用户点击「同步到本机」；必须先写 `*.enjoy.bak`，Codex 只改 `enjoy-agents` 标记块且必须是官方 `[model_providers.enjoy]`，**禁止**再写顶层 `api_key`。恢复只还原备份。不要整文件覆盖。绑定没 Key 不要静默退回官方登录。不要用 `kind===custom` 把 OpenAI 中转塞给 Claude。不要做 15721 协议代理。
- 绑定档案后在抽屉换模型，旧 upsert 把 `useCustomProvider: undefined` 展开进覆盖层，`JSON.stringify` 丢掉绑定键，界面跳回「官方登录 · 已登录」。合并跳过 undefined；只改模型也要带上当前绑定。
- 思考档不要看 spawn `--thinking`。Grok / Claude 官方 ACP 走 `thought_level`；硬加 `--thinking` 会 exit 1。live `configOptions` 优先于静态种子。无 `category` 时仍认 `effort` / `reasoning_effort`。
- 无公开账号探针的 inspect 回 `loggedIn: false, probed: false`。C 端不得把这当成已确认未登录来闸发送；二进制在 PATH 即可切/发，真未登录由 ACP `auth_required` 再走官方 login。
- Composer 必须「顶部引擎导轨 + 下层面板」，不要三栏拼供应商+模型。
- 自定义路径若不校验 basename，`login` / `doctor` 会 spawn 任意绝对路径。vault 写入与这两条 IPC 必须走 `assertAllowedCommand`。
- ACP `initialize` / `session/new` 失败时子进程必须 `dispose`；同 session 并发用 in-flight 锁。`before-quit` / 删会话要 `disposeAllAcpSessions` / `disposeAcpSession`。electron-vite / 强杀没有 before-quit 时，启动读 `userData/acp-children.json`，pid 仍在且 `ps` comm 对得上当时 spawn 的 basename 才 SIGKILL。comm 对不上当 pid 复用，禁止误杀。`dispose(term)` 不能看 `child.killed`（发过 SIGTERM 就为 true，2s SIGKILL 升不上去），要看 `exitCode` / `signalCode`。
- 登录是 detached 后台进程，文案不要写成「打开终端」。
- Composer 没有 Resume。不要写进当前真相。
- `openDocs` 只允许 catalog 里的 https + host 白名单，不要只检查 `https://` 前缀。
- `list` / `settings.get` 若同步 spawn `auth status` / `agent models`，设置页会卡数秒。账号必须走 `agentTools.inspect`，UI 异步合并。`detect` / `doctor` / 登录会清空 main 缓存；设置页挂载与扫描会 `invalidate` inspect，且 refetch 带 `refresh: true`。
- 额度条跟 `capabilities.quota`：Claude / Codex `quota=false`，已登录只显示账号、不画空条。Cursor / Grok / Antigravity 才画条，百分比钉在右侧且不截断。数字必须是官方已用进度。Cursor CLI / `about` 不打印用量，要读 IDE `state.vscdb` 会话后打 Dashboard；用 `includedSpend/limit` 或 `displayMessage`，不要 `totalPercentUsed`，Dashboard 失败不要回落 `about`/`status` 猜数。Grok CLI 没有 `usage` 子命令，`/usage` 对应 billing API；可读 `auth.json` 的 email，`key` 只在 main 调官方接口。Antigravity 的 `remaining_fraction` 是剩余；没有 `quota_groups` 就空条，不要把 `quota.models` 当剩余再 `100 - n`。禁止写死 90 / 95 / 100。Enjoy Local 不走 `inspect`，不要把 vault 名 / `baseURL` 当账号详情。模型族必须严格匹配（Claude 不吃 GPT-only 组），未匹配不回落全部组。
- Composer 底栏 Fast / 五档 / 语音只信静态 `RuntimeCapabilities`，不要用 ACP `initialize.agentCapabilities` 自动开（各家会撒谎）。切 Cursor 看不到 Fast / 五档 / 执行模式；Grok / Claude / Codex 露出 **广告思考档**（不是 Enjoy 五档能量条）。切回 Enjoy Local 三件套回来，store 里的 Fast 状态保留。
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
- `status===ready` 只表示 PATH 上有二进制。`loggedIn===null`（inspect 未回）必须标「检测」，禁止当绿灯、禁止 bind、禁止发送。发送闸：`inspecting` 设 `NEED_CLI_INSPECTING`，`authorizing` 设 `NEED_CLI_AUTHORIZING`，**不要**开 Picker。只有 `needs_login` / `login_failed` / `missing` 才开登录坞。`inspect` 必须 `allSettled` + 当前引擎优先；一家 Hermes/OMP 失败不能让全家停在 `loggedIn==null`。`applyInspect` 缺 `authAccount` 时保留旧值。非 OMP 的 detached `login` 回执 `ok` / `browser_opened` 也不是已登录，必须 `waitCliEngineReady` 等到 `authAccount.loggedIn`。仅官方四家（Cursor / Grok / Antigravity / Amp）登录闭环认 [`previews/cli-a-official-login.html`](../previews/cli-a-official-login.html)（锁 tip `a0ac8f5`）：检测中 ≠ 就绪；打开授权 ≠ 已登录；失败一行人话 + 重试授权；抽屉无假 vault。密表 PATH 就绪仍要走这四态，禁止把检测中画成「已就绪 / 设为主引擎」。未确认登录（检测中 / 授权中 / 失败 / 未登录）动力源必须纯字，禁止圆点 pill；只有 `official===in` 才描边胶囊。检测中 / 授权中不画 ⚙。发送闸三块文案与预览同键（`sendGateCopy`）。
- 进程 `exit 0` ≠ `logged_in`。GitHub device 打开页后进程可能还活着；若提前退出且只写了 `opened`，必须 `failed`，禁止 `finish({ message: "logged_in" })` 抢焦点。只有官方打印 `Credentials saved`（`decideOmpLogin` 的 `done`）才算完成。
- `extractLoginUrl` 禁止抓任意 `https://`。GitHub Enterprise 提示或文档链接若先出现，会跳过空回车、永远打不出 device URL。只认 `Open this URL in your browser` 下一行。
- `inspect.providers` 只在异步 inspect 合并后才有。未回时 OMP 仍要分栏，但必须显示「正在读取供应商」，不要只剩「全部模型」假装没有供应商。`applyInspect` 在 `hit.providers` 缺省时保留旧表，不要写成 `[]`。
- OMP 左栏不能只按已出现的模型 selector 分栏：`google-antigravity` 一家就会同时列出 Claude + Gemini，看起来像「已经有多家」其实只登了一家。必须列 `omp auth-broker list --json` 全表（约 70 家可 `/login`）；已登录 = 该 id 在 models 里出现过。`models.yml` 自定义**不在** list 里，有凭证才会进 `omp models`；没有凭证时只能从 yml **抽 id**（禁止读 apiKey）才能显示，且不能点登录。`omp auth-broker login` **只往 stdout 打 URL，自己不打开浏览器**。更坑的是官方会先 `readline.createInterface`：`github-copilot` 在打 `https://github.com/login/device` 之前先问 Enterprise 域名（空回车 = github.com）。`stdio: ignore` 会让 readline 立刻 `ERR_USE_AFTER_CLOSE`，GitHub 永远打不出 URL，按钮卡在「正在打开授权」。必须 `stdio: pipe`，看见 `blank for github.com` 写空行，再抽 URL / `Enter code:`。环回 OAuth（Gemini 等）同样不能在打出 URL 后把进程打死，否则 localhost callback 没了。更常见的体感坑：打开 URL 立刻 `invalidate` inspect，左栏仍是未登录；浏览器完成后没有第二次 refresh，用户以为「没有回调回来」。必须等 `Credentials saved` 再清缓存，UI 轮询 inspect，并在完成后 `app.focus`。禁止无参 `omp auth-broker login`。Fireworks / Exa / HuggingFace / GitLab 会先打仪表盘或授权 URL，再要粘贴 key / `vscode://` 回调——可以 `openExternal`，但不能代填，回 `needs_tui`。本机 `ollama` / `lm-studio` / `llama.cpp` / `vllm` 先要引擎在跑。不要读 `~/.omp/agent/agent.db`，也不要把 `auth-broker status` 当成本地登录态。禁止把 token 或授权 URL 传给 renderer；设备用户码可以进回执 `device:XXXX-XXXX`。
- 未装 CLI 不要收成「未安装 N」让人点不到安装。未装上轨，用中性胶囊「未装」而不是名字底下第二行灰字；下面板一键安装 / 复制命令。即将推出才进溢出。
- DeepSeek Harness 官方基座（`dsh --profile acp`）已完整接线打通：支持探测 `process.env.DEEPSEEK_API_KEY`、`$DSH_HOME/.credentials.yaml` 与 `settings.yaml`；映射官方生产模型 `deepseek-chat` (DeepSeek-V3) 与 `deepseek-reasoner` (DeepSeek-R1)；登录引导走 `dsh web`；ACP stdio 开流注入 `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL`；C 端导轨置于「本机助手 / CLI」，动力源如实反映官方凭据与 Enjoy 绑定档案。旧 Vercel Harness `deepseek` 适配器仍占位，和本机 CLI 不是一条路。
- C 端胶囊/导轨禁止常驻 `ACP · 订阅登录` / `本地 ToolLoop` / `ACP Stdio` 及同类协议路径微标。协议/登录只留设置能力矩阵、配置边界与文档，不上 Composer picker。
- 七家新 CLI 本轮 `quota=false`。没有官方 usage 子命令就不画额度条。
- ACP 复用进程的 key 必须含 `toolId`。漏掉时 Claude→Cursor 会假续跑旧 stdio。有用户轮切引擎必须 `disposeSession` + `setHandoff`；brief 只进系统/隐藏上下文，禁止用户首条附注。
- 本阶段不实现 `session/set_mode`、把 ACP `available_commands` 画进 Composer 斜杠条、`session/load`、跨 Agent 委派、寄生 Codex Desktop / SSH。Pi / OMP / Hermes 原生 RPC 或 TUI gateway 另开一轮。Composer `/` 各引擎都列 `/compact` 与 **C 端** `/explore` `/execute` + 已安装技能；旧别名 `/plan` `/ask` `/agent` `/debug` 仍能切 store，**不能当显示名**。ACP 命令仍只进 ⌘L。
- ACP 事件保真：`tool_call` content `type=diff` 写入 args 并 `file.changed`（Review / File Diff 能看）。`available_commands_update` 映射为 `commands.update`，进 ⌘L（`QuickSearchAcpCommands`），禁止 `structured.delta` 进气泡、禁止把 ACP 命令画进 Composer 斜杠条。提问走 `session/request_permission` 的 `questions` → 工具名 `ask_user_questions`（现有 Fluid Dock），**不要**从 `mapAcpUpdate` 再 yield `approval.required`。附件写成工作区相对路径清单，不把二进制灌进 JSON-RPC，也不再写「未转发」。`models:"none"`（Hermes / Amp）空态写「将使用 CLI 默认模型」，不要「未找到模型」。
- 禁止写死「Cursor Pro User / 月度 Fast 额度」。
- 禁止把 token / `key` / `refresh_token` 传给 renderer，也不要写回 `auth.json` / `state.vscdb`。不读 `~/.codex/auth.json` / `~/.claude.json`。
- Grok spawn 不能把 `--model` / `--plugin-dir` 接到 `stdio` 后面。`--plugin-dir` 不得含 hooks；相对路径丢掉。
- `~/.grok/bin` 必须补进探测 PATH，且排在系统 PATH 后面。不要探测名为 `agent` 的 Grok 别名，避免抢 Cursor。
- 卸载 argv 必须写在 catalog `uninstallArgs`，不要从 install 的最后一个参数拼。Cursor 没有配方，只给复制官方命令。
- 配置抽屉不要默认给 `extraArgs` 文本框。`--always-approve` / `--yolo` / `skip-permissions` 禁止做成开关。未收录旗标只出现在高级自定义。
- 「这个助手用」是 Cline/OpenCode 式下拉（官方登录 + 可筛选档案），不是电台卡片。账号行只写档案名 + 品牌/密钥副行，禁止再拼 `deep · deepseek-flash`；模型单独带「模型」标签和族标（`cliModelFamilyKey` / `ModelBrandIcon`）。一份档案可勾到其他协议兼容的 CLI。供应商 ≥6 出现筛选。禁止「已选 Enjoy 但没有档案」。
- 绑定下拉里「+ 添加 {品牌} 供应商」既像选项又像入口，难发现，还会在智能体抽屉就地 CRUD。正确做法：下拉只列官方登录 + 已有档案；「添加供应商档案」在菜单外，`navigate` 到 `#/settings/providers`（真源 [`previews/p0-add-provider-discover.html`](../previews/p0-add-provider-discover.html)，锁 tip `033838f`）。空档案时链接用 soft 主色更醒目。仅官方槽禁止出现该链。
- 配置抽屉 380px 时两只无标签下拉会把档案名和模型粘成同一句，C 端分不清在选账号还是模型。宽度锁 576px，给后续字段留空；账号/模型分行，同步不要做成第三只下拉。
- 绑了中转档案后，Composer 仍列出 Claude 官方 Sonnet/Opus 再加上 vault 的两个模型，且 `deepseek-flash` 画成 Claude 引擎标。根因：`catalogModels` 曾把 CLI 静态目录与 vault 拼在一起；`applyInspect` 在没 inspect 回执时原样放过这份混表，绑定时又 `bound ? tool.models` 把官方五行留下来。正确做法：`composeAgentModels` 绑定只用 vault；`applyInspect` 用 `settings.providers` 的档案 `models[]` 覆盖，没 inspect 也要裁；有族名先画 `ModelBrandIcon`。
- 绑了 Enjoy 档案仍要官方 `loggedIn` 才能发送：`engineReadiness` 不看 `useCustomProvider`。Cline/OpenCode 选 API 档案就跳过 OAuth。正确做法：vault 绑定且有 Key → `ready`；没 Key → `needs_key`，不要 `NEED_CLI_LOGIN`。
- `providersSelectableFor` 丢掉没 Key 的档案后，UI `useEffect` 见不到 `boundId` 就 `useCustomProvider=false`。禁止静默解绑；开流用「Add a provider API key…」并让 `classifyThreadError` 认 `needs_key`。
- `upsert` / spawn 若不跑 `providersCompatibleWith`，跨协议档案也能写进 override。必须校验 `apiStyle`/`kind`，并 `pickBoundModelId` 丢掉不在档案里的官方 id。**不要**因为 `api.deepseek.com` 主机名在 upsert 里抛 CatalogError：选择会失败、界面退回官方登录，档案还在下拉里。主机名警告画在抽屉里；拉模型仍可拒 HTML。
- 绑了 Enjoy 档案后，抽屉顶部仍把 `inspect.authAccount`（邮箱 / CUSTOM / 当前模型）画成当前供应商。`authAccount` 是本机 CLI 官方登录，不是 vault。正确做法：`useCustomProvider` 时「这个助手用」在前，官方账号降为旁注「官方登录仍保留」，禁止展示 inspect `currentModel` 当 Enjoy 会话模型。
- 列表若只在 `providerBind !== none` 时画绑定摘要，Cursor / Grok 会缺动力源列。要用 `classifyPowerSource` 同构；仅官方禁止假 vault 下拉。未找到画 `—`，不要「官方登录 · 检测中」。未确认登录若画圆点 pill，会像已绑 vault；正确做法：纯字「官方登录 · 检测中/授权中/失败/未登录」，只有已登录才 `rounded-md` ring。检测中 / 授权中画 ⚙ 会像已就绪，这两态不画配置。自定义 `kind=none`，已装也画 —，禁止假官方登录。Hermes 等无账号探针若 `emptyInspect` 不带 `loggedIn: false`，密表会永远「检测中…」。
- 表底若写「列表禁：ToolLoop / ACP stdio」，C 端自己泄漏协议词。禁令只进 invariants 测试，不上页面。副标题不要 `listLine` / `meta.tagline` / doctor /「体检正常」，走 `formatListSecondary`（只拼 `{version} · {路径短名}`，缺段用 —）。「官方仍保留」只进抽屉旁注，不上列表。额度 hint 只留抽屉信任卡，不上列表。视觉锁只认 [`previews/local-cli-dense-p0.html`](../previews/local-cli-dense-p0.html)（锁 tip `8bd7f6e`）。`dense-v2` 已废为 stub，即使内容相近也不要以 v2 路径为准。安装中 / 失败与沙箱去品牌另认 [`previews/p0-sandbox-debrand-install-states.html`](../previews/p0-sandbox-debrand-install-states.html)（锁 tip `4c0e9e0`）。抽屉信任摘要（健康 / 本月用量）另认 [`previews/p0-b-drawer-trust.html`](../previews/p0-b-drawer-trust.html)（锁 tip `f48ab0d`）：未跑不写通过，检测中无绿灯，`quota=false` 不写本月用量。审批发现性另认 [`previews/p0-d-approval-discover.html`](../previews/p0-d-approval-discover.html)（锁 tip `1a435e4`）：共享摘要条在密表之上，不加列。过旧 / 不兼容另认 [`previews/p0-e-cli-outdated.html`](../previews/p0-e-cli-outdated.html)（锁 tip `4d33f07`）：永不绿灯就绪；次行仅不兼容可写「需更新 · v1.2（要 ≥1.5）」；动力源可留已登录 +「需更新」旁标；主槽禁设为主引擎；抽屉健康「版本过旧 · 当前 v1.2 · 需要 ≥1.5」；发送闸「请先更新本机助手」。C 端字段标题禁止 Vercel；实现注释可以提后端。
- 自定义 ACP 的 command 必须走 `assertCustomAllowedCommand`（目录 basename 白名单）。禁止 `bash` / `node` / `npx`。cwd 自定义路径要存在且为绝对目录。
- M4 只把 OpenCode → Gemini → Pi 在硬条件全过时标 available。不要手改另外几家 comingSoon 假装已接线。
- Cursor `agent acp` 几乎只认 `--help`。Composer 极速 / 思考**不要**追加 `--fast` / `--thinking`，否则官方报 `unknown option '--fast'` 并 `ACP process exited with 1`。开流前必须丢掉这些旗标。Grok `agent stdio` 同样不认 `--fast`。ACP 退出要把 stderr 末几行带进错误，不要只报退出码。
- `providersCompatibleWith` 判定协议兼容时，主进程必须用 `resolvedStyle(profile)` 补齐默认预设风格，且 `isOpenAiCompat` 需包含 `OPENAI_COMPAT_KINDS`（`xai`、`siliconflow`、`custom`、`openrouter` 等），避免 vault 内未显式持久化 `apiStyle` 的第三方档案在抽屉内触发「这份档案的协议对不上这个助手，没有改绑定」；修改跨包 contract 后须触发主进程重构重启。
- `dsh`（DeepSeek Harness ACP）不接受标准命令行 `--model` 参数，必须通过 `--patch` 注入包含 `acp.config.model` 与 `llm-deepseek.config.models` 的 yaml 补丁，否则其开流时默认请求写死的 `deepseek-v4-flash` 模型，在绑定第三方供应商（如 Grok / SiliconFlow / OneAPI）时会导致上游接口报「模型不存在」。
- **隐患**：`AcpClient.drain` 使用单个刚性正则匹配 `Content-Length: ...\r?\n\r?\n`，当标准 ACP 客户端或部分引擎输出多行头部（例如附带 `Content-Type: ...`）时，正则匹配失败，`buffer` 无法消费并持续积压，导致协议解析死锁并挂起整个会话。正确做法：先通过 `\r?\n\r?\n` 截取完整的头部块，再从头部块中提取 `Content-Length:` 键值并截取消息体。
