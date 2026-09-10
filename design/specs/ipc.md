# spec/ipc

> 渲染进程只打白名单；入参全部 Zod。最后更新：2026-09-09

## 当前真相

合约包：`packages/ipc-contract`。preload 把 `ipcRenderer.invoke` / `on` 收成 `window.ide`。main 在 `apps/desktop/src/main/ipc.ts` 注册 handle。

### Invoke 频道（实现已有）

| 前缀 | 频道 | 用途 |
|---|---|---|
| workspace | `open` `pickFolder` `pickFile` `remove` `list` `files` `readFile` `writeFile` `move` `watch` `diff` `changes` `gitLog` `gitCommit` `gitPush` `gitPatch` `gitRestore` `gitStage` `listCheckpoints` `restoreCheckpoint` | 工作区与文件、真实 Git 记录与提交；`gitLog` 入参 `{ workspaceId, limit? }` 返回当前分支名（detached / 非仓库为空串）、上游（失败为空串，禁止回落 main）、`branchFiles`（`upstream...HEAD`）与**线性** `commits[]`，不是提交树；`gitStage` 入参 `{ workspaceId, paths, action: add\|unstage }` 按文件 `git add` / `git restore --staged`，路径 jail，空匹配抛 `STAGE_NOTHING_MATCHED`；`gitCommit` 入参 `{ workspaceId, message, stageAll? }` **默认只提交已暂存**（`stageAll` 默认 false），`stageAll: true` 才 `git add -A`（Agent `git_commit`），空工作树拒绝；`gitPush` `{ workspaceId }` 推当前上游，无上游即拒；`gitPatch` `{ workspaceId, paths? }` 返回 `git diff HEAD`；`gitRestore` `{ workspaceId, paths }` 还原改动条文件（已跟踪 `git restore --source=HEAD --staged --worktree`，未跟踪删除，路径 jail；对不上 porcelain 抛 `RESTORE_NOTHING_MATCHED`，禁止空转 `{ok:true}`）；`listCheckpoints` `{ workspaceId }` 返回 `refs/enjoy/checkpoints/*`（`ref` / `sha` / `createdAt`，stamp 降序）；`restoreCheckpoint` `{ workspaceId, ref }` 只认该前缀，`read-tree` 换 index + `checkout-index`，不移动 HEAD，删快照外已跟踪/未忽略未跟踪文件；非法 ref 抛 `CHECKPOINT_REF_INVALID`，找不到抛 `CHECKPOINT_NOT_FOUND`；`diff` 可带 `ignoreWhitespace`；`changes` 每行含 `staged`/`worktree`（porcelain 保留 XY，禁止 trim 前两列）；`pickFolder` / `pickFile` 只选路径不落库；`readFile` 走 `resolveKnowledgePath`，根外绝对路径即拒；`move` 入参 `{ workspaceId, from, toDir }` 把条目 `fs.rename` 进目标目录（`.` 为根），from/toDir/dest 都 jail，目标已存在抛 `MOVE_EXISTS`，进自己抛 `MOVE_INTO_SELF`，同位置抛 `MOVE_SAME_LOCATION`，找不到抛 `MOVE_NOT_FOUND`，不走 HMAC；`open` 可带 `name`；`remove` / `changes` 入参 `{ workspaceId }` |
| session | `list` `listArchived` `create` `messages` `rename` `archive` `unarchive` `delete` `deleteArchived` `compact` `getCompaction` `clearCompaction` | 会话与上下文压缩；`compact` 失败抛英文码 `COMPACTION_TOO_SHORT` / `COMPACTION_NOT_ELIGIBLE`，UI 翻词表；`list`/`create` 入参 `{ workspaceId, title? }`；`messages` 入参 `{ sessionId }`；`compact` 入参 `{ sessionId, keepRecent? }`；`getCompaction`/`clearCompaction` 入参 `{ sessionId }`；`list` 不含已归档 |
| agent | `run` `abort` `steer` `decide` `inspectPrompt` | 跑循环、中止、运行中纠偏、审批、本轮 ModelMessage 快照；`run` 可带 `attachments` 与 `runtimeId`；`steer` 入参 `{ sessionId, runId?, text }`，无 ActiveRun 抛 `STEER_NO_ACTIVE_RUN`（renderer：已 idle 立刻 `agent.run`，仍 running 才进 followup）；`inspectPrompt` 入参 `{ sessionId, mode?, modelId? }` |
| agentTools | `list` `detect` `upsert` `doctor` `install` `uninstall` `login` `openDocs` `setSessionRuntime` `syncConfig` `restoreConfig` `inspect` `disposeSession` `setHandoff` `upsertCustom` `removeCustom` `getCustom` | 本机 CLI 目录与探测；覆盖含 path/args/modelId，无 token；`list` 每条带静态 `capabilities`（`runtime-capabilities.ts`），含 `custom:<slug>`；`install`/`uninstall`/`openDocs`/`syncConfig`/`restoreConfig` 入参内置 `{ id }`；`login` 入参 `{ id, provider? }`（OMP 必须带 `provider`，spawn `omp auth-broker login <provider>`）；`inspect` 入参 `{ id, refresh? }`，返回公开账号 / 额度 / 动态模型 / OMP `providers[]`（id/label/loggedIn，可选 origin/loginKind），不含 token；自定义走 `upsertCustom` / `removeCustom` / `getCustom`（command 经 basename 白名单）；安装/卸载只跑配方里写死的 npm/brew argv（多步必须全跑，例如 Pi = `pi-coding-agent` + `pi-acp`）；`login` 可用 catalog `loginBinary`（Amp → `amp login`）；`openDocs` 仅 https + host 白名单；`syncConfig` 写 Claude `settings.json` / Codex `config.toml`（先备份 `*.enjoy.bak`，不写 auth.json）；`list` 只 PATH 查找；`setSessionRuntime` `{ sessionId, runtimeId }` 接受内置或 `custom:*`；`disposeSession` `{ sessionId }` 杀掉该 Enjoy 会话的 ACP 子进程；`setHandoff` `{ sessionId, fromRuntimeId, toRuntimeId, summary }` 写入一次性隐藏 brief，开流消费，不进用户气泡 |
| settings | `get` `saveSecret` `setDefaultModel` `setPreferences` `setHarness` `listProviders` `presets` `upsertProvider` `removeProvider` `activateProvider` `setActiveModel` `probeProvider` `pingProvider` | 设置与供应商；`setDefaultModel` `{ modelId }`；`removeProvider`/`activateProvider` `{ id }`；`kind` 必须是 `PROVIDER_KINDS`；`setPreferences` 可带 `accountProfile`（本机画像，不是云账号） |
| automations | `list` `upsert` `remove` `run` | 自动化；`remove` 入参 `{ id }`；`run` 入参 `{ id, sessionId, workspaceId }` 立刻 `agent.run` |
| models | `list` | 已配置模型目录；每条可带 `contextWindow`（探测 / Gateway / 手填，没有则省略）与 `maxTokens`（最大**输出**，不是窗口） |
| ai | `generate` `abort` `resume` | 文本/结构化/媒体/embedding/translation；kind=`agent` 转发 `runAgent`，必须带 workspaceId；`resume` 按 kind 分流：workflow 续步，其它读 generation 快照再跑 |
| agent | `decide` | 验 HMAC；`ApprovalDecision` `.strict()`，多余 `args` 即拒；`ask_user_questions` 可带可选 `answers`，但 `answers` 不能配 `allow_session`；对该工具 `allow_session` 由 main 在 HMAC 落库前拒；篡改 runId / toolCallId 或库内签名即拒 |
| assets | `import` `list` `read` `export` `delete` `upload` | 资产库与 provider 引用 |
| knowledge | `sources` `documents` `addSource` `index` `search` `cancel` `remove` | RAG；`documents` 可带 `sourceId`，合并库内文档与磁盘扫描 |
| workflow | `list` `get` `start` `recover` `resume` `cancel` `retry` | Durable run |
| mcp | `servers` `upsert` `remove` `connect` `disconnect` `test` `tools` `call` `setPermission` `openApp` `appMessage` | MCP；`call` 入参 `McpCallInput`；`openApp` / `appMessage` 仅 trusted，消息经 `sanitizeAppMessage` |
| realtime | `open` `sendAudio` `close` | 实验语音；连不上远端返回 `{ transport: "loop" }` 且 `realtime.status=error`，禁止把本地回环标成 `open` |
| observability | `metrics` `export` `setPolicy` `replay` | 本地指标与内存 stream 回放 |
| terminal | `open` `write` `resize` `close` | node-pty；`resize` 入参 `{ sessionId, cols, rows }` |
| window | `minimize` `toggleMaximize` `isMaximized` `close` | 无边框窗 |
| app.update | `status` `check` `download` `install` | 自动更新；入参空对象；返回 `AppUpdateSnapshot`。`status` 只读快照不打 GitHub。开发态 `status=dev`。`check` 才查更新。`download` 进度走推送；下完 main `quitAndInstall`，UI 在 `ready` 再调 `install` 是幂等兜底 |
| rules | `list` `read` `create` `delete` `reveal` | 项目规则；读删定位走允许根；工作区路径必须已登记 |
| skills | `list` `read` `create` `delete` `reveal` `sources.overview` `sources.detail` `sources.add` `sources.update` `sources.remove` `sources.deleteSkill` `sources.configure` `sources.deploy` `sources.doctor` `sources.curated` `sources.updateAll` `sources.repair` | 技能包；删除只允许 skill root 的直接子目录。`sources.deleteSkill` 删来源内单个包；`sources.remove` 卸载来源组（Git 清投影，本机发现组只隐藏）。`sources.updateAll` 返回 `SkillSourceUpdateAllResult`（`updatedCount` / `skippedCount` / `errors`），只快进 Git 源 |

