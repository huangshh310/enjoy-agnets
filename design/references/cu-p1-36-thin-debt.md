# CU-P1-36 · §3.6 薄债短锁

> 2026-09-25 · jojo 产品短锁 · Luna 预览钉视觉  
> 对照：[`computer-use-codex-parity.md`](./computer-use-codex-parity.md) §3.6  
> 视觉真源：[`../previews/cu-p1-36-thin-debt.html`](../previews/cu-p1-36-thin-debt.html)  
> 基线 tip `5febb14` · I3 / P1-D / P1-C 仍不开  
> Owner：luna 薄预览 → kai 主（载荷/闸）→ mike 设置铬  
> 落地以 `design/specs/*` 为准；本文不是当前真相。预览锁视觉与文案，不宣称应用已 1:1。

## 一句话

裸坐标默认关；`action_failed` 不附「像成功下一步」的假观察。

## Do

1. **坐标通道默认关**：优先 AX `elementId`；裸坐标 click 仅「高级/调试」开关打开后可用，且**每次**进 Dock（不吃会话表 / Always-allow）。开关默认 OFF；设置文案写明逃逸舱、非主路径。
2. **`action_failed` 载荷**：失败响应不得附带可被模型当成下一步依据的新观察（新 obs id / 误导缩略 / 「继续点这里」）。需新观察必须显式再 `desktop_snapshot` / `desktop_screenshot`。

## Don’t

- 默认开启像素坐标主路径
- 失败当成功 / 空成功
- 用假观察绕过 §3.2a 二次确认
- 本刀开 I3 / P1-D / P1-C

## 验收 S1–S4

- **S1**：默认设置下发起裸坐标 click → 拒或必 Dock；高级坐标未开时不可静默执行。
- **S2**：打开高级坐标后 → 每次 Dock；仍不吃 Always-allow / 会话白名单。
- **S3**：`action_failed` 返回体无新观察号、无误导「下一步」缩略；客户端与模型不可据该失败包继续 act。
- **S4**：失败后再点 → 必须新一次 snapshot/screenshot 观察链路。

## Luna 一句

「坐标是逃逸舱，失败别塞下一张假地图」：设置里高级坐标默认关；失败卡只说失败，不附可接着点的新观察。

## 预览态（薄）

- 设置：高级坐标开关默认关 + 诚实说明
- 开后：坐标 click 仍进 Dock（示意）
- 失败卡：`action_failed` 无新观察 / 无下一步缩略
- 反例：默认像素主路径、失败附假观察、失败当成功、绕二次确认

---

*kai 数据面已落地（prefs `desktopAdvancedCoords` 默认 OFF、裸坐标硬拒、`action_failed` 不附新观察），当前真相见 `design/specs/computer-use.md`。设置铬仍未绑（mike）。I3 / P1-D / P1-C 仍不开。*
