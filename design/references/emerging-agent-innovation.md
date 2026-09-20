# Enjoy：新兴 Agent 创新清单

> 计划落地：`design/references/emerging-agent-innovation.md`  
> 产品第一稿 · 2026-09-13  
> 约束：不挡 P0-F/G；假 BYOK / 沙箱上轨 / worktree 仍砍  
> 队列对齐：F → G → H → **I1**；**I2** 尽量并进 H  
> X 热帖链接版：本环境检索受限，浏览器可用后再补

---

## 1. 新兴开源（近活跃）

| 项目 | 独特创新点 | Enjoy 可抄 | 不可抄 |
|------|------------|------------|--------|
| **Agent Orchestrator** ~7.5k | 舰队编排；CI 挂了自修；评审评论自回 | CI/评审失败→提示再开一轮（PR 流后置） | **worktree 舰队** |
| **Kilo** ~27k | 500+ 模型中途切换；MCP marketplace | **同引擎中途换模型**；MCP 精选进扩展壳 | 闭源云 Claw / 全平台重做 |
| **Shofer** | `.slang` 确定性多 Agent + 实况图 | 工作流步骤只读可视化 | 整套 slang 执行内核本轮 |
| **Codeg** | 多 CLI 会话聚合；`delegate_to_agent` MCP | 跨引擎会话检索 | 跨 Agent MCP 委派（已明确不做） |
| **OpenHands Canvas** | ACP 任意 Agent；自动化/webhook/日程 | 加深 Automations | 云后端默认化 |
| **Goose** | 70+ MCP 扩展；ACP server + 挂 CLI | 扩展目录浏览密度（喂 H/I2） | 变成通用非编码 Agent |
| **OpenClaw / acpx** | 大量 ACP adapter 别名 | Registry「更多助手」发现 | 默认 `npx` 临时下载 |
| **Synara**（续） | Gateway 双向 MCP | External MCP 配对文案 | worktree 并行 |

---

## 2. X（Twitter）线索

本稿检索未能稳定拉取 X 热帖。雷达建议（合 main 不依赖）：

- Synara / 并行 Agent、Gateway 相关发布讨论  
- OpenHands「any coding agent via ACP」传播帖  
- Kilo / OpenCode 中途换模型与 marketplace  
- Goose / AAIF MCP 扩展生态  

*补丁：浏览器可用后追加具体 URL 与 @handle。*

---

## 3. 创新 backlog（RICE 粗排）

R/I/C/E 各 1–10，分≈ R×I×C÷E。

| ID | 项 | ≈分 | 级 | luna 一句话原型诉求 |
|----|----|-----|----|---------------------|
| **I1** | 同引擎中途换模型（Kilo） | ~98 | **P0**（H 后） | Composer 模型芯片可换；角标「已切换」；不换引擎、不走 handoff。视觉真源 [`../previews/i1-mid-model-switch.html`](../previews/i1-mid-model-switch.html)；产品锁 [`i1-mid-model-switch.md`](./i1-mid-model-switch.md) |
| **I2** | 扩展壳 MCP/Skills 精选浏览（Goose/Cline） | ~68 | **P0**（并进/紧随 H） | 扩展页只读精选卡 + 一键深链安装；无新运行时 |
| I3 | Registry ACP 花名册扩容（OpenClaw） | ~58 | P1 | 「更多助手」分组；未验证标即将推出 |
| I4 | Automations 日程+webhook（OpenHands） | ~35 | P1 | 触发=手动/保存/cron/webhook；诚实本地 |
| I5 | 跨引擎会话检索（Codeg） | ~18 | P1 | 侧栏搜所有引擎会话；结果带引擎标 |
| I6 | 工作流只读可视化（Shofer） | ~12 | soft | Plan 步骤时间线变小图；非执行引擎 |
| I7 | CI 失败再跑（AO，无 worktree） | ~14 | soft | 本机「测试失败→再开一轮」；PR 后置 |

---

## 4. 与现队列

| 序 | 项 | 状态 |
|----|----|------|
| P0-F | 系统浏览器打开预览 | 已落地（以 `ui` spec 为准） |
| P0-G | Sources 明细 sheet | 已落地（以 `ui` spec 为准） |
| P0-H | 扩展发现壳 | 短稿已有；F 合后开 |
| 插件参考 | `plugin-extensions-hub.md` | PR #35 |
| **I1** | 中途换模型 | H 后默认下一刀 |
| **I2** | 精选浏览 | **尽量并进 H** |

砍项：假 BYOK · 沙箱上轨 · worktree · 跨 Agent MCP 委派。

---

*第一稿。冲突时以 `design/specs/*` 为准。*
