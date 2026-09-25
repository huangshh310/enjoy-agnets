# spec/computer-use

> Enjoy Local 操作本机其它应用。最后更新：2026-09-25

## 当前真相

设置里的 **电脑操控** 打开、且不是探索模式时，Enjoy Local 注册 `desktop_doctor`、`desktop_list_apps`、`desktop_snapshot`、`desktop_screenshot`、`desktop_act`。旧坐标工具已删。**§3.2e / H5**：未做真机 GUI 冒烟前，设置与文档不得把 Windows / Linux 标成「可用」或 available；macOS 是当前支持路径。`ENJOY_CU_GUI=1` 才跑拍树测试，跳过 ≠ 通过。

`desktop_act` 默认审批。`wait` 不审批（上限 5 秒）。坐标或 `allowForeground: true` 每次都问。观察编号由 main 签发，30 秒、用过即废。**待批冻结该观察的 TTL 时钟**（`freeze` / `unfreeze`，不改 `OBSERVATION_TTL_MS`）。Allow：解冻再 `take`；仍 stale（过期或账本无此号）则对同一应用 **重拍一次**，匹配 `appKey` + 控件稳定键（**role+name**；路径 `elementId` 不是跨快照指针，有 role/name 时必须对上）后点**新**观察，旧号作废。身份偏弱（只有路径 id）回 `needs_second_confirm`，不静默点。对不上返回 `needs_second_confirm`（带新旧缩略图路径），**禁止对过期观察静默点击**。Deny：`discard`，不 act。已成功消费的编号再点是 `stale_observation`，不重拍。`needs_foreground` / `integrity_blocked` / `unknown_key` / `no_display` / `executor_missing` / `permission_denied` 会把观察还回去。成功后再拍一张树。未授辅助功能是 `permission_denied`，不要伪装成前台许可。

截图由 host `desktopCapturer` 写入 `userData/computer-use-thumbs/`，最多 20 张，不进模型文本。审批卡和右栏「正在看的窗口」可读缩略图。重启后账本为空：`executeStoredTool` → `resumeDesktopAct` 必须显式 `stale_observation`（或随后 `needs_second_confirm`），走同一条重拍路；**禁止假放行 / 报 success**。待批 `parkDesktopActArgs` 冻结 TTL；`enrichDesktopActApprovalArgs` 再补 `appKey` / `appKeySource` / `appName` / `observationId` / `action` / `elementName` / `thumbnailPath?` / `bypassesSessionAllow` / 本观察缩略图。

**§3.2b 会话 Allow 绑 appKey（H2 write/hit）**：决策枚举仍是 `allow` | `deny` | `allow_session`。`allow_session` 写入 `desktop_act:<appKey>`（`sessionApprovedTools.has("desktop_act:"+appKey)`），**禁止**写裸 `desktop_act`。无 appKey 时不写白名单，只当一次允许。appKey 优先级：`bundleId` → `exe` / AUMID → 规范化 `appName`；pid 不是键。坐标 / `allowForeground`（`bypassesSessionAllow`）/ 敏感窗每次问。设置高级「本会话任意桌面」默认关；开了才把 `desktop_act:*` 注入本轮 `sessionApprovedTools`（不是裸工具名）。Permission Dock 桌面名片底栏沿用既有 testid：**允许一次** `approval-allow`→`allow` / **本会话允许此应用** `approval-always`→`allow_session` / **拒绝** `approval-deny`→`deny`。`bypassesSessionAllow` 或无 appKey 时隐藏会话钮。一句话摘要走 `desktopActApprovalText`，副标题可显示 appKey。

设置页：标题「电脑操控」、就绪/未就绪徽章、开通三拍（开关 → 系统权限 → 执行器）、医生行指向**当前 helper**（路径/签名，不把 Electron-only AX 当绿）、动作「检测权限 / 拍一张屏 / 试一下 · 计算器」（试一下只切执行并预填 `@电脑`，不自动开跑）。Composer 执行态露出 `@电脑` 与「电脑」芯片；探索态不注册桌面写工具，并出诚实条「探索模式没有桌面操控工具」。

执行器是附属进程，换行 JSON。PATH 用 `pathDirs`，Windows 带 `-ExecutionPolicy Bypass` 和 `windowsHide`。打包 `resources/bin/<platform>-<arch>/`（darwin helper 须 codesign，见下）。开发时 darwin 用 `swiftc` 编到 `.build/computer-use`，未签名不得报就绪。