### 推送事件

| 频道 | 载荷 |
|---|---|
| `agent.event` | `StreamEvent` v1+v2（见 `ai-capabilities`）；含 `commands.update`（ACP `available_commands_update`，进 ⌘L 不是 Composer 斜杠条）；`tool.start` / `tool.result` 可带 `parentToolCallId`（子 Agent 工具树）；`emitEvent` 经 `stampAndSend` 补 `sequence` / `sessionId`（事件自带或 `ActiveRun.input.sessionId`）再推窗口 |
| `window.maximized-changed` | `{ isMaximized: boolean }` |
| `app.update` | `AppUpdateSnapshot`（status / version / releaseNotes / percent / error） |

新增频道的顺序：**先改 `ipc-contract` → main handle → preload → renderer 调用**。禁止 renderer 直接 `ipcRenderer`。

## 不变量

- 未知频道不暴露。preload 是唯一桥。
- `windowFromEvent` 取不到 BrowserWindow 就抛，不要静默 no-op 掉审批 / agent.run。
- `StreamEvent` 是 discriminated union，消费端用 `type` 收窄，不要 `as any`。
- 助手复杂消息走 `parseAssistantPayload` / `serializeAssistantPayload`，与 `foldToolEvent` 同一套折叠。

## 代码入口

- schema：`packages/ipc-contract/src/index.ts` 只再导出；聊天 `chat.ts`、引用/纠偏 `quoted-context.ts`（`QuotedContext` 规范类型 `file|diff|terminal_output|task_step`，兼容旧四类；正文 `content ?? snippet`）、工作区 `workspace-io.ts`、移动规划 `workspace-move-plan.ts`、设置 `settings-input.ts`、审批 `approval.ts`、提问 `ask-user-questions.ts`、会话 `session.ts`、window / terminal / AI 能力、技能来源 `skill-sources.ts`、自动更新 `app-update.ts`、本机 CLI `agent-tools.ts` + 静态保真 `runtime-capabilities.ts` 各自独立
- 注册胶水：`apps/desktop/src/main/ipc.ts`（拼 `CHANNELS`，卸载必须成对）
- 壳频道：`ipc-shell.ts`（workspace / session / agent / terminal / window）
- 自动更新：`ipc-app-update.ts`
- 设置频道：`ipc-settings.ts`；探测 `ipc-provider-probe.ts`；Automations `ipc-automations.ts`
- AI 频道：`ipc-ai.ts`
- 技能来源：`ipc-skill-sources.ts`；Skills 扫描：`ipc-skills.ts`
- 本机 CLI：`ipc-agent-tools.ts`；`settings.get` 带 `agentTools[]` 与 `sessionRuntimes`；自定义 ACP 合约 `custom-agent.ts`
- 桥：`apps/desktop/src/preload/index.ts`
- 渲染封装：`apps/desktop/src/renderer/src/lib/ide.ts`、`lib/window-control.ts`

