# AI 应用趋势 × 小而美开源 × Enjoy 可实现清单

> 基线：main tip `1893fa5`（2026-10-09 复核 main 仍为此 sha）· 日期：2026-10-09（Asia/Shanghai）· **待用户拍板 · 不开刀 · I3 仍停**
> 输入：PM 调研（本稿）＋ leo（架构契合/风险/闸）＋ kai（后端事实与候选）＋ luna（交互候选）＋ mike（前端库候选，§2.1）。凡标注「leo / kai / luna」处为其输入，本稿已抽查路径。
> 开放项：PR #100（CU-P1-36 裸坐标默认关）仍 draft，CI 在 `2b2f7ea` 绿，但对 `1893fa5` `mergeStateStatus=DIRTY`，需 rebase；`desktopAdvancedCoords` 尚未进 main（`rg` 在 `1893fa5` 无命中）。
> **单独决策项（改锁项，需用户单独拍板）**：Top 5 ① 中「CU 审批卡默认改为『本会话允许此应用』」**推翻 CU-P1-A 预览锁**（锁定为：有稳定 appKey 时默认高亮 Always-allow）。这是产品锁变更，不是闸变更；若通过，须同步改 `design/references/cu-p1-a-always-allow.md` 与对应测试。（leo 架构评审）
> leo 架构评审结论：Top 5 无 block，① ⑤ 为**有条件通过**，排序不变；各项「通过条件」见 §3.3。
> 星数 / push 日期为 2026-10-09 `gh api repos/...` 实测（`pushed_at` 为 UTC，此处只取日期）。

---

## 1. 趋势（8 条）

**T1 · 协议三件套（ACP / MCP / Agent Skills）成为 Agent 的「通用接口」。** 编码 Agent 不再各自造宿主协议：ACP 有官方 Registry（CI 校验 `authMethods`，每小时同步版本），Agent Skills 由 Anthropic 开放为标准、40+ 工具支持，Vercel 的 skills.sh 七个月到百万技能。对宿主而言，「把协议做保真」比「自建生态」更值钱。
- ACP Registry：https://agentclientprotocol.com/get-started/registry · https://github.com/agentclientprotocol/registry
- Agent Skills 规范：https://agentskills.io/specification
- Vercel《State of agent skills》：https://vercel.com/blog/state-of-agent-skills

**T2 · 工具结果从「文本」变成「可交互 UI」（MCP Apps 稳定版）。** 2026-01-26 MCP Apps 成为首个官方 MCP 扩展：工具用 `_meta.ui.resourceUri` 声明 `ui://` HTML，宿主在沙箱 iframe 里渲染，经 postMessage JSON-RPC（`ui/initialize`、`ui/notifications/tool-result`、`ui/message` 等）双向通信；Claude、ChatGPT、Goose、VS Code 已支持。
- 公告：https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/
- 规范与 SDK：https://github.com/modelcontextprotocol/ext-apps

**T3 · 桌面 Computer Use 进入主流，且收敛到「按应用授权 + 可撤销 Always-allow + 结构化集成优先、屏幕最后」。** Codex/ChatGPT 桌面端 CU：按 App 请求授权、Always-allow 列表可在设置里删、Windows 前台接管需提示；Claude Cowork/Code：每个应用先问、可随时停止，并明确「先连接器、再浏览器、屏幕是最后手段」。（luna：同行普遍「保守授权、过程可见、人话文案」。）
- OpenAI Codex Computer Use：https://developers.openai.com/codex/app/computer-use
- Claude Cowork 使用电脑：https://support.claude.com/en/articles/14128542-let-claude-use-your-computer-in-cowork
- Claude Code Desktop（luna 提供）：https://code.claude.com/docs/en/desktop

**T4 · 「屏幕上下文记忆」成为新战场，但隐私代价高。** Codex Chronicle（Mac，研究预览）用后台 Agent 从近期截屏生成记忆，截图本机暂存、记忆为本机文件、可暂停；官方自己提醒「消耗额度快、其他应用可能读到这些文件」。开源侧 screenpipe 走持续录屏 + 本地索引。
- 9to5Mac 报道（含 OpenAI 原话）：https://9to5mac.com/2026/04/20/codex-for-mac-gains-chronicle-for-enhancing-context-using-recent-screen-content/
- https://github.com/screenpipe/screenpipe

