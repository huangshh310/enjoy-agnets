# P0-S · Skills / MCP 宿主透传 — 产品短锁

> 2026-09-20 · jojo  
> 对照：`plugin-extensions-hub` 第二稿 SoT 锁；队列：#55 后 **下一刀**  
> 预览建议：`design/previews/p0-s-skills-mcp-inject.html`  
> 入库：`design/references/p0-s-skills-mcp-inject.md`

---

## 一句话

**`#/mcp` / `#/skills`（+ skill-sources）为唯一真源**；开 ACP 流时把**当前工作区已启用**的 MCP / Skills **透传或挂载**给当前引擎，CLI **只读消费**。家目录 / `dsh plugin add` **不作第二真源**。

---

## 做

| 层 | 行为 |
|----|------|
| **配置 SoT** | 用户只在 Enjoy `#/mcp`、`#/skills`（扩展壳深链同此）增删启用 |
| **MCP** | `session/new.mcpServers`（或引擎等价面）注入启用列表；失败单服不打挂整场（能则隔离） |
| **Skills** | 按 `RuntimeCapabilities`：**注入**或**工作区只读挂载**供 CLI 读；不灌「各家私有插件 JS」 |
| **可移植插件** | Agent Plugins 的 skills+mcp 子集：导入→写入上述 SoT→再注入（可 P1 同 PR 或紧随） |
| **可见性** | Sources / 账本可标「来自 Enjoy MCP/Skills」；空启用则诚实不造条目 |
| **切换引擎** | 新引擎开流用**同一 SoT** 再注入；不各维护一份 |

## 不做

- 在宿主跑 Cordis / Claude hooks / OpenCode `plugin.ts`  
- 以 `~/.claude|codex|…/skills` 或 CLI 侧 marketplace 为 SoT  
- 引导「去助手侧装」当主路径（第四层原生除外，脚注即可）  
- Registry 卖 MCP/Skills；假 Grok 插件店  
- 假 BYOK；worktree  

## 与现有面

| 面 | 关系 |
|----|------|
| P0-H 扩展壳 | 发现入口；不新增第四套存储 |
| P0-G / M-D | 展示本轮用到的注入源；不负责配置 |
| M3 handoff | 换引擎后新会话/新桥仍从 Enjoy SoT 注入 |
| I1 换模 | 正交；不改 SoT |
| 第四层原生插件 | 仍助手侧；脚注「hooks/Cordis 等在各 CLI」 |

## 能力降级

| 引擎能力 | UX |
|----------|-----|
| 支持 mcpServers 透传 | 默认注入启用项 |
| 不支持宿主 MCP | 设置/开流旁诚实：「此引擎只用自带 MCP；Enjoy `#/mcp` 未注入」 |
| 不支持技能挂载/注入 | 同上类文案；不假装已注入 |

## 验收

1. 只在 Enjoy 配 1 个 MCP + 1 个 Skill → 新开支持引擎的一轮，Agent 能用到（或 Sources 可见已注入）。  
2. 关掉启用 → 下一轮不再注入。  
3. 不支持引擎：禁用态/说明，**无**空成功「已同步到助手」。  
4. 全程无写各家家目录当权威；无新看板/市场。

## Luna 一句话原型

一页三态：① SoT 列表（MCP|Skills 已启用）② 开流「已注入本轮」摘要条 ③ 引擎不支持诚实卡。脚注：「真源在 Enjoy；助手只消费。原生插件仍在各 CLI。」

---

*实现以 `design/specs/*` 与 runtime capabilities 为准；与本文冲突先改 specs。*