## 已知坑

- 重复 `registerIpc` 会叠 handle。`ipc.ts` 用 `ipcRegistered` 守卫，卸载时 `unregisterIpc` 必须成对。`session.rename` 必须进 `CHANNELS`，否则卸载会留下 handler。
- 频道名是 `agent.decide`，不要写成 `agent.decideApproval`。
- `ApprovalDecision.answers` 不能配 `allow_session`（schema superRefine）。`ask_user_questions` 即使不带 answers 也禁止 `allow_session`：main 在 `recordApprovalDecision` 之前抛，不要先落库再拒。
- Hash 路由与 IPC 无关，但设置页快捷键（`Ctrl+,` / Escape）在 `router.tsx`，不要做到 main 全局快捷键里抢焦点。
- harness / desktop 的 node:test 若 value-import `@enjoy-agents/ipc-contract` 入口，会因 index 无后缀 re-export 报 `ERR_MODULE_NOT_FOUND`。能力表走子路径 `@enjoy-agents/ipc-contract/runtime-capabilities`；自定义 id 走 `@enjoy-agents/ipc-contract/custom-agent`。renderer Vite 别名必须精确匹配包名，并单独写这些子路径；字符串前缀会拼成 `index.ts/runtime-capabilities`。
- `workspace.changes` / `session.list` / `session.create` / `session.messages` / `settings.setDefaultModel` / `removeProvider` / `activateProvider` / `automations.remove` 必须对象入参 Zod parse。不要再传裸 string。
- `workspace.gitCommit` 是用户主动提交，没有 runId / HMAC。合约默认 `stageAll: false`（只提交已暂存）；Review UI 必须显式走这条。Agent 工具 `git_commit` 仍走 `approval.required` + `agent.decide`，并可 `add -A`。不要把 UI 提交硬接进 HMAC 管道。`workspace.gitStage` 路径必须 jail，空匹配抛 `STAGE_NOTHING_MATCHED`。
- `workspace.restoreCheckpoint` 只认 `refs/enjoy/checkpoints/<stamp>`。禁止 `reset --hard` / `clean -fd`。成功后 invalidate `["changes", workspaceId]`，不要写成 `workspace-changes`。UI 留在检查点作用域，不要偷切未提交。
- `skills.sources.configure` / `deploy` / `remove` 只认 `manifest.json`。本机 Agent 技能根（`~/.agents/skills` 等）由 `persistDiscoveredSources` 在 overview / configure / deploy / doctor / repair 写入 manifest；漏写就会对自动发现来源抛 `SOURCE_NOT_FOUND`。投影到自身目录必须跳过 `cpSync`，否则 Windows 会在原地复制时报错。
- `workspace.writeFile` 是用户保存，路径 jail，不走 HMAC。可带 `sessionId` 触发 `on_save` 自动化。`workspace.move` 是 Files 树拖拽，同样 jail、不走 HMAC、不记写盘检查点。`workspace.watch` 挂 `fs.watch({ recursive: true })`，推送 `workspace.changed`。
- `setHandoff` 仍是一次性 brief，但消费点在 `openCodingStream` 成功之后。`peek` 可重复；`ACP_AUTH_REQUIRED` / 缺密钥不得 `take`。
- `agentTools.syncConfig` / `restoreConfig` / `uninstall` / `inspect` / `disposeSession` / `setHandoff` / `upsertCustom` / `removeCustom` / `getCustom` 已落地。漏写进本表会让 preload 与 spec 对不上。`openDocs` 必须走 `isAllowedDocsUrl`，不要只看 `https://`。`list` 禁止读 `auth.json`。账号探测只走 `inspect`（登录型 CLI，不含 `enjoy-local` 与自定义 ACP），且必须 `assertAllowedCommand`，`cwd` = 已登记工作区。`detect` / `doctor` / `login` 必须 `invalidateAccountCache`；`inspect({ refresh: true })` 绕过 10s 缓存，否则扫描后账号会停在旧值。`inspect` 禁止返回 token / `key` / `hasAccessToken`。自定义 command 必须 basename 白名单。OMP `login` 必须带 `provider`（slug），禁止无参打开交互选择器；打开授权页先回 `browser_opened` / `device:<userCode>`，进程继续等 callback，官方 `Credentials saved` 才 `logged_in` 并 `invalidateAccountCache`；失败码还有 `needs_tui` / `failed` / `callback_timeout`；禁止带回授权 URL 或 token；进程 `exit 0` 且只打开过授权页也必须 `failed`，只有 `Credentials saved` 才 `logged_in`；`inspect.providers` 只含 id/label/loggedIn，以及可选 `origin`（catalog|custom）与 `loginKind`（oauth|device|api_key|local）；禁止带 token / apiKey。授权 URL 只认官方 `Open this URL` 标记行，禁止把 stdout 里任意 `https://` 当登录页。