**T5 · 「本机执行、异地遥控」：手机接管桌面上正在跑的会话。** Claude Code Remote Control：会话一直在本机跑，手机/网页只是窗口；需要审批时可推送到手机。代价是转录存在厂商云端、需订阅登录。
- https://code.claude.com/docs/en/remote-control

**T6 · 本地定时 / 后台 Agent 成为标配，并诚实处理「错过的运行」。** Claude Code Desktop 本地定时任务：只在 App 开着且电脑醒着时触发；睡眠错过则开机后**只补最近一次**（7 天内），历史里显示「跳过」及原因；需要权限时 run 停住等人。
- https://code.claude.com/docs/en/desktop-scheduled-tasks

**T7 · 浏览器 Agent 正在被并入桌面「超级 App」，独立 AI 浏览器退潮。** OpenAI 宣布 Atlas 于 2026-08-09 停止工作，浏览器 Agent 能力并入 ChatGPT 桌面端内置浏览器与 Chrome 扩展。
- https://help.openai.com/en/articles/20001371-evolving-atlas-into-chatgpt-for-browser-based-agentic-work

**T8 · OS 级沙箱成为 Agent 默认边界，审批只管「人」。** Claude Code 的 Bash 沙箱开源为 `sandbox-runtime`：macOS `sandbox-exec`、Linux bubblewrap，网络默认拒绝 + 域名放行，无需容器。
- https://code.claude.com/docs/en/sandboxing · https://github.com/anthropics/sandbox-runtime

---

## 2. 小而美开源（15 个 + 前端 7 个见 §2.1，均已 `gh api` / `npm view` 核实存在且近 6 个月有 push）

| 名字 | 链接 | stars · 最近 push | 一句亮点 | 对 Enjoy 的启发 |
|---|---|---|---|---|
| sandbox-runtime | https://github.com/anthropics/sandbox-runtime | 5.5k · 2026-10-09 | 无容器的进程级 fs/网络限制（Seatbelt / bwrap） | 统一 mac+Linux bash 沙箱，替代 Linux/Win 的正则拦截（kai ★2） |
| models.dev | https://github.com/anomalyco/models.dev | 7.2k · 2026-10-09 | 开源模型单价 / 上下文元数据库（MIT） | 打包离线快照，算 `estimatedCost`，UI 标「估算」（kai ★1） |
| MCP TypeScript SDK | https://github.com/modelcontextprotocol/typescript-sdk | 13.5k · 2026-10-08 | 官方客户端：Streamable HTTP、通知、OAuth | 替换手写 `packages/mcp/src/client.ts` 传输层（kai ★3） |
| MCP Apps (ext-apps) | https://github.com/modelcontextprotocol/ext-apps | 2.9k · 2026-09-25 | MCP Apps 规范 + AppBridge 宿主模块 | `packages/mcp/src/app-host.ts` 方法名对齐稳定规范 |
| MCP Inspector | https://github.com/modelcontextprotocol/inspector | 11.0k · 2026-10-08 | MCP Server 可视化调试 | 仅 dev/CI 回归 MCP 客户端（kai #5） |
| Agent Skills | https://github.com/agentskills/agentskills | 26.0k · 2026-08-09 | SKILL.md 规范 + `skills-ref` 校验 | 技能 frontmatter 按规范校验，`allowed-tools` 只展示不预批 |
| promptfoo | https://github.com/promptfoo/promptfoo | 25.8k · 2026-10-09 | 声明式 prompt/Agent 评测 + 红队 | dev-only `evals/`：审批绕过、工具注入、CU 误点（kai #4） |
| ast-grep | https://github.com/ast-grep/ast-grep | 16.2k · 2026-10-08 | tree-sitter 结构化搜索（Rust，有 napi） | 符号级 repo map 的解析器候选 |
| code2prompt | https://github.com/mufeedvh/code2prompt | 7.7k · 2026-09-25 | 代码库→单一 prompt，带树与 token 计数 | Inspect Prompt 里显示 token 预算 |
| qmd | https://github.com/tobi/qmd | 30.3k · 2026-10-06 | 全本地的文档/笔记搜索小引擎 | 知识检索混合 BM25+向量的参照 |
| basic-memory | https://github.com/basicmachines-co/basic-memory | 4.1k · 2026-10-09 | 记忆=本机 Markdown 文件 + MCP | 若做长期记忆：人可读、可编辑、宿主为真源 |
| Peekaboo | https://github.com/openclaw/Peekaboo | 5.3k · 2026-10-08 | macOS 截图 CLI + 可选 MCP | AppSnap / CU 观测截图的交互参照 |
| terminator | https://github.com/mediar-ai/terminator | 1.7k · 2026-06-02 | Windows 无障碍树自动化（「Windows 版 Playwright」） | Win CU 执行器走 a11y 选择器，减少裸坐标（§3.6） |
| Handy | https://github.com/cjpais/Handy | 33.3k · 2026-10-09 | 完全离线语音转文字桌面 App | Composer 按住说话、只填输入框不自动发送 |
| ccusage | https://github.com/ccusage/ccusage | 18.9k · 2026-10-09 | 读 CLI 本地转录统计用量 | Enjoy 已有同类（`cli-transcript-usage/`），补单价即可 |

