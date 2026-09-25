# CU-P0-C / CU-P1-O · Overlay — 产品短锁

> 2026-09-25 · jojo 短锁全文（host 确认：权限坞里的桌面名片）  
> 对照：[`computer-use-codex-parity.md`](./computer-use-codex-parity.md) G4 / CU-P0-C；【视觉真源】[`../previews/cu-p0-c-overlay.html`](../previews/cu-p0-c-overlay.html)  
> 基线 tip `e7cdeb0`（CU-P1-A 已合）· I3 Registry more-agents 仍停  
> 落地以 `design/specs/*` 为准；本文不是当前真相。预览锁视觉与文案，不宣称应用已 1:1。

---

## 一句话（host + jojo）

「权限坞里的桌面名片」— `desktop_act` 进行中，本机目标窗一圈冷静蓝边呼吸 + 右栏 Desktop 名片与观察同步；一键「停止」；无观察 / 不在控不画 overlay。

真源句：「权限坞里的桌面名片」。

---

## 做（必须在预览里看见）

1. `desktop_act` 进行中 → 冷静蓝边（呼吸），不是大声霓虹。
2. 右栏「正在看的窗口」Desktop 名片与观察 / 步骤卡缩略图同步（同一 app、同一 obs）。
3. 一键停止入口（overlay 顶栏「停止」；点明 Esc 可打断后续 click / type）。
4. 无观察 / idle → 不画「在控」铬，不画假绿「已连接」。

## 不做 / Hard

- 第二套全屏远程 / VNC 壳，或再漂一层远程工具条
- Composer 底下脚注墙
- Explore 点亮 overlay / 注册 `desktop_act`
- 无观察仍装「在控」

---

## 验收 O1–O4（jojo 正式版）

- **O1** act 亮/熄：`desktop_act` 进行中蓝边亮；act 结束或停止后熄
- **O2** 右栏一致：右栏 Desktop 与当前观察窗 / 步骤卡缩略图同一 `appKey` + 同一观察
- **O3** 停后不再 click：点「停止」后 overlay 熄灭，后续 click / type 不再当作在控态
- **O4** Explore 无 overlay：探索模式无蓝边、无「正在操控」条、无 `desktop_act` 芯片点亮

---

## 范围

- **在**：Enjoy Local · Execute · 已有 overlay 窗换成冷静铬 · 右栏 `desktop-view` 与步骤卡同步 · 本预览 + 本文
- **不在**：产品 TS / UI 本刀不改；不做 I3 / Registry more-agents；不做第二套遥控器；不宣称现网 overlay 已 1:1

补厚对象：[`../previews/p0-computer-use.html`](../previews/p0-computer-use.html) 里偏薄的 CU-P0-C 块。**overlay 视觉 SoT 以本预览为准。**

---

## Luna 一句话

act 才亮冷静蓝边；右栏名片跟观察走；停止一键熄，Explore 零 overlay。不要第二套遥控器，也不要无观察装在控。

视觉真源：[`../previews/cu-p0-c-overlay.html`](../previews/cu-p0-c-overlay.html)（A 在控 / B idle / C Explore / 反例划掉；不宣称应用已 1:1）。

---

*未落地前：视觉与生命周期以预览 + 本文为准。落地后以 `design/specs/computer-use.md` 为准。*
