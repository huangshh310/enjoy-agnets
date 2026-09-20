# I4-P1 · Automations webhook / 保存后 — 产品短锁

> 2026-09-20 · jojo  
> 对照：`i4-automations.md` 后置切片；真源仍 `i4-automations.html`（可加态）  
> 预览：`design/previews/i4-p1-webhook-onsave.html`  
> 入库：`design/references/i4-p1-webhook-onsave.md`  
> 队列：接线见 settings / ipc 当前真相

---

## 一句话

在已有本机 Automations 上补两类触发：**保存后**、**本机 webhook**；仍诚实 local-only，关应用不补跑。

---

## 做

| 触发 | 锁 |
|------|-----|
| **保存后** | 工作区内文件保存（防抖）→ 开一轮；可配路径/glob 可选（P1 可先「任意保存」） |
| **webhook** | 本机监听 localhost 端口；收到约定 POST → 开一轮；密钥/token 可选 |
| 共用 | 引擎、模型、探索|执行、提示词模板同 I4；列表开停、上次运行、失败进 Inbox「失败」 |
| 文案 | 脚注仍：「仅在本机运行，关闭应用则暂停」；webhook 注明「仅本机，非公网」 |

## 不做

- 云端 webhook / 公网隧道默认开  
- 云 cron / 多机舰队  
- 看板派活  
- worktree  
- 改瘦身 / SoT / 显示名  

## 验收

1. 建「保存后」规则 → 保存文件后本机开一轮。  
2. 建 webhook → 本机 POST 触发一轮；应用退出后不再听。  
3. 失败不挤待验收（F1）。  
4. 开流仍 P0-S 注入。

## Luna 一句话

Automations 抽屉触发多两项：保存后 / webhook（端口+路径示意）；列表徽章区分；脚注加「webhook 仅本机」。

---

*冲突以 I4 短锁与 `design/specs/*` 为准。*
