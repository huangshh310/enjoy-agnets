# P0-S · Skills / MCP 宿主透传 — 产品短锁

> 2026-09-20 · jojo  
> 对照：`plugin-extensions-hub` 第二稿 SoT 锁；队列：#55 后 **下一刀**  
> 【视觉真源】P0-S：[`../previews/p0-s-skills-mcp-inject.html`](../previews/p0-s-skills-mcp-inject.html)  
> 入库：`design/references/p0-s-skills-mcp-inject.md`  
> 落地以 `design/specs/*` 与 runtime capabilities 为准；本文不是当前真相。预览锁视觉与文案，不宣称应用已 1:1。

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

## P0-H 发现 vs P0-S 注入

| | **P0-H 发现** | **P0-S 注入** |
|---|---|---|
| 路由 | `#/settings/extensions` | 开流旁 / SoT 启用条；配置权威仍是 `#/mcp` · `#/skills` |
| 数字 | 已配置 | 已启用 / 已注入本轮 |
| CTA | 「添加」深链现有页 | 「管理」深链现有页；**无**第二套 CRUD |
| 职责 | 10 秒找到 MCP / Skills 并跳进真源页 | 把**当前已启用**项透传给当前引擎，并诚实画出注入结果 |
| 失败 | — | 不支持引擎用警告卡；**禁止**空绿成功「已同步到助手」 |
| 存储 | 不新开 | 不新开；家目录 / `dsh plugin add` 不是第二 SoT |

对齐 P0-H：Claude hooks / DSH Cordis / OpenCode native 仍在各 CLI；MCP / Skills SoT 是 Enjoy `#/mcp` · `#/skills`。

## 能力降级

| 引擎能力 | UX |
|----------|-----|
| 支持 mcpServers 透传 | 默认注入启用项 |
| 不支持宿主 MCP | 设置/开流旁诚实：「此引擎只用自带 MCP；Enjoy `#/mcp` 未注入」 |
| 不支持技能挂载/注入 | 同上类文案；不假装已注入 |

## 文案锁

| 面 | 写 | 不用 |
|----|----|------|
| SoT 计数 | 已启用 2 MCP · 3 Skills | 已配置、已同步到助手 |
| 管理 | 管理 → `#/mcp` / `#/skills` | 第二套表单、去助手侧装 |
| 开流微条 | 已注入本轮 · MCP 2 · Skills 3 | 已同步到助手、ACP 协议微标 |
| 来源标 | 来自 Enjoy | 来自 `~/.claude`、`dsh plugin add` |
| 空启用 | 不画微条，不造假行 | 已注入 0、空名单成功 |
| MCP 不支持 | 此引擎只用自带 MCP；Enjoy `#/mcp` 未注入 | 绿灯空成功 |
| Skills 不支持 | 此引擎不支持宿主技能注入 | 已注入 0 Skills |
| 脚注 | 真源在 Enjoy；助手只消费。原生插件仍在各 CLI。 | 插件市场、假 Grok 店 |

## 验收

1. 只在 Enjoy 配 1 个 MCP + 1 个 Skill → 新开支持引擎的一轮，Agent 能用到（或 Sources 可见已注入）。  
2. 关掉启用 → 下一轮不再注入。  
3. 不支持引擎：禁用态/说明，**无**空成功「已同步到助手」。  
4. 全程无写各家家目录当权威；无新看板/市场。

## Luna 一句话原型

一页三态：① SoT 列表（MCP|Skills 已启用）② 开流「已注入本轮」摘要条 ③ 引擎不支持诚实卡。脚注：「真源在 Enjoy；助手只消费。原生插件仍在各 CLI。」

视觉真源已入库：[`../previews/p0-s-skills-mcp-inject.html`](../previews/p0-s-skills-mcp-inject.html)（三态 + 空启用诚实空 + 文案表；不宣称应用已 1:1）。Composer **呈现密度**（脚注墙 / 一行芯片）冲突让路 [`p0-composer-slim.md`](./p0-composer-slim.md)；三态逻辑与 SoT 不废。

---

*实现以 `design/specs/*` 与 runtime capabilities 为准；与本文冲突先改 specs。Composer 上呈现密度以 `p0-composer-slim` 为准。*