参照（非小而美，leo 提名，已核实）：Cline https://github.com/cline/cline（70.1k · 10-09，checkpoints 文档 https://docs.cline.bot/core-workflows/checkpoints）· Aider https://github.com/Aider-AI/aider（49.4k · **2026-05-22**，活跃度偏低；repo map https://aider.chat/docs/repomap.html）· Goose https://github.com/aaif-goose/goose（55.1k · 10-09；recipes https://goose-docs.ai/docs/guides/recipes/）· AGENTS.md https://github.com/agentsmd/agents.md（24.8k · 09-10）· MCP servers https://github.com/modelcontextprotocol/servers（91.1k · 10-07）。
未入表：`coder/agentapi`（已 archived）；tokenlens https://github.com/xn1cklas/tokenlens（266⭐ · 07-02，kai 的轻量备选，license 未核）；mem0 https://github.com/mem0ai/mem0（66.9k，非小而美，待产品决策）；node-llama-cpp https://github.com/withcatai/node-llama-cpp（2.2k，kai 不推荐）。

### 2.1 前端小而美（mike）

mike 已确认在用、**不再引入**：streamdown、shiki、cmdk、use-stick-to-bottom、react-resizable-panels、xterm、mermaid、monaco、ai-elements（因此 assistant-ui / prompt-kit / markstream 与现有重叠，跳过）。Cherry Studio / LobeChat / Jan 仅作交互参照，不引代码。下表 license / 版本经 `npm view` 核实，stars / push 经 `gh api` 核实（2026-10-09）；抽查结论附在「Enjoy 启发」里。

| 名字 | 链接 | license · stars · 最近 push | 亮点 | Enjoy 启发（含抽查） | 投入 | ICE |
|---|---|---|---|---|---|---|
| virtua | https://github.com/inokawa/virtua | MIT · 3.7k · 2026-10-09（npm 0.53.3） | 零配置虚拟列表，支持动态行高、反向滚动 | 会话列表未虚拟化（renderer 内 `rg virtual` 无命中），长会话卡；只换 `ai-chat-thread.tsx` 的 `ConversationContent` 层 | M，3–4 人日 | 7/7/6＝**20** |
| @pierre/diffs | https://github.com/pierrecomputer/pierre | Apache-2.0 · 6.3k · 2026-10-08（npm 1.5.2） | 基于 shiki 的高质量 diff 渲染 | `ai-chat/diff/` 手写、无语法高亮（目录内无 shiki）；`file-diff-options.ts` `LARGE_FILE_LINES = 400`，开「折叠大文件」时 >400 行只留第一块 hunk；复用现有 shiki，先上 Review 面板 | M，3–5 人日 | 6/6/6＝18 |
| sonner | https://github.com/emilkowalski/sonner | MIT · 13.0k · 2026-08-10（npm 2.0.8） | 简洁、可堆叠的 toast | 至少 3 套手写 toast：`skills/.../skill-source-toast*`、`settings/extensions/curated/curated-toast.tsx`、`session-review/preview-open/session-preview-toast.tsx`，统一一处 | S，1–1.5 人日 | 并入「前端收口」 |
| xterm 官方 addon（webgl / search / web-links / unicode11） | https://github.com/xtermjs/xterm.js | MIT · 21.3k · 2026-09-13 | GPU 渲染、⌘F 搜索、可点链接、CJK 宽度 | 现仅装 `@xterm/addon-fit`（`apps/desktop/package.json`），catalog 为 `@xterm/xterm ^5.5.0`。**须钉 xterm 5 兼容版**：webgl 0.18 / search 0.15 / web-links 0.11 / unicode11 0.8（peer `^5.0.0`）；npm latest（0.19/0.16/0.12/0.9）对应 xterm 6 | S，0.5–1 人日 | 并入「前端收口」 |
| tinykeys | https://github.com/jamiebuilds/tinykeys | MIT · 4.1k · 2026-09-25（npm 4.0.1） | 约 650B 的快捷键绑定 | 约 41 个 renderer 文件各自处理 keydown；但已有 `packages/ipc-contract/src/keybinding-resolve.ts` 解析层，需先确认缺的是「统一派发」而不是「解析」 | S–M，1.5–2 人日 | 4/6/7＝17 |
| @headless-tree/react | https://github.com/lukasbach/headless-tree | MIT · 0.9k · 2026-07-20（npm 1.7.0） | 无样式树组件，键盘导航 + 多选 | 替换 Review 自写文件树；可选 | S–M，约 2 人日 | 3/7/7＝17 |
| Tiptap Mention | https://github.com/ueberdosis/tiptap | MIT · 38.7k · 2026-10-09（npm `@tiptap/extension-mention` 3.31.4） | 富文本 @ 提及节点 | Composer 是纯 textarea，`@桌面/@应用` 无法成为富 token；回归面大，**观察不做** | L，6–8 人日 | 6/5/2＝13 |

