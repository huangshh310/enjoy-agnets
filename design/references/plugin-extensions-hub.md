# Enjoy：插件 / 扩展 / 技能 / MCP 仓库方案

> 位置：计划落地 `design/references/plugin-extensions-hub.md`  
> 角色：Reference（产品第一稿 · 2026-09-13）。P0-H 发现壳已落地：`#/settings/extensions`，视觉真源 `previews/p0-h-extensions-hub.html`。安装权威仍是 `#/mcp` / `#/skills`。  
> 约束：Local-first · 三路勿混 · 不假 BYOK · 沙箱不上轨 · 不重开 worktree  
> 关联：Registry / skill-sources / `#/mcp` / Sources / ACP 宿主

---

## 0. 一句话

Enjoy 做 **扩展真源**（MCP + Skills 为主，当前引擎消费），不做各家 CLI 的私有插件运行时，也不做收费云插件店。

---

## 1. 对标清单

| 产品 | 仓库形态 | 安装入口 | 权限 | 版本 | 账号 / 计费边界 |
|------|----------|----------|------|------|-----------------|
| **Cursor** | Marketplace + [Agent Plugins](https://agent-plugins.org)（根 `plugin.json`）+ Cursor Plugins（`.cursor-plugin/plugin.json`）；Git 分发；社区 cursor.directory | Customize / Marketplace | MCP 工具默认审批；Team MCP；Cloud Agents | semver；官方市场人工审 | 插件可装；模型用量仍走 Cursor 订阅 |
| **Claude Code** | Plugins 可捆绑 skills / agents / hooks / MCP；家目录 `~/.claude/`；GitHub marketplace add | `/plugin`、设置 | 写盘/bash 权限模式 + OS 沙箱 | 随插件/技能目录 | Anthropic 订阅；插件通常不另计费 |
| **Cline** | Customize 统一：**Skills + MCP + Plugins**；[`cline/marketplace`](https://github.com/cline/marketplace) → `catalog.json`；CLI：`cline skill\|mcp\|plugin install` | 扩展内 Marketplace | Plan/Act + 工具审批 | catalog 元数据 | 用户自备 Provider Key |
| **OpenCode** | Skills 目录 + MCP + 社区 plugins（官方大一统市场较弱） | 配置 / 技能路径 | 产品内权限 | 自管 | 多供应商 BYOK |
| **Codex** | Skills（`~/.codex/skills`）+ Plugins marketplace + MCP client（亦可 `mcp-server`） | CLI / 配置 | hooks / 策略 | 官方文档 | ChatGPT 或 API；插件 ≠ 模型费 |
| **Synara** | 宿主 Gateway / External MCP；扩展能力多在各 CLI | 集成配对 | 任务级协调 | 跟 CLI | 无自有模型订阅 |
| **Craft Agents** | Sources 一句话（MCP / OpenAPI / 浏览器）+ Skills 热导入 | Sources / Skills | Explore / Execute | 热加载 | BYOK / OpenRouter / 本地 |

**可抄**：Cline 三原语一市场；Cursor Agent Plugins 开标准；Craft Sources 发现性；Claude/Codex「插件在助手侧、宿主只编排」。  
**不抄**：自建收费店、云多租户市场、在宿主内跑 Claude/Codex 私有 Plugin JS 运行时。

---

## 2. 引擎对照（协议怎么接）

| 引擎 | MCP | Skills（Agent Skills / 目录） | 原生插件 / 扩展 | Enjoy 对接差异 |
|------|-----|-------------------------------|-----------------|----------------|
| **Codex** | Client；可作 MCP server | `~/.codex/skills` | 官方 Plugins | ACP 开会话；**不灌**技能正文（CLI 读盘）；Enjoy MCP 按 runtime 决定是否 host 透传 |
| **Claude Code** | Client；`.mcp.json` / `claude mcp` | `~/.claude/skills`；Plugins 可捆 | Plugins + Hooks + Subagents | 同上；可 vault 绑 Anthropic 系；Claude 插件装在 Claude 侧 |
| **Grok** | 随 CLI | 非主路径；Enjoy 仍只投影宿主目录 | 官方 `grok plugin marketplace list` / `/marketplace`；Enjoy 不跑 Grok plugin JS | **仅官方登录**；抽屉给复制命令，禁止假「已连接」；可移植 Skills/MCP 仍走 `#/skills` `#/mcp` |
| **Pi / Oh My Pi** | 常靠扩展补齐 | `~/.pi/.../skills` 等 | 包 / 扩展散 | ACP；技能 CLI 读盘；OMP 供应商 ≠ Enjoy vault 插件 |
| **DeepSeek** | 随 `dsh` / ACP | 文档少 | 无成熟市场 | ACP + 可绑 DeepSeek vault；扩展走 Enjoy MCP/Skills |
| **Hermes** | 有 | 自创技能 + 持久记忆 | plugins + gateway | 适配/ACP；记忆技能在 Hermes 家目录；Enjoy 发现与跳转，不接管运行时 |

**四层不要混**：

1. **MCP** — 工具/数据连接（Model Context Protocol）  
2. **Skills** — 可移植流程说明书（`SKILL.md`）  
3. **ACP** — 宿主 ↔ 编码 Agent 的会话运输  
4. **原生插件** — 各家私有捆包（hooks、agents、commands…）

---

## 3. Enjoy 产品建议

### 做

- **扩展发现壳（P0-H）**：一页聚合 MCP | Skills（对标 Cline Customize / Craft Sources），「添加」深链到现有 `#/mcp` 与 `#/skills` / skill-sources。  
- **Skills**：保持 Agent Skills 标准 + `skill-sources` HTTPS Git 拉取；可选只读浏览外部 catalog（P1）。  
- **MCP**：`#/mcp` 仍为权威配置；Sources / 扩展壳只做发现。  
- **Registry**：只装 **Agent CLI 程序**，不混 Skills/MCP 市场。  
- **对 Claude/Codex/DSH**：宿主 `#/mcp` / `#/skills` 经 ACP 灌给当前引擎。各家家目录只作只读发现/导入。原生 Cordis / hooks 在配置抽屉给复制命令，不在 Enjoy 内执行。Agent Plugins / Claude `plugin.json` 的 skills+mcp 子集可从本地文件夹导入。

### 不做

- 收费 / 云多租户插件店  
- Grok 等仅官方 CLI 的假插件安装  
- 在 Enjoy 内执行各家私有 Plugin 运行时  
- 假 BYOK · 沙箱上 Composer 导轨 · worktree  

### 与现状关系

| 现有面 | 职责 |
|--------|------|
| Registry | 安装/发现 ACP CLI |
| skill-sources / `#/skills` | 技能源与已装技能 |
| `#/mcp` | MCP 服务器配置 |
| Sources（会话） | 本轮用源可见 / 明细（P0-2 / P0-G） |
| **扩展壳 P0-H** | 发现聚合入口，不新增第四套存储 |

---

## 4. 落地切片

### P0-H — 扩展发现壳（F 合完后正式开）

- 设置或工作模块一页：`MCP | Skills` 两列（可加「说明」脚注）  
- 每列：已配置数 +「添加」→ 现有路由  
- 脚注：「Claude / Codex 等自带插件请在各助手内管理」  
- 验收：10 秒找到添加 MCP/技能；不与 Registry 混淆；无协议微标堆砌  

**原型**：`design/previews/p0-h-extensions-hub.html`（等产品点头）

### P1

- 只读 Skills / MCP 精选目录（兼容 Cline catalog 或自建 curated JSON）+ 一键写入现有存储  
- Claude/Codex「打开本机 skills 文件夹」  
- Agent Plugins（`plugin.json`）只读导入实验（仅 skills+mcp 子集）  
- Hermes「技能/记忆在助手侧」说明卡  

### 明确后置

- 应用内插件代码执行  
- OpenAPI/浏览器 Sources（Craft 网页路）  
- 团队共享插件市场  

---

## 5. 当前迭代队列（插件相关）

| 序 | 项 | 状态 |
|----|----|------|
| P0-F | 系统浏览器打开预览 | 已落地（以 `ui` spec 为准） |
| P0-G | Sources 明细 sheet | 已落地（以 `ui` spec 为准） |
| P0-H | 扩展发现壳 | 短稿已有，F 合后点头开预览 |

---

*第一稿结束。实现以 `design/specs/*` 为准；本文冲突时先改 specs。*
