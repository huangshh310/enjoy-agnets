# Enjoy 开发计划：P0-H / I2 / I1 / P0-R

> 角色：执行计划（不是「当前真相」）。落地仍以 `design/specs/*` 为准。  
> 对照产品稿：`cli-bind-ux.md` · `plugin-extensions-hub.md` · `emerging-agent-innovation.md` · `p0-r-remote.md`  
> 最后更新：2026-09-13  
> 约束：不挡已合的 F/G；假 BYOK / 沙箱上轨 / worktree / 跨 Agent MCP 委派仍砍

---

## 0. 一句话

三份产品稿不是同一刀。按仓库现状，**先做发现壳（H+I2），再做同引擎换模型（I1），远程工作区（R）单独成波且必须先预览**。CLI 绑定交互不当新功能排期，只做对照预览的缺口修补。

---

## 1. 现状基线（代码已有，不要重做）

| 面 | 已落地 | 缺口 |
|----|--------|------|
| P0-F / P0-G | 系统浏览器预览、Sources 明细 sheet | 无 |
| CLI × vault 绑定 | 一份 vault、协议过滤、开流 env、家目录同步、576px 抽屉、下拉档案、模型族标、「也用于」、菜单外添加、≥6 筛选、绑档案后官方 inspect 降旁注 | 文档自称已对齐；只对照 `local-cli-dense-p0.html` / `p0-add-provider-discover.html` 扫像素与文案 |
| MCP | `#/mcp` 工作模块：已配置 / 本地预设市场 / JSON；`mcp-presets.ts` 已有精选结构 | 没有跨 MCP+Skills 的聚合入口 |
| Skills | `#/skills` 工作模块：总览 / 精选集市 / 来源 / doctor；`skills-curated.constants.ts` 已有精选卡 | 精选只在 Skills 页，扩展壳看不到 |
| 设置 IA | 侧栏 4 组 10 项；「工作区与扩展」= 工作区 + MCP；Skills 在智能体组且另有工作模块 | 没有「扩展」聚合页 |
| 换引擎 | 空会话直切；有用户轮走 `EngineHandoffCard`；`requestEngineSwitch(to, modelId)` 同引擎时只 `upsert` 全局 `modelId` | **没有**会话级换模型、没有「已切换」角标、同引擎也会误走 handoff 判定（`from===to` 才 noop） |
| 工作区 | SQLite `workspaces(id,name,root_path)`；`createWorkspaceHost(root)` 本地 fs；终端 `node-pty` cwd=root；ACP spawn `cwd=workspaceRoot` | **零 SSH**；`kind` 不存在 |
| 预览 | F/G/CLI / H / R 已入库 | 视觉真源 `p0-h-extensions-hub.html`、`p0-r-remote-workspace.html` |

轨道现有工作模块（不要再塞第 8 个与 MCP/Skills 抢入口）：

`chat · knowledge · workflows · media · mcp · skills · observability`

---

## 2. 不变量（打破先停）

- 渲染进程不调模型、不读明文 Key、不 `fs` / `child_process` / `ipcRenderer`。
- Agent 循环只在 main；UI 只订 `agent.event`。
- 新 IPC：contract → main → preload → renderer；Zod parse 失败即拒。
- 远程 = **工作区在哪台机器**，不是第三种引擎，不上 Composer 导轨。
- Cursor / Grok / Antigravity / Amp **禁止假 BYOK**；远程不改变这条。
- 沙箱配置只在设置，不上轨。
- 不自动 worktree；不默认同步整仓到本机。
- 密钥：Enjoy vault 本机；远端 CLI 登录留在远端家目录；SSH 私钥不进聊天、不进 renderer。
- Registry 只装 Agent CLI，不混 Skills/MCP 市场。
- 冲突时以 `design/specs/*` 为准，references 只是背景。

---

## 3. 关键决策（开工前锁死）

### D1 · H 落点：设置页，不上第 8 轨

**做** `#/settings/extensions`（设置「工作区与扩展」组新增「扩展」）。两列 MCP | Skills：已配置数 +「添加」深链 `#/mcp` / `#/skills`。脚注：「Claude / Codex 等自带插件请在各助手内管理」。

**不做** 新工作模块抢 MCP/Skills 轨道位，**不**新增第四套存储。

理由：Cline Customize 在设置；轨道已有 MCP 与 Skills；H 是发现壳。空态/顶栏可加「浏览扩展」链回本页。