**建议打包**：sonner + xterm addon 合为一个 S 项「**前端收口**」（mike），约 2 人日，ICE 5/9/9＝**23**。mike 自排 Top 3：virtua → @pierre/diffs → sonner；xterm addon 作为半天顺手项。I3 不动。

**架构契合 / 风险 / 闸与真源（leo 口径）**：全部为 renderer 库，不碰 ToolLoop、Zod 合约、StreamEvent，契合度均为**高**。风险与闸：
- virtua：中风险。thread-find 改为按 index 滚动；流式行高变化时校验抖动；`permission-dock.tsx` 也引用 `ConversationContent`，**待审批卡不得被虚拟化卸载**（钉住可见），否则等同把审批藏起来。
- @pierre/diffs：中低。新依赖，与现有 shiki 4 版本对齐；只读渲染，不触闸。
- 前端收口：低。web-links 打开链接必须走 main 现有的外链打开路径，不在 renderer 直接开。
- tinykeys：低。不得改变审批相关快捷键（如 `use-permission-cycle-hotkey.ts`）的语义。
- Tiptap Mention：高风险。即便做成富 token，**mention≠allow** 不变，token 不能携带授权。

---

## 3. Enjoy 可实现清单（`1893fa5`）

### 3.1 现状盘点（已有 / 部分有 / 缺）

