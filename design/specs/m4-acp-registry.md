# spec/m4-acp-registry

> M4 ACP 扩展与 Registry 大纲。最后更新：2026-09-08
> 产品锁：顺序 M2 → M3 → 本文。整段程序不做：M5 git worktree、M6 摩擦/digest/团队 MCP、**M4 PTY 兜底**。
> 可选后置：M5 会话状态灯 + 进程收尸；M6 skill-sources 可选 pull。
> BoardUI；禁 Fake-Status-Chrome / Centered-Marketing-Hero。

## 目标

用户可：浏览内置 Registry → 安装/复制命令；添加自定义 stdio ACP agent（command/args/env/cwd）并完成 **一轮带审批** 的对话。按硬条件将 `comingSoon` 升为 `available`。

## 非目标（本里程碑明确不做）

- PTY / 怪异 TUI 兜底
- `session/set_mode` 全量
- 跨 Agent MCP `delegate_to_agent`
- 寄生 Codex Desktop / SSH
- worktree、团队层摩擦信号、本地 digest、MCP 团队声明

---

## IA 大纲

### 1. Registry 视图（设置 · 智能体）

- 入口：设置 → 智能体 → 分段增加 **「Registry」**（或本机 CLI 页内二级 Tab），**不上** EngineRail。
- 布局：列表 + 详情；禁营销 Hero 大图墙。
- 行：名称 · 来源（官方/目录）· 状态（未装 / ready / 已添加）· 一键「安装或复制命令」。
- 详情：简短说明、默认 `command`/`args` 预览、文档链（外开）。
- 数据：静态目录 + 探测结果；与 `agentTools.detect` 对齐。

### 2. 自定义 ACP agent

| 字段 | 合同 |
|---|---|
| `command` | 必填；经 main `assertAllowedCommand`；`shell:false` spawn |
| `args` | string[] |
| `env` | 可选键值；勿在 UI 回显密钥明文超长 |
| cwd 策略 | 工作区 root / 自定义路径（存在性校验） |
| 保存 | 入库；出现在本机 CLI 列表；`capabilities` 默认保守（quota=false 等） |
| 删除 | 确认后移除；解绑会话 runtime |

表单：BoardUI 设置卡；校验失败行内错误，禁假「已连接」绿灯。

### 3. `comingSoon` → `available` 硬条件

升序建议：**OpenCode → Gemini → Pi**（可按实测调，但必须满足）：

1. 本机 `initialize` 成功
2. `session/new`（或等价）成功
3. 一轮工具/文本往返可映射到现有 stream 事件
4. 审批路径：`session/request_permission` → `approval.required` + HMAC 可走通

UI：仅硬条件全过才移出「即将推出」；禁止手动假升。

### 4. ACP 事件保真（增强大纲）

| 事件 | UI 期望 |
|---|---|
| `available_commands_update` | 命令面板/提示更新，不造假命令 |
| diff content | 进 plan 表面 / Changes |
| 提问映射 | 进 ask-user / questions，不另开壳 |

细协议回写 `agent-cli.md`；本 spec 钉产品期望。

### 5. 与 Composer / Rail

- 新装成功 → detect 刷新 → 可进 Picker（按 `showOnEngineRail`）。
- 沙箱仍不上 Rail。
- 有历史切换仍走 M3 Handoff。

---

## 组件大纲（给 mike）

| 块 | 建议路径 |
|---|---|
| Registry 列表/详情 | `settings/agent-tools/acp-registry-*.tsx` |
| 自定义 agent 表单 | `settings/agent-tools/custom-acp-agent-form.tsx` |
| 升 available 门闩 | main + detect；单测锁硬条件 |

## 安全不变量

- 自定义 command 经 `assertAllowedCommand`；执行只在 main。
- 审批不短路；自定义 agent 无豁免。
- renderer 不 import `agent-harness`。

## 验收

1. Registry 能列出目录项并复制/触发安装命令。
2. 添加自定义 stdio ACP → ready → 一轮对话 + 审批。
3. 未满足硬条件的 soon 不能选为当前引擎。
4. 无 PTY 入口；无 Fake-Status 已连接。

## 开放问题（默认）

- Registry 源：默认 **内置 JSON**，远端后置。
- 自定义 agent 进能力矩阵一行：默认 **是**。