### D2 · I2 并进 H，不新开运行时

精选卡数据复用：

- MCP：`components/mcp/constants/mcp-presets.ts`
- Skills：`components/skills/constants/skills-curated.constants.ts`

扩展页只读投影 + 一键深链（MCP 打开创建/市场；Skills 打开精选集市并带 `?install=` 或高亮）。禁止再造 catalog 服务、禁止 `npx` 临时下载。

### D3 · I1 是会话级换模型，不是换引擎

- 同 `runtimeId` 换 `modelId`：**不**走 `EngineHandoffCard`。
- 作用域：`sessionModels[sessionId]`（对标已有 `sessionRuntimes`），**禁止**把中途换模写成全局 `agentTools.upsert`（现 `persistRuntimeId` 会写全局，I1 必须拆开）。
- Enjoy Local：下一轮 ToolLoop 用新模型，不断桥。
- ACP：沿用已知坑「换模型拆 session 再 spawn `--model`」；角标「已切换」；可写一条系统/隐藏旁注，**禁止**当用户消息、禁止当 handoff brief。
- 空会话换模型可同时写偏好默认；有用户轮只写会话覆盖。

### D4 · R 的深度模块：`AgentWorkspaceHost` 加第二只适配器

**不要**把 SSH 散进每个 IPC handler。现成接口已经够深：

```text
AgentWorkspaceHost
  readFile / writeFile / editFile / listDir / glob / grep
  bash / gitStatus / gitDiff / gitLog / gitCommit / gitPush / gitBranch?
```

| 适配器 | 何时 |
|--------|------|
| `createWorkspaceHost(root)`（已有） | `kind=local` |
| `createSshWorkspaceHost(conn)`（新） | `kind=ssh` 且已连接 |

工厂按 `workspaces.kind` 选适配器。UI / 审批 / 会话 transcript 仍本机。文件、bash、git、终端 cwd、ACP spawn cwd 走 host。

ACP 远程 spawn：本机不装远端 CLI 的假路径；经 SSH 在远端 cwd 跑已装二进制，stdio 隧道回 main。P0 不做远程桌面、不自动装远端 CLI。

### D5 · 预览纪律

H 与 R **没有**视觉真源。每刀先入库 HTML，锁 tip 后再接线（与 F/G/CLI 同一惯例）。I1 可在 Composer 预览上加一页，或扩现有 picker 预览。

### D6 · CLI 绑定不占主队列

`cli-bind-ux.md` §9 已写「已对齐」。Wave 0 对照预览做一次缺口清单；无用户可见差距则关闭，有则小 PR，不重开绑定模型。

---

## 4. 队列总图

```text
Wave 0  并行、小时级     CLI 绑定对照预览（仅缺口）
Wave 1  P0               H 预览 → H 壳 → I2 精选卡（可同一 PR 后半）
Wave 2  P0（H 后）        I1 同引擎中途换模型
Wave 3  P0-R（可与 Wave 1 并行画预览；代码建议 H 合后）
          R0 预览
          R1 数据模型 + 连接态 UI（断线不可发送，尚无远端 IO）
          R2 远端读（list/read）+ 顶条诚实态
          R3 远端写 / git / 终端
          R4 ACP spawn 走 SSH stdio（最硬）
Wave 4  P1               I3 Registry 花名册 · I4 Automations cron/webhook · I5 跨引擎检索
soft                     I6 工作流小图 · I7 CI 失败再跑
```

I3–I7 **本计划不排进 P0 实现**，只留接口，避免和 H/I1/R 抢带宽。

建议日历（单人连续）：Wave 0 半天；Wave 1 约 3–5 日；Wave 2 约 2–3 日；Wave 3 约 1.5–2.5 周（R4 单列风险）。

---

## 5. 分波次切片

### Wave 0 — CLI 绑定缺口审计

**目标**：确认 `cli-bind-ux` 与代码/预览一致，只修真实差距。

**入口**：`settings/agent-tools/bind-source/`、`agent-tool-provider*.tsx`、`power-source/`；spec `agent-cli` + `settings`。

**做法**：对照 `previews/local-cli-dense-p0.html`、`p0-add-provider-discover.html` 走三条关键路径（官方 Claude + OpenAI 中转、Codex 绑 lucky0625、「也用于」、≥6 筛选）。列出像素/文案/状态机差距；无则在 `cli-bind-ux.md` 标「审计日」；有则小 PR。

