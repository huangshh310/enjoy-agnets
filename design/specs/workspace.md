# spec/workspace

> 工作区是 Agent 的磁盘边界。最后更新：2026-08-31

## 当前真相

打开文件夹后，main 记下 `rootPath`，写入 `workspaces` 表。所有相对路径相对该根；工具与 `readFile` / `listDir` / `diff` / `changes` 不得逃出根目录。

当前能力：

- 打开 / 列出工作区
- 列目录、读文件
- Git 变更列表 + 单文件 diff（Changes 窗）
- 工作区绑定的 pty 终端（`terminal.open` / `write` / `close`）

Agent 写盘与 bash 不走 renderer：审批通过后由 workspace host / `command.ts` 在 main 执行。bash 的 cwd 锁在工作区，输出截断，Windows 下 `windowsHide: true`。

右侧栏视图：Changes / Files / Terminal / Browser / Review。未完成的视图保持空态，不要假装接上了 Monaco CDN。

## 不变量

- 路径必须规范化并限制在 `rootPath` 内（`..` 逃逸视为错误）。
- renderer 不直接 `fs`，不拼用户磁盘绝对路径当秘密通道。
- `git_commit` 与写文件一样默认要审批。
- 代码编辑器必须是本地视图，禁止 Monaco CDN「Loading…」空洞。

## 代码入口

- 工作区服务：`apps/desktop/src/main/services/workspace.ts`
- 命令执行：`apps/desktop/src/main/services/command.ts`
- 终端：`apps/desktop/src/main/services/terminal.ts`
- 右侧栏：`apps/desktop/src/renderer/src/components/ai-chat/right-pane/`

## 已知坑

- `packages/editor` 已在仓里，但主路径仍是 Changes / 文件 diff 卡片，不是完整 IDE 编辑器。文档不要写成「已经有完整 Monaco 工作区」。
- 文件监视、完整 Git 面板、MCP 仍是 V1，未实现的不要在 UI 里做假入口（sidebar 必须 navigate，不能 no-op）。
