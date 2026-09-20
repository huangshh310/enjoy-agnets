# I2 · 扩展精选浏览 — 产品短锁

> 2026-09-20 · jojo  
> 对照：`emerging-agent-innovation.md` I2；P0-H 扩展壳；P0-S SoT 注入  
> 预览：`design/previews/i2-extensions-curated.html`（可并进/紧邻 `p0-h-extensions-hub.html`）  
> 入库：`design/references/i2-extensions-curated.md`  
> 队列：#64 I4 后 **下一刀** → 命名身份 P2

---

## 一句话

在扩展壳（P0-H）加 **只读精选**分区：MCP / Skills 卡片一键写入 Enjoy SoT（`#/mcp` / `#/skills`），再走 P0-S 注入；**不做**收费市场、假 Grok 店、宿主插件运行时。

---

## 做

| 面 | 锁 |
|----|-----|
| 入口 | 设置 → 扩展（P0-H）同页下方「精选」；或同页第二屏 |
| 内容 | 只读 curated 列表（内置 JSON / 兼容 Cline catalog 子集）；分 MCP · Skills |
| 动作 | 「添加到 MCP / 添加到技能」→ **写入现有存储**（SoT），不新开 CRUD 套 |
| 之后 | 下一轮开流按 P0-S 注入；Sources 可标来自 Enjoy |
| 空/错 | catalog 拉取失败诚实；无假「已安装到助手」 |

## 不做

- 计费 / 云多租户商店 / 结账  
- Registry 混入（装 CLI ≠ 精选）  
- 执行 Cordis / hooks / plugin.ts  
- 第三套「Plugins」宿主运行时列  
- 把精选当成第二真源（权威仍是用户启用后的 `#/mcp` `#/skills`）  

## 与现有面

| 面 | 关系 |
|----|------|
| P0-H | 发现壳；I2 = 其上精选区（曾标 I2 可选） |
| P0-S | 写入 SoT 后注入；本刀不改注入协议 |
| I4 | 无关；自动化开流同样吃 SoT |

## 验收

1. 扩展页 10 秒内看到精选并添加一项 → `#/mcp` 或 `#/skills` 出现已启用。  
2. 添加后开一轮（支持引擎）→ 已注入 / Sources 可见。  
3. 无计费角标、无 Registry CLI 卡、无「已同步到助手」空成功。  
4. ≠ 看板 / worktree。

## Luna 一句话

在 H 壳下加「精选」：MCP|Skills 卡 + 添加按钮；脚注沿 H「原生插件在各 CLI；MCP/Skills 真源 Enjoy」。另：catalog 失败空态。

---

## 全队列

| 序 | 项 | 状态 |
|----|-----|------|
| — | I4 #64 | 已合 |
| **1** | **I2 精选** | **下一刀** |
| 2 | 命名身份 | P2 |
| — | webhook / 保存后触发 | I4 后置 P1 |

*冲突以 `design/specs/*` 与 P0-H/P0-S 锁为准。*