**非目标**：重做抽屉、假 BYOK、15721 代理。

---

### Wave 1 — P0-H + I2

#### PR-H0 预览入库

| 项 | 内容 |
|----|------|
| 文件 | `design/previews/p0-h-extensions-hub.html` |
| 画 | 两列 MCP \| Skills；计数；添加；精选卡（I2）；脚注诚实文案；无协议微标；无 Registry 混排 |
| 锁 | 提交 tip 写入 `plugin-extensions-hub.md` + 本计划 + 日后 `settings` spec |

点头后再写代码。

#### PR-H1 扩展发现壳

**路由**：`#/settings/extensions`。`SETTINGS_SECTIONS` 已有 26 个 ID，**新增** `extensions`（不是替换 MCP）。侧栏「工作区与扩展」三项：工作区 / **扩展** / MCP。`#/settings/mcp` 仍 redirect 到工作模块或保持现合同（以 `settings` spec 为准，不要两套 MCP 配置页）。

**文件树（规划）**：

```text
apps/desktop/src/renderer/src/components/settings/extensions/
  extensions-page.tsx          # 组装：两列 + 脚注
  extensions-column.tsx        # 单列：标题、计数、添加、精选槽
  extensions-copy.ts           # 文案键，禁止组件内堆中英长句
  extensions.types.ts
  constants.ts                 # 深链 hash、列 id
apps/desktop/src/renderer/src/router.tsx          # Hash 路由
settings-catalog.ts / settings-catalog-nav.ts / settings-sections.ts
packages/ui 不新增运行时控件；用现有 Card / Button
```

**数据**：TanStack Query 已有 `mcp` list 与 `skills.sources` / `skills.list`。本页只读聚合，禁止新 IPC。

**注释**：文件顶写「发现壳，权威配置仍是 #/mcp 与 #/skills」；深链函数写清 query。

**验收**：

1. 10 秒内从设置找到添加 MCP / 技能。
2. 点添加进入现有页，不弹第二套表单。
3. Registry / 本机 CLI 不出现在此页。
4. 无 `ACP · stdio` 类协议微标。
5. 本机工作区行为不变。

**回写**：`settings.md` 当前真相（新路由、侧栏 10→11 或保持 10 项但扩展替换？**推荐 11 项里扩展进「工作区与扩展」，MCP 仍可从轨道进工作模块，设置组保留 MCP 深链到 `#/mcp`**）。`ui.md` 若轨道不变则只补设置。`plugin-extensions-hub.md` 状态改为已落地（以 spec 为准）。

#### PR-H2 I2 精选浏览（可与 H1 后半合并）

扩展页每列下方只读精选 4–6 卡。点卡：

- Skills → `#/skills` 精选集市，定位该套件
- MCP → `#/mcp` 市场/创建，带 preset id

**验收**：一键深链安装走现有存储；无新运行时；未配置仍可浏览。

---

### Wave 2 — I1 同引擎中途换模型

**产品**：Composer 模型芯片可换；角标「已切换」；不换引擎、不走 handoff。

**现状问题**：`persistRuntimeId(runtimeId, modelId)` 会 `agentTools.upsert` 全局模型；`requestEngineSwitch` 仅 `from===to` 时当 noop 换模。有用户轮切**另一引擎**才 handoff。同引擎换模已有一半，缺会话作用域与角标。

**文件树（规划）**：

```text
apps/desktop/src/renderer/src/hooks/persist-runtime.ts
  persistRuntimeId            # 只绑引擎 + 可选默认模型（空会话）
  persistSessionModel         # 新：只写 sessionModels[sessionId]
stores/chat-store             # sessionModels
agent-picker/
  use-composer-active-model.ts
  model-switch-badge.tsx      # 「已切换」角标，极小
  request-model-switch.ts     # 同引擎换模入口，禁止进 handoff store
main: open-acp-stream / open-coding-stream
  读会话 model 覆盖；ACP dispose 再 spawn --model
ipc-contract: session.patch 或 agentTools.setSessionRuntime 扩 modelId
  （优先扩现有 setSessionRuntime，避免新频道）
```

**状态机**：

