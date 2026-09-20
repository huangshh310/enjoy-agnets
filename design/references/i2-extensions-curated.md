# I2 · 扩展精选浏览 — 产品短锁

> 2026-09-20 · jojo  
> 对照：`emerging-agent-innovation.md` I2；P0-H 扩展壳；P0-S SoT 注入  
> 【视觉真源】I2：[`../previews/i2-extensions-curated.html`](../previews/i2-extensions-curated.html)（可并进 / 紧邻 `p0-h-extensions-hub.html`；内容锁 `db6b455`）  
> 入库：`design/references/i2-extensions-curated.md`  
> 队列：#64 I4 后 **下一刀** → 命名身份 P2  
> 落地以 `design/specs/*` 为准；本文不是当前真相。预览锁视觉与文案，不宣称应用已 1:1。

---

## 一句话

在扩展壳（P0-H）加 **只读精选**分区：MCP / Skills 卡片一键写入 Enjoy SoT（`#/mcp` / `#/skills`），再走 P0-S 注入；**不做**收费市场、假 Grok 店、宿主插件运行时。

I2 **不是**新设置 tab，只是 H 同页下方的精选区。

---

## 做

| 面 | 锁 |
|----|-----|
| 入口 | 设置 → 扩展（P0-H）同页下方「精选」；或同页第二屏。路由仍是 `#/settings/extensions` |
| 内容 | 只读 curated 列表（内置 JSON / 兼容 Cline catalog 子集）；分 MCP · Skills（两列或等价页签） |
| 动作 | 「添加到 MCP / 添加到技能」→ **写入现有存储**（SoT），不新开 CRUD 套 |
| 之后 | 下一轮开流按 P0-S 注入；Sources 可标来自 Enjoy |
| 空/错 | catalog 拉取失败诚实；无假「已安装到助手」 |

## 不做

- 计费 / 云多租户商店 / 结账  
- Registry 混入（装 CLI ≠ 精选）  
- 执行 Cordis / hooks / plugin.ts  
- 第三套「Plugins」宿主运行时列  
- 把精选当成第二真源（权威仍是用户启用后的 `#/mcp` `#/skills`）  
- 新设置分段 / 第 8 轨 / `#/settings/curated`  
- C 端写「已同步到助手」空成功  
- 看板 / worktree / 假 Grok 店  

## 与现有面

| 面 | 关系 |
|----|------|
| P0-H | 发现壳；I2 = 其上精选区（曾标 I2 可选）。铬条真源仍是 [`../previews/p0-h-extensions-hub.html`](../previews/p0-h-extensions-hub.html) |
| P0-S | 写入 SoT 后注入；本刀不改注入协议。见 [`p0-s-skills-mcp-inject.md`](./p0-s-skills-mcp-inject.md) |
| I4 | 无关；自动化开流同样吃 SoT |
| Registry | 只装 Agent CLI；精选卡禁止混入 CLI 安装态 |

## 文案锁

| 面 | 写 | 不用 |
|----|----|------|
| 入口 | 设置 → 扩展 · 同页「精选」 | `#/settings/curated`、市场 tab、第 8 轨 |
| H 计数 | 已配置 N +「添加」深链 | 已同步到助手、Registry 已装 |
| 精选 CTA | 添加到 MCP / 添加到技能 | 购买、安装到助手、一键同步 |
| 写后 | 已写入 Enjoy · 下一轮可注入 | 已同步到助手、已安装到 Claude |
| catalog 失败 | 精选暂时加载不了 + 重试 | 假已装卡、空绿成功 |
| 脚注 | Claude hooks / DSH Cordis / OpenCode 等原生能力请在各助手内管理。MCP 与 Skills 以 Enjoy `#/mcp` · `#/skills` 为真源，会话透传给当前助手。短式：真源在 Enjoy；助手只消费。原生插件仍在各 CLI。 | 插件市场、假 Grok 店、Cordis 已托管 |

## 验收

1. 扩展页 10 秒内看到精选并添加一项 → `#/mcp` 或 `#/skills` 出现已启用。  
2. 添加后开一轮（支持引擎）→ 已注入 / Sources 可见。  
3. 无计费角标、无 Registry CLI 卡、无「已同步到助手」空成功。  
4. catalog 失败只空精选区 + 重试；H 已配置仍在；无假已装卡。  
5. ≠ 看板 / worktree / 新设置 tab。

## Luna 一句话

在 H 壳下加「精选」：MCP|Skills 卡 + 添加按钮；脚注沿 H「原生插件在各 CLI；MCP/Skills 真源 Enjoy」。另：catalog 失败空态。

视觉真源已入库：[`../previews/i2-extensions-curated.html`](../previews/i2-extensions-curated.html)（主屏 H+精选 / 写后 toast / catalog 失败空；内容锁 `db6b455`；不宣称应用已 1:1）。

---

## 全队列

| 序 | 项 | 状态 |
|----|----|------|
| — | I4 #64 | 已合 |
| **1** | **I2 精选** | **下一刀**（本锁 + 视觉真源；应用未接线） |
| 2 | 命名身份 | P2 |
| — | webhook / 保存后触发 | I4 后置 P1 |

*冲突以 `design/specs/*` 与 P0-H / P0-S 锁为准。*
