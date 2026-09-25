# CU-P0-C / CU-P1-O · Overlay — 产品短锁

> 2026-09-25 · jojo 正式短锁全文（优先于先前 host 摘要）  
> 对照：[`computer-use-codex-parity.md`](./computer-use-codex-parity.md) G4 / CU-P0-C；【视觉真源】[`../previews/cu-p0-c-overlay.html`](../previews/cu-p0-c-overlay.html)  
> 基线 tip `e7cdeb0`（CU-P1-A 已合）· I3 Registry more-agents 仍停  
> Owner：luna 预览 → mike 铬 → kai 生命周期挂点（薄）  
> 落地以 `design/specs/*` 为准；本文不是当前真相。预览锁视觉与文案，不宣称应用已 1:1。

---

## 一句话

`desktop_act` 进行中点亮冷静蓝边 overlay + 右栏与当前观察窗同步 + 一键/Esc 停；无观察不装在控。对标 Codex「正在用电脑」，不是第二套遥控器。

---

## 做

1. **冷静蓝边**：Execute 下对目标执行 `desktop_act`（click/type/key/…）生命周期内，屏幕一圈冷静蓝边呼吸/点亮（对齐既有 p0 名片方向，勿刺眼红警）。
2. **右栏 Desktop**：与当前观察窗同步（窗名 / app / 缩略若有）；无观察时诚实空态，不假装在控。
3. **停一手势**：一键停 + Esc（系统可接则接）；停下后不再继续 click，诚实中断。
4. **与 Approval Dock 同宇宙**：overlay 是铬，不是新壳；审批仍走 Permission Dock（含二次确认卡）。

## 不做

- 第二套远程桌面全屏壳 / VNC 式预览取代 Dock
- 脚注墙解释 TTL/账本实现
- Explore 下点亮 overlay 或注册 `desktop_*`
- 无观察 / 未在 act 时假装「正在控制」
- 空成功条冒充操控完成

---

## O1–O4

- **O1**：Execute 下对已批目标 act 进行中 → overlay 可见；结束/取消/失败 → 熄灭
- **O2**：右栏缩略或窗名与当前观察一致（或诚实空）
- **O3**：用户停一手势后不再继续 click（诚实中断）
- **O4**：Explore 无 overlay、无 `desktop_*`

---

## 范围

- **在**：Enjoy Local · Execute · 已有 overlay 窗换成冷静铬 · 右栏 `desktop-view` 与当前观察窗同步 · 本预览 + 本文
- **不在**：产品 TS / UI 本刀不改；不做 I3 / Registry more-agents；不做第二套遥控器；不宣称现网 overlay 已 1:1

Owner：luna 预览 → mike 铬 → kai 生命周期挂点（薄）。

补厚对象：[`../previews/p0-computer-use.html`](../previews/p0-computer-use.html) 里偏薄的 CU-P0-C 块。**overlay 视觉 SoT 以本预览为准。**

---

## Luna 一句话

act 才亮冷静蓝边；右栏跟观察走；一键/Esc 诚实中断；Explore 零 overlay、零 `desktop_*`。overlay 是铬，审批仍走 Permission Dock。不要第二套遥控器，也不要空成功条冒充做完。

视觉真源：[`../previews/cu-p0-c-overlay.html`](../previews/cu-p0-c-overlay.html)（A 主态 / 停 / 空态 / Explore / 反例划掉；不宣称应用已 1:1）。

---

*未落地前：视觉与生命周期以预览 + 本文为准。落地后以 `design/specs/computer-use.md` 为准。*