```text
点模型芯片（同 runtimeId）
  ├─ 空会话 → 写偏好默认 + 会话覆盖 → 角标可无
  └─ 有用户轮 → 只写会话覆盖
        ├─ Enjoy Local → 下一轮换模型，不断桥
        └─ ACP → dispose 当前 ACP session → 同 sessionId 再 spawn --model
              角标「已切换」；隐藏旁注可选
禁止 EngineHandoffCard
禁止当用户气泡
```

**验收**：

1. 同引擎换模无交接坞。
2. 换引擎仍走 M3 handoff。
3. 新会话不继承上一会话的中途模型，除非空会话时写过默认。
4. 仅官方 CLI 不出现假 vault 模型表。
5. 绑 Enjoy 档案时模型表仍只列 `models[]`。

**回写**：`agent-cli.md`、`m3-engine-handoff.md`（明确同引擎换模不是 handoff）、`ai-capabilities.md` 若开流读会话模型。

**已知坑预埋**：ACP 拆进程会丢 CLI 侧上下文——文案必须诚实（「新模型从下一轮生效；本机助手会话会重开」），不要假装 Kilo 式热切换。

---

### Wave 3 — P0-R 远程工作区

用户故事：笔记本开 Enjoy，SSH 到公司开发机，用已装 Claude/Codex 改远端仓库，审批仍在本机点。

#### R0 预览

`design/previews/p0-r-remote-workspace.html`：本机 vs 远程 SSH 切换、SSH 抽屉（host/user/port/认证/远端路径）、连接中/已连接/失败/断开顶条、Composer 脚注「远程 · host:path」、文案「远程 ≠ 引擎」。

#### R1 数据模型 + 诚实连接态（尚无远端 IO）

**迁移** `packages/db/src/migrations/` 新文件（不要改 baseline.ts）：

```text
workspaces
  kind TEXT NOT NULL DEFAULT 'local'     -- local | ssh
  ssh_host / ssh_user / ssh_port
  ssh_auth TEXT                          -- agent | keypath
  ssh_key_path                           -- 本机私钥路径，不是私钥内容
  remote_path                            -- 远端 cwd
  ssh_status                             -- idle | connecting | connected | failed | disconnected
```

或 `ssh_json` 一列 Zod 校验。私钥内容禁止入库。

**IPC（新频道，必须走 contract）**：

- `workspace.openSsh` `{ host, user, port, auth, keyPath?, remotePath, name }`
- `workspace.connect` / `disconnect` / `retry`
- 事件 `workspace.remote` `{ workspaceId, status, label, error? }`

**UI**：

- `#/settings/workspace` 与开项目弹窗：本机文件夹 | 远程 SSH…
- 顶条连接态；`connecting` / `failed` / `disconnected` 时 `guardComposerSend` 禁发送
- Composer 脚注「远程工作区」
- 导轨 **无**「远程引擎」

R1 连上只改状态，文件树仍拒绝或显示「未接通 IO」——宁可诚实空，不要假列本机目录。更干净的做法：R1 的 SSH 工作区在未实现 host 前禁止打开 Files/Terminal（按钮禁用 + 人话）。

#### R2 远端读

`createSshWorkspaceHost`：`listDir` / `readFile` / `glob` / `grep` 经 `ssh`/`sftp`（main only）。路径 jail 在 `remote_path`。失败映射短因：「超时 / 拒绝 / 无此路径」。

Files 树打标「远程」。本机工作区回归测试必须绿。

#### R3 远端写 + git + 终端

写盘 / edit / bash / git* 走同一 host。断线：所有写 IPC 拒，错误码 `REMOTE_DISCONNECTED`，UI 不静默成功。

终端：`node-pty` spawn 本机 `ssh user@host -t`，cwd 语义是远端 `remote_path`。不是远程桌面。

检查点（`refs/enjoy/checkpoints`）P0 可在远端 git 可用时照旧；远端无 git 则跳过并诚实文案。不要把检查点镜像到本机。

#### R4 ACP spawn 走 SSH

`open-acp-stream` 的 cwd/spawn：

- local：现状
- ssh：`ssh user@host` + 远端二进制 basename 白名单 + 远端 cwd
- stdio 隧道回 ACP 客户端
- 登录仍是远端家目录；本机不读远端 `auth.json`
- `assertAllowedCommand` 仍约束远端 argv 的 basename

这是 Wave 3 风险最高的 PR。可先只支持「远端已在 PATH 的同一 catalog 二进制」，失败人话「远端未找到 claude」。

**R 验收（产品稿 §5）**：

