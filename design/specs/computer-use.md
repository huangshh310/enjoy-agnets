# spec/computer-use

> Enjoy Local 操作本机其它应用。最后更新：2026-09-25

## 当前真相

设置里的 Computer Use 打开、且不是探索模式时，Enjoy Local 注册 `desktop_doctor`、`desktop_list_apps`、`desktop_snapshot`、`desktop_screenshot`、`desktop_act`。旧坐标工具已删。

`desktop_act` 默认审批。`wait` 不审批（上限 5 秒）。坐标或 `allowForeground: true` 每次都问。观察编号由 main 签发，30 秒、用过即废。**待批冻结该观察的 TTL 时钟**（`freeze` / `unfreeze`，不改 `OBSERVATION_TTL_MS`）。Allow：解冻再 `take`；仍 stale（过期或账本无此号）则对同一应用 **重拍一次**，匹配 `appKey` + 控件稳定键（**role+name**；路径 `elementId` 不是跨快照指针，有 role/name 时必须对上）后点**新**观察，旧号作废。身份偏弱（只有路径 id）回 `needs_second_confirm`，不静默点。对不上返回 `needs_second_confirm`（带新旧缩略图路径），**禁止对过期观察静默点击**。Deny：`discard`，不 act。已成功消费的编号再点是 `stale_observation`，不重拍。`needs_foreground` / `integrity_blocked` / `unknown_key` / `no_display` / `executor_missing` / `permission_denied` 会把观察还回去。成功后再拍一张树。未授辅助功能是 `permission_denied`，不要伪装成前台许可。

截图由 host `desktopCapturer` 写入 `userData/computer-use-thumbs/`，最多 20 张，不进模型文本。审批卡和右栏「正在看的窗口」可读缩略图。重启后账本为空：`executeStoredTool` → `resumeDesktopAct` 必须显式 `stale_observation`（或随后 `needs_second_confirm`），走同一条重拍路；**禁止假放行 / 报 success**。审批 `approval.required` 的 args 用账本里的应用名 / 控件名 / `appKey` / `pid`。

执行器是附属进程，换行 JSON。PATH 用 `pathDirs`，Windows 带 `-ExecutionPolicy Bypass` 和 `windowsHide`。打包 `resources/bin/<platform>-<arch>/`（darwin helper 须 codesign，见下）。开发时 darwin 用 `swiftc` 编到 `.build/computer-use`，未签名不得报就绪。

设置开关下调用 `desktopDoctor` 写一句缺什么。**医生绿当且仅当即将 spawn 的 helper 路径一致、具备有效团队签名（非 ad-hoc / 未签名），且该 helper 进程自己也能过 AX。** 宿主 Electron `systemPreferences.isTrustedAccessibilityClient` 不能单独报绿。未签名或身份错位返回 `executor_unsigned` / `executor_identity_mismatch`，人话指向为 Enjoy Computer Use helper 开辅助功能或重装签名包。右栏 Desktop 只读最近观察。

打包 `beforePack`：`scripts/stage-computer-use.cjs` 编出 `native/computer-use/pack/<platform>-<arch>/`。darwin 在有 `CU_CODESIGN_IDENTITY` / `CSC_NAME` / `APPLE_CODESIGN_IDENTITY` 时 `codesign` 真实 helper，并写 `computer-use.identity.json`；没有身份不假装已签名。开发 `swiftc` → `.build/computer-use` 未签名不得报「已就绪」。

## 不变量

- 渲染进程不截屏、不发鼠标。
- 探索模式不注册这些工具。
- 三端工具名相同。Wayland 不发明后台点击。提权窗口 `integrity_blocked`。
- 控件编号只在这一张观察里有效。
- 待批冻结 TTL，禁止只靠加长 30s；过期观察禁止静默点击。
- 不要在 TS 里用 cliclick / AppleScript / xdotool / SendInput。
- darwin：`desktop_doctor.success` 只在 spawn helper 签名匹配且该进程过 AX 时为真。

## 代码入口

- 工具：`builtin-agent-tools.ts`、`computer-use/desktop-tools.ts`
- 宿主：`desktop-session.ts`（无 Electron）；act / 重拍：`desktop-session-act.ts`；医生：`doctor-report.ts`
- helper 身份 / codesign：`executor-identity.ts`；打包签名：`apps/desktop/scripts/codesign-helper.cjs`
- 账本 / 冻结 / 重拍匹配：`packages/agent-core/src/computer-use/`
- 协议：`apps/desktop/native/computer-use/protocol.md`
- 执行器：`native/computer-use/darwin|win32|linux`
- 右栏：`right-pane/views/desktop-view.tsx`

## 已知坑

- **隐患**：开发时 macOS 辅助功能授给 `.build/computer-use`。该二进制未签名时医生**不得**绿；真要点击仍须给这份 helper 开辅助功能，或改用签名安装包。
- Windows / Linux 真实 GUI 点击没有在本机 macOS 上跑验收。设 `ENJOY_CU_GUI=1` 才跑拍树测试；跳过不等于通过。Win/Linux 可用性文案门是 H5，不在 §3.2c。
- Windows `move`/`drag` 仍要前台许可；`key` 用 `PostMessage`，不用 `SendInput`。
- **二次确认卡 UI**（新旧缩略图并排）仍是 P0-B；数据面只回 `needs_second_confirm` 载荷。H2 会话 Allow 绑 `{tool, appKey}` 未做。
- 发版 CI 若没有 `CSC_LINK` / `CSC_NAME`，stage 会留下未签名 sidecar，医生保持不绿。不要把「编过 swiftc」写成已就绪。
- 执行器快照目前多半只有 `appName`，`appKey` 回落到规范化应用名；有 `bundleId` / `exe` / AUMID 才优先用。
- 控件 `elementId` 是当次 AX 路径下标，不是稳定指针。重拍不得只靠同号 id 自动点；有审批 enrich 的 role/name 时必须对上，否则 `needs_second_confirm`。