| 候选 | 现状 | 证据 |
|---|---|---|
| AGENTS.md 链（leo #4） | **已有** | `apps/desktop/src/main/services/agents-md-discover.ts`、`packages/ipc-contract/src/agents-md-chain.ts`；`design/specs/agent-runtime.md`（32KiB 上限、override 链） |
| Checkpoint 回滚（leo #1，Cline） | **已有** | `services/workspace-git-checkpoint*.ts`（`refs/enjoy/checkpoints/<stamp>`，不动用户分支） |
| 精选官方 MCP（leo #5） | **已有** | `renderer/.../settings/extensions/curated/*`、`components/mcp/constants/mcp-presets.ts`；I2 锁 `design/references/i2-extensions-curated.md` |
| CLI 用量统计（ccusage） | **已有** | `services/cli-transcript-usage/`（parse-claude / parse-codex） |
| 扫描件 OCR | **已有** | `packages/knowledge/src/parsers/pdf-ocr.ts`（本机 tesseract，无则诚实跳过） |
| Repo map（leo #2，Aider） | **部分** | `packages/agent-core/src/context/repo-outline.ts`、`tools/repo-outline-tool.ts` 仅目录骨架，无符号/排序 |
| Recipe（leo #3，Goose） | **部分** | `packages/ipc-contract/src/composer-preset.ts` 只有引擎/模型/探索执行/思考档，无 prompt 模板与工具偏置 |
| 成本估算（kai ★1） | **部分** | `renderer/.../observability/services/trace-tree-builder.ts` `estimatedCost: 0`；provider profile 无单价字段 |
| OS 沙箱（kai ★2） | **部分** | `services/os-sandbox.ts` 仅 macOS Seatbelt；`packages/agent-core/src/policies/sandbox.ts` 是网络命令正则拦截 |
| MCP 客户端（kai ★3） | **部分** | `packages/mcp/src/client.ts` + `http-rpc.ts` 手写；kai：HTTP 通知 no-op、无 OAuth |
| MCP Apps 规范对齐 | **部分** | `packages/mcp/src/app-host.ts` 白名单方法为 `tools/result`/`resources/read`/`ui/log`/`ui/update`，非稳定版 `ui/initialize`… |
| Skills 规范校验 | **部分** | `services/skills-service.ts` 用正则读 frontmatter，无 64/1024 约束，含非标 `trigger` |
| 自动化错过运行 | **部分** | `services/automations-scheduler.ts` 注释「退出即停，不补错过的点」；无「跳过」记录 |
| OTel GenAI 语义 | **部分** | `packages/agent-core/src/observability/otel.ts`；kai：只导单 span |
| CU 审批默认值（luna ①） | **部分** | `thread/approval/desktop-approval-choice.ts:37` 有稳定 appKey 时默认 `allow_always` |
| 空态桌面示例（luna ②） | **缺** | `ai-chat/empty-state/empty-state-constants.ts` 只有 git/test/refactor |
| 人话通知（luna ④） | **部分** | `services/desktop-notify.ts` 两条通用文案；`run.end` 无 status（需 kai） |
| 右栏步骤胶片（luna ③） | **部分** | `right-pane/views/desktop-view.tsx` 1.5s 轮询只显示最后一帧 |
| 离线语音输入 | **部分** | `hooks/realtime-mic.ts` + `services/realtime-service.ts` 走云 Realtime，标实验 |
| Evals | **缺** | 仓内无 eval 目录/依赖（kai 同结论） |
| 长期记忆 | **缺** | 只有 Knowledge RAG + session recap（kai） |

### 3.2 ICE 全排（I/C/E 各 1–10）

| # | 项 | 状态 | I | C | E | 合计 | 量级 |
|---|---|---|---|---|---|---|---|
| 1 | CU 体感打磨（luna ①②④ 合并） | 部分 | 8 | 8 | 8 | **24** | S |
| 2 | 自动化错过运行诚实化 | 部分 | 6 | 9 | 8 | **23** | S |
| 3 | 模型单价 + 估算成本（models.dev） | 部分 | 7 | 8 | 7 | **22** | S–M |
| 4 | Composer 预设 → 轻 Recipe | 部分 | 7 | 7 | 8 | 22 | S |
| 5 | Skills 规范校验（skills-ref 规则） | 部分 | 5 | 9 | 8 | 22 | S |
| 6 | 符号级 Repo map | 部分 | 8 | 7 | 6 | **21** | M |
| 7 | OTel GenAI 语义（每步/每工具 span） | 部分 | 4 | 8 | 8 | 20 | S |
| 8 | 统一 OS 沙箱（sandbox-runtime） | 部分 | 9 | 6 | 5 | **20** | M |
| 9 | 官方 MCP SDK 替换传输层 (+Inspector) | 部分 | 7 | 7 | 5 | 19 | M |
| 10 | MCP Apps 对齐稳定规范（依赖 #9） | 部分 | 7 | 6 | 5 | 18 | M |
| 11 | promptfoo 安全回归 evals | 缺 | 6 | 7 | 5 | 18 | M |
| 12 | 右栏步骤胶片（luna ③） | 部分 | 5 | 7 | 5 | 17 | M |
| 13 | 离线语音输入（whisper.cpp / sherpa-onnx） | 部分 | 5 | 6 | 4 | 15 | L |
| 14 | 长期记忆（mem0 / basic-memory 式） | 缺 | 6 | 4 | 3 | 13 | M–L（需产品决策） |
| 15 | 前端收口（sonner + xterm addon，mike） | 部分 | 5 | 9 | 9 | **23** | S |
| 16 | 会话列表虚拟化（virtua，mike） | 缺 | 7 | 7 | 6 | 20 | M |
| 17 | Diff 渲染升级（@pierre/diffs，mike） | 部分 | 6 | 6 | 6 | 18 | M |
| 18 | 快捷键统一派发（tinykeys，mike） | 部分 | 4 | 6 | 7 | 17 | S–M |
| 19 | Review 文件树（@headless-tree/react，mike） | 部分 | 3 | 7 | 7 | 17 | S–M |
| 20 | Composer 富 mention（Tiptap，mike） | 缺 | 6 | 5 | 2 | 13 | L（观察） |