1. 本机工作区回归不变
2. SSH 连上后读文件路径在远端
3. 断线不能静默写盘
4. 导轨无「远程引擎」
5. 仅官方 CLI 不因远程出现假 vault

**非目标**：内嵌远程桌面、自动装远端 CLI、云账号、沙箱上轨、worktree、OpenHands 远程 Agent Server、只读同步云工作区。

**回写**：新 spec `design/specs/remote.md`（当前真相 / 不变量 / 代码入口 / 已知坑）+ `design/README.md` 表一行；改 `workspace.md`、`architecture.md`、`ipc.md`、`agent-cli.md`（spawn cwd）、`product.md` 分期。`p0-r-remote.md` 标已落地范围，P1 仍留远程 Agent Server。

---

## 6. 模块 seam（给实现用的深度接口）

### 扩展壳（浅 UI，深数据已在别处）

```text
界面：extensions-page 只知道 { mcpCount, skillCount, curated[], hrefs }
实现：现有 mcp / skills queries
禁止：extensions-service.ts 再做一份安装内核
```

### 会话模型（I1）

```text
界面：getEffectiveModel(sessionId, runtimeId) → modelId
实现：sessionModels > 引擎默认 > 档案 models[0]
测试只打这一函数 + persistSessionModel
```

### 远程工作区（R）

```text
界面：AgentWorkspaceHost（已有，不扩方法也能做完 P0 读/写/bash/git）
新增方法（若必须）：ping(): Promise<'ok'|error> 可放连接层，不要塞进 host 每个文件 API
连接层：SshConnection { status, exec, sftp, dispose }
host 适配器依赖连接层
ACP spawn 依赖连接层的 exec/stdio，不依赖 UI
```

**删除测试**：删掉 `createSshWorkspaceHost`，本地 host 调用方应零改动（工厂之外）。若删了还要改 20 个 IPC 文件，说明 SSH 泄漏了，切片失败。

---

## 7. 文档回写清单（每刀合并时）

| 刀 | 必须改的 spec |
|----|----------------|
| W0 | 仅当有缺口：`agent-cli` 已知坑 |
| H | `settings` 当前真相（路由/侧栏）；`plugin-extensions-hub` 状态；`ui` 若有深链 |
| I2 | `skills` / `mcp` 各补一句「扩展页只读投影」 |
| I1 | `agent-cli`、`m3-engine-handoff`、必要时 `ipc` |
| R | **新建** `remote.md`；`workspace` `architecture` `ipc` `agent-cli` `product` |

禁止把未实现写成已落地。预览锁 tip 写进对应 spec「视觉真源」。

---

## 8. 风险与减负

| 风险 | 减负 |
|------|------|
| R4 SSH+ACP stdio 不稳定 | R1–R3 先可交付「远端文件+终端+本地 Enjoy Agent」；ACP 远程作为 R4 可单独关旗标 |
| I1 ACP 丢上下文 | 角标 + 一句人话，不承诺热切换 |
| H 做成第四套市场 | 无新表、无新 IPC、无安装内核 |
| 远程变「远程引擎」 | Composer 导轨回归测试；`runtimeId` 枚举不加 `ssh` |
| Finder PATH / 远端 PATH | 远端探测复用 catalog basename，失败人话，禁止 `npx` |
| 密钥进 renderer | SSH 配置只传 host/user/port/keyPath；私钥不读进 UI |
| 单文件超 300 行 | H 从第一天分子目录；R 的 ssh 连接 / sftp / spawn 三文件 |

---

## 9. 明确不做（本计划窗口）

- 假 BYOK、沙箱上 Composer 导轨、git worktree 舰队
- 跨 Agent `delegate_to_agent` MCP
- 收费云插件店、各家私有 Plugin JS 运行时
- I3–I7 当 P0
- OpenHands 云后端 / 远程 Agent Server（R 的 P1）
- 本机 `sshfs` 挂整仓当假本地副本
- 在智能体抽屉就地 CRUD 供应商（绑定长文已禁）

---

## 10. 建议的第一刀（你点头后执行）

1. 入库 `design/previews/p0-h-extensions-hub.html`（含 I2 精选卡示意）
2. 改 `settings` spec 草稿段（仍标未落地直到代码合）
3. PR-H1 代码：`#/settings/extensions` 两列深链

R 的预览可与 H 代码并行画，但 R1 迁移不要插进 H 的 PR。
