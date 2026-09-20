# I4 · 本机 Automations — 产品短锁

> 2026-09-20 · jojo  
> 对照：`emerging-agent-innovation.md` I4；Multica Autopilots（只抄节奏）  
> 预览：[`../previews/i4-automations.html`](../previews/i4-automations.html)（【视觉真源】I4 本机 Automations · Luna）  
> 入库：`design/references/i4-automations.md`  
> 队列：P0 #64 已落地；webhook / 保存后 → I4-P1 [`i4-p1-webhook-onsave.md`](./i4-p1-webhook-onsave.md) · [`../previews/i4-p1-webhook-onsave.html`](../previews/i4-p1-webhook-onsave.html)  
> 落地以 `design/specs/*` 为准；本文不是当前真相。预览锁视觉与文案，不宣称应用已 1:1。

---

## 一句话

本机 **Automations**：定时或事件触发「开一轮会话 / 工作单」，诚实 **local-only**；不做云调度、不做团队看板派活。

加深现有 `#/settings/automations` 壳（`manual` / `on_save` 已落地）；**cron + 诚实本机文案**是 I4 加深，**不要**另做第二套 Automations。

---

## 做

| 面 | 锁 |
|----|-----|
| 触发 | **手动** · **保存后** · **cron**（本机）· **webhook**（本机监听，可选 P1 同刀或紧随） |
| 动作 | 开一轮：**当前工作区 + 指定引擎 + 可选模型 + 提示词模板**；默认走现 Composer/会话，不新 runtime |
| 模式 | 可绑探索/执行（沿 #60 C1）；默认执行或用户自选 |
| 列表 | 设置或工作模块一页：名称、触发、上次运行、开/停 |
| 运行结果 | 进现有会话列表 + Inbox（失败/待拍板按 M-CBD）；账本/Sources 照旧 |
| 文案 | 页脚固定：「仅在本机运行，关闭应用则暂停」 |

## 不做

- 云端 cron / 多机守护进程舰队（Multica runtime 注册）  
- 看板 / 小队派活  
- worktree 并行  
- 假「应用关闭仍跑」  
- 在宿主跑各家私有插件  

## 与现有面

| 面 | 关系 |
|----|------|
| P0-S | 自动化开流同样 Enjoy SoT 注入 MCP/Skills |
| M-CBD | 失败/待验收进 Inbox，不新铃系统 |
| I1 / 铬条 | 用当前引擎模型偏好；可在规则里钉死 model |
| Multica | 只抄「定时自己跑」节奏，不抄服务端工作区 |
| 现壳 | `#/settings/automations` 已有列表 / 草稿 / `automations.run`；触发落地只有 `manual` / `on_save`。合约里的 `cron` / `cronExpr` **未实现**（见 `settings` / `ipc` 已知坑）。I4 加深这一页，不新开路由 |

## 切片

| 项 | 级 |
|----|-----|
| 手动 + cron + 列表开停 + 诚实本机文案 | **P0（本刀）** |
| webhook 入站 | P1（[`i4-p1-webhook-onsave.md`](./i4-p1-webhook-onsave.md)；视觉真源 [`../previews/i4-p1-webhook-onsave.html`](../previews/i4-p1-webhook-onsave.html)） |
| 「保存后」触发 | P1（同上） |
| 绑工作单 M-A | 后置 |

## 验收

1. 建一条每日 cron → 到点本机开一轮，会话列表可见。  
2. 应用退出期间 **不**偷偷跑；文案诚实。  
3. 失败进 Inbox「失败」，不挤待验收（F1）。  
4. 开流仍走 P0-S 注入；无新插件市场。

## Luna 一句话

`i4-automations.html`：列表（开/停/上次）+ 编辑抽屉（触发=手动/cron、引擎、提示词）+ 脚注「仅本机」；另：运行中/失败各一态。

视觉真源已入库：[`../previews/i4-automations.html`](../previews/i4-automations.html)（列表行 / 380px 抽屉 / 运行中条 / 失败→Inbox「失败」；不宣称应用已 1:1）。

webhook / 保存后不改本锁，见 I4-P1：[`i4-p1-webhook-onsave.md`](./i4-p1-webhook-onsave.md) · [`../previews/i4-p1-webhook-onsave.html`](../previews/i4-p1-webhook-onsave.html)。

---

## 全队列（本轮）

| 序 | 项 | 状态 |
|----|-----|------|
| — | 铬条 #60 / P0-S #61 | 已合 |
| **1** | **I4 Automations** | **P0 已落地**；后置切片 [`i4-p1-webhook-onsave.md`](./i4-p1-webhook-onsave.md) |
| 1b | I4-P1 webhook + 保存后 | 视觉真源 [`../previews/i4-p1-webhook-onsave.html`](../previews/i4-p1-webhook-onsave.html)；接线见 settings / ipc 当前真相 |
| 2 | I2 扩展精选浏览 | P1（SoT 已通，可跟） |
| 3 | 命名身份 | P2 |
| — | #60 思考 ▾ 抛光 | soft |

*冲突以 `design/specs/*` 为准。*