设置开关下调用 `desktopDoctor` 写一句缺什么。**医生绿当且仅当即将 spawn 的 helper 路径一致、具备有效团队签名（`helperSigned`，非 ad-hoc / 未签名），且该 helper 进程自己也能过 AX。** 宿主 Electron `systemPreferences.isTrustedAccessibilityClient` / `hostAccessibility` / 遗留 `signed` 不能单独报绿。未签名或身份错位返回 `executor_unsigned` / `executor_identity_mismatch`，开通徽章与医生点不得当就绪。人话指向为 Enjoy Computer Use helper 开辅助功能或重装签名包。

打包 `beforePack`：`scripts/stage-computer-use.cjs` 编出 `native/computer-use/pack/<platform>-<arch>/`。darwin 在有 `CU_CODESIGN_IDENTITY` / `CSC_NAME` / `APPLE_CODESIGN_IDENTITY` 时 `codesign` 真实 helper，并写 `computer-use.identity.json`；没有身份不假装已签名。开发 `swiftc` → `.build/computer-use` 未签名不得报「已就绪」。

右栏 Desktop 只读最近观察（可带 appKey）。`desktop_act` 成功路径会点亮已有 overlay（不是第二套遥控器）。§3.2a TTL 冻结 / resume / 重拍已由 #80 落地；UI 待批文案写「TTL 已冻结」。

## 不变量

- 渲染进程不截屏、不发鼠标。
- 探索模式不注册这些工具。
- 三端工具名相同。Wayland 不发明后台点击。提权窗口 `integrity_blocked`。
- 控件编号只在这一张观察里有效。
- 待批冻结 TTL，禁止只靠加长 30s；过期观察禁止静默点击。
- 不要在 TS 里用 cliclick / AppleScript / xdotool / SendInput。
- darwin：`desktop_doctor.success` 只在 spawn helper 签名匹配且该进程过 AX 时为真。开通绿必须看 `helperSigned`，禁止用宿主 `signed` / `hostAccessibility` 冒充。
- 未开「任意桌面」时，禁止裸 `desktop_act` 会话级放行；开了只命中 `desktop_act:*`。

## 代码入口

- 工具：`builtin-agent-tools.ts`、`computer-use/desktop-tools.ts`
- 宿主：`desktop-session.ts`（无 Electron）；act / 重拍：`desktop-session-act.ts`；医生：`doctor-report.ts`
- helper 身份 / codesign：`executor-identity.ts`；打包签名：`apps/desktop/scripts/codesign-helper.cjs`
- 账本 / 冻结 / 重拍匹配：`packages/agent-core/src/computer-use/`
- 协议：`apps/desktop/native/computer-use/protocol.md`
- 执行器：`native/computer-use/darwin|win32|linux`
- 审批卡：`thread/approval/desktop-approval-card.tsx`
- 设置：`settings/tools/desktop-tools-card.tsx`；开通绿：`desktop/desktop-readiness.ts`、`desktop-doctor-panel.tsx`
- 右栏：`right-pane/views/desktop-view.tsx`

## 已知坑

- **隐患**：开发时 macOS 辅助功能授给 `.build/computer-use`。该二进制未签名时医生**不得**绿；真要点击仍须给这份 helper 开辅助功能，或改用签名安装包。开通徽章与医生点只读 `helperSigned` + helper AX；`executor_unsigned` / `executor_identity_mismatch` / 宿主 `hostAccessibility` 不得绿。
- Windows / Linux 真实 GUI 点击没有在本机 macOS 上跑验收。设 `ENJOY_CU_GUI=1` 才跑拍树测试；跳过不等于通过（skip ≠ pass）。§3.2e / H5：设置与文档不得把 Win/Linux 标成可用/available，直至真机 GUI 冒烟。
- Windows `move`/`drag` 仍要前台许可；`key` 用 `PostMessage`，不用 `SendInput`。
- **二次确认卡 UI**（新旧缩略图并排）视觉真源已在 `design/previews/cu-p1-r-second-confirm.html`；UI 接线仍待拍。数据面回 `needs_second_confirm` 载荷，名片尚未并排新旧图。
- 发版 CI 若没有 `CSC_LINK` / `CSC_NAME`，stage 会留下未签名 sidecar，医生保持不绿。不要把「编过 swiftc」写成已就绪。
- **H2 write/hit**：审批层按 `desktop_act:<appKey>` 写入、按 `has("desktop_act:"+appKey)` 或 `has("desktop_act:*")` 命中。不要再 `sessionApprovedTools.add("desktop_act")`，也不要按裸工具名放行。
- 执行器快照目前多半只有 `appName`，`appKey` 回落到规范化应用名；有 `bundleId` / `exe` / AUMID 才优先用。`appKeySource` 记录用了哪一档。
- 控件 `elementId` 是当次 AX 路径下标，不是稳定指针。重拍不得只靠同号 id 自动点；有审批 enrich 的 role/name 时必须对上，否则 `needs_second_confirm`。