**Top 5 取舍说明**：按 ICE 前五会是 4 个体验项 + 1 个成本项；为平衡「用户可见 × 地基」，Top 5 取 #1/#2/#3 + 地基 #6（leo）与 #8（kai），#4 Recipe、#5 Skills 校验作为下一批 S 项（体量小，可插空）。

### 3.3 Top 5

架构契合 / 风险 / 闸与真源 三列采用 leo 口径：契合＝跑在现有 `agent-core` ToolLoopAgent + `ipc-contract` Zod + main 为真源，不加第二引擎、不加新 StreamEvent；闸＝不得绕过 `resolveToolApproval`（hard-ask → session → Always-allow）、二次确认、Explore 不注册写/桌面工具、mention≠allow，真源不移出宿主。

**① CU 体感打磨（审批默认值 + 空态桌面示例 + 人话通知）** — luna
- 一句话：把 CU 的「工程默认值」改成保守、可懂的产品默认值。
- 现状：部分。`desktop-approval-choice.ts:37` 默认 `allow_always`；`empty-state-constants.ts` 无桌面示例；`desktop-notify.ts` 文案通用。
- Do：默认选中「本会话允许此应用」，Always-allow 保留但降权；终端 / Finder / 系统设置加一行提示并隐藏 Always-allow（提示不得读成「被拦」）；CU 开启且权限就绪时空态给「@应用 帮我在 {真实就绪 App} 里…」（数据来自 `use-desktop-mention-apps.ts`），否则隐藏；通知写清 App 与动作（「Enjoy 想在『备忘录』里点击『新建』，回 Enjoy 审批」），结束通知区分完成/停止/出错（由通知层从现有 end / error 推导，见通过条件）。
- Don't：不加新决策 enum；通知里不放「允许」按钮；不做全局划词条 / 菜单栏小窗；不做 desktop_act「智能自动审批」。**更正**：本稿初版写「jojo 认为与 CU-P1-A 锁一致」不成立。leo 指出默认改为「本会话」**推翻了 CU-P1-A 预览锁**（有稳定 appKey 时默认高亮 Always-allow），属于**改锁项，需用户单独拍板**（见页首单独决策项）。
- 投入：S，≈3 人日（luna 1、mike 1.5、kai 0.5）。
- ICE 8/8/8＝24。
- 架构契合：高（renderer 默认值 + main 通知文案，不动事件合约）。风险：低→低中（改锁带来的文档与测试面）。闸与真源：不改 `resolveToolApproval` 顺序；Always-allow 仍只由用户显式选择写入；敏感应用判定以 main 侧 `desktopActIsSensitive`（`packages/agent-core/src/computer-use/desktop-act-app-key.ts`）为真源。
- **通过条件（leo · 有条件通过）**：(1) 默认值改动须先经用户单独拍板，并同步改 `cu-p1-a-always-allow.md` 与测试；(2) 敏感应用隐藏 Always-allow 必须复用 `desktopActIsSensitive`，由 main 推给 renderer，renderer 不得自建名单；(3) 不得让中止重发 `run.end`（`claim-run-end.ts`：中止只发 `run.error`），完成 / 停止 / 出错由通知层从现有 end / error 推导，尽量不改事件合约；(4) 通知会显示在锁屏：只写应用名 + 动作类型，不得出现 `type` 的输入文本或敏感窗口里的控件名。

**② 自动化错过运行诚实化**
- 一句话：电脑睡着错过的定时，不再静默消失。
- 现状：部分。`automations-scheduler.ts`「不补错过的点」；`automations.ts` 只有 `lastRunAt/lastRunStatus`。
- Do：启动/唤醒时计算 7 天内错过点，历史写入 `skipped` + 原因（睡眠/上次未完/应用未开）；每条自动化可选「补跑最近一次」，默认关；补跑也走同一审批，停住时进 Approval Dock 并发通知。参照 T6。
- Don't：不做「按任务 Always-allow / 自动批准」；不做云端代跑；不补多次。
- 投入：S，≈3 人日（kai 1.5、mike 1、luna 0.5）。
- ICE 6/9/8＝23。
- 架构契合：高（复用 `automations-run.ts` / `automations-notify.ts`）。风险：低（唤醒事件跨平台差异，用 Electron `powerMonitor`）。闸与真源：补跑 run 与手动 run 同审批链；跳过记录存本机。
- **通过条件（leo · 有条件通过）**：(1) 补跑 run 不得继承 `desktop_act:*` 任意桌面会话授权，按应用的会话授权与 Always-allow 列表照常生效；(2) 每个计划时间点带幂等键（类似 `commandId`），多次唤醒事件不重复补跑；(3) 跳过记录仅存本机。

