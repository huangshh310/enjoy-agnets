# Computer Use 执行器协议

stdin / stdout 各一行一个 JSON。stderr 只写诊断，main 不解析。

请求：`{ "id": "1", "method": "doctor|list_apps|snapshot|act|screenshot", "params": {} }`

`list_apps` 的 `result.apps[]` 必有 `pid` / `name`；可选 `bundleId` / `exe` / `aumid` / `appKey`。宿主用这些拼稳 appKey（bundleId → exe/AUMID → 规范化名）。**pid 不是键**。darwin 现网会带 `bundleId`；win32 / linux 目前多半只有 name，回落规范化名。

没有 `cancel` 方法。用户停时宿主拒绝在途请求并 `child.kill` helper（与超时同一条路），错误码 `executor_cancelled` 由宿主生成。OS 已落下的 click 无法撤回。

`doctor` 的 `result` 可带 `trusted` / `backgroundClick`；darwin 另带 `executablePath`（当前进程路径，给宿主对即将 spawn 的 helper 做身份核对）。宿主还会验路径与 codesign；未签名或错位时 `success` 为假，不改执行器错误码表。

响应：`{ "id": "1", "result": {} }` 或 `{ "id": "1", "error": { "code": "...", "message": "..." } }`

`snapshot` 的 `result.observation` 含 `id`、`pid`、`windowId`、`appName`、`elements`、`createdAt`、`platform`。`elements[]` 含 `id`、`role`、`name`、`clickable`。

`act` 的 params 含 `action`、`pid`、`elementId`、`allowForeground`。做不到后台点击时 `error.code` 为 `needs_foreground`，不要改用会移动硬件光标的输入。用户允许前台之后，同一次请求带 `allowForeground: true`。

控件编号是这一次快照里的路径（窗口下标 + 子节点下标），不是指针。执行器按路径找回控件，并用 `elementName` 校验；对不上返回 `stale_observation`，不要点。

`needs_foreground` 表示这一次什么都没点。宿主会把观察还回去，用户允许前台后带 `allowForeground: true` 再试同一编号。

三端错误码：`executor_missing`、`stale_observation`、`needs_second_confirm`、`needs_foreground`、`integrity_blocked`、`unknown_key`、`no_display`、`screenshot_unavailable`、`action_failed`、`permission_denied`。未授辅助功能用 `permission_denied`，不要伪装成 `needs_foreground`。`needs_second_confirm` 是宿主重拍后校验失败（新旧缩略图），执行器不会发这个码。