**③ 模型单价 + 估算成本** — kai ★1
- 一句话：用量页给出「估算」花费，而不是永远 0。
- 现状：部分。`trace-tree-builder.ts` `estimatedCost: 0`；provider profile 无单价。
- Do：打包 models.dev 离线快照（MIT），profile 加可选单价字段（用户可改，用户值优先）；按 token 算 `estimatedCost`，UI 一律标「估算」；无价时显示「—」不填 0；顺带用其 context 元数据补 `published-context-window.ts`。
- Don't：不联网实时拉价作为必需路径；不显示订阅制 CLI（Claude/Codex 订阅）的假花费；不做账单。
- 投入：S–M，≈4 人日（kai 2.5、mike 1、luna 0.5）。
- ICE 7/8/7＝22。
- 架构契合：高（`packages/providers` + `ipc-contract` 字段）。风险：低（快照过期→显示快照日期）。闸与真源：价格表是本机静态数据，不影响任何审批。
- **通过条件（leo · 通过）**：离线快照放 `packages/providers`，带版本号与日期；用户填写的单价优先；缓存 token 与推理 token 分别计价；未知价格显示「—」；主路径不联网。

**④ 符号级 Repo map** — leo #2
- 一句话：`repo_outline` 从目录骨架升级为「按相关度排序的符号地图」，Explore 可用。
- 现状：部分。`packages/agent-core/src/context/repo-outline.ts` 只有目录。
- Do：优先 web-tree-sitter wasm（按语言懒加载 grammar；leo：ast-grep napi 需各平台 prebuild）抽 TS/JS/Py/Go/Rust 签名，按引用次数 + 近期 git 改动排序，默认 ~1k token 预算，按 mtime 缓存；作为只读工具注册在 Explore / Execute；Inspect Prompt 显示占用。
- Don't：不做 LSP / 多标签编辑器；不每轮强灌全图；不新增 StreamEvent。
- 投入：M，≈6 人日（leo 1、kai 4、mike 1）。
- ICE 8/7/6＝21。
- 架构契合：高（只读工具，ToolLoop 内）。风险：中（wasm 体积与 grammar 懒加载）。闸与真源：只读、路径 jail 复用 `AgentWorkspaceHost`；SSH 工作区诚实降级为目录骨架。
- **通过条件（leo · 通过）**：优先 web-tree-sitter wasm + 按语言懒加载；只读，范围不超出 `AgentWorkspaceHost`；SSH 工作区降级为目录骨架。

**⑤ 统一 OS 沙箱（sandbox-runtime）** — kai ★2
- 一句话：bash 在 mac 与 Linux 都有真 OS 边界，而不是正则。
- 现状：部分。`os-sandbox.ts` 仅 Seatbelt；`policies/sandbox.ts` 正则拦 curl/wget 等。
- Do：先 mac+Linux 接 `@anthropic-ai/sandbox-runtime`（Apache-2.0）：写盘限工作区+tmp、网络默认拒绝 + 域名放行；Linux 缺 bwrap 时显式「未隔离」徽标；Windows 继续诚实标「未包装」；后续再考虑 MCP stdio。
- Don't：沙箱不替代审批（审批仍是人边界）；不引入容器/microVM；不在 UI 宣称 Windows 已隔离。
- 投入：M，≈7 人日（kai 4、leo 2、mike 1）。
- ICE 9/6/5＝20。
- 架构契合：中高（包一层 spawn，不动 ToolLoop）。风险：中高（npm 0.0.x、本地代理与用户代理共存、Ubuntu userns/AppArmor 限制、平台漂移）。闸与真源：`resolveToolApproval` 先行，沙箱是额外一层；策略存本机设置。
- **通过条件（leo · 有条件通过）**：(1) 红线：**绝不**「已沙箱 ⇒ bash 自动批准」，审批顺序不变；(2) 精确钉版本（0.0.x），放在 `os-sandbox` 适配层之后；正则拦截等能力对齐后才移除；(3) 域名放行经本地代理实现，需测试与用户自有代理共存；(4) Ubuntu userns / AppArmor 失败时显示「未隔离」，**绝不**静默无沙箱运行。

> **备选替换（mike 输入后追加；Top 5 已送用户拍板，未改动）**
> 「前端收口」（sonner + xterm addon）ICE **23**，高于 Top 5 ⑤「统一 OS 沙箱」（20）。若纯按分数，它会替换 **⑤**。建议**不替换**：⑤ 是 kai 的安全地基，换掉后 Top 5 只剩一个地基项；前端收口约 2 人日，可作为插空项与 Top 5 并行。由用户决定。
> virtua（20）与 ⑤ 同分，不触发替换，列入次批首位。
>
> **次批（前端，按 ICE）**：virtua 20 → @pierre/diffs 18 → tinykeys 17 / @headless-tree 17 → Tiptap Mention 13（观察不做）。另：#4 Recipe、#5 Skills 校验仍为后端/产品侧次批 S 项。

**次批 · leo 架构结论**
| 项 | 结论 | 条件 / 红线 |
|---|---|---|
| Recipe（Composer 预设扩展） | 通过 | 只能携带 prompt / 模式 / `desktopBias`；带任何授权或名单条目即 block |
| Skills 规范校验 | 通过 | `allowed-tools` 仅展示 |
| 官方 MCP SDK 替换传输层 | 有条件 | 保持 `packages/mcp` 对外接口；OAuth token 存 main 密钥库；调用仍经 `resolveToolApproval` |
| MCP Apps 对齐稳定规范 | 有条件 | iframe 的 `ui/message` 与工具请求视为不可信，必须过审批；任何绕过即 block |
| 右栏步骤胶片 | 有条件 | 帧只存内存、按 run 隔离；敏感窗口不生成缩略图 |
| promptfoo evals | 通过 | 仅 devDependency |

### 3.4 明确拒绝（与锁/红线冲突；leo 全部同意）

1. **手机遥控经厂商云中继（Remote Control 式）**：转录上云、远端驱动本机桌面，冲突「local-first / 不让云端操作用户桌面」。
2. **持续屏幕记忆（Chronicle / screenpipe 式后台录屏）**：跨 App 常驻截屏绕开 CU 按应用审批与 mention≠allow；隐私成本高（官方自己提示文件可被他应用读取）。
3. **自动批准类**：自动化「按任务 Always-allow」、Skills `allowed-tools` 当预批、desktop_act「智能审批」、跨应用「记住我的选择」—— 绕过 `resolveToolApproval` / 二次确认（leo 预设红线）。
4. **ACP Registry 自动安装 / Agent 市场（含付费 Agent 市场类条目）**：Registry≠插件市场，I3 仍停。
5. **Worktree 并行会话 / 本机进程内大模型（node-llama-cpp）/ 云沙箱（e2b、microsandbox）/ LiteLLM 网关**：前者冲突「无 worktree 舰队」；后三者 kai 评估为原生依赖或 Python/云服务，无法内嵌 Electron 且与 Ollama/LM Studio 预设重叠。另：全局划词条 / 菜单栏小窗（luna 拒：额外跨 App 层，与 overlay 竞争）。

### 3.5 未能核实 / 注意
- Aider 最近 push 为 2026-05-22，活跃度低于其余项。tokenlens 的 license 未核。
- kai 的「HTTP 通知 no-op、无 OAuth」「OTel 只导单 span」「Ollama/LM Studio 预设」为其仓内结论，本稿只抽查了 `client.ts`、`otel.ts`、`estimatedCost`、`policies/sandbox.ts`、`os-sandbox.ts`。
- mike 的「virtua ~3.7k⭐、@pierre/diffs ~6.3k⭐、sonner ~13k⭐」已核实；「tinykeys ~650B」指包体积，其仓库 stars 为 4.1k。mike 说 diff「截断 >400 行」，实为开启「折叠大文件」选项时只留第一块 hunk。@pierre/diffs 的 npm 元数据没有 repository 字段，仓库是按 GitHub 代码搜索在 `pierrecomputer/pierre` 的 `apps/diffshub` 等处找到的。
- 趋势 T4 的 Chronicle 细节引自 9to5Mac 转载的 OpenAI 原话，未直接打开 OpenAI 文档页。
