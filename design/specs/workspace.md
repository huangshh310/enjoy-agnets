# spec/workspace

> 工作区是 Agent 的磁盘边界。最后更新：2026-09-02

## 当前真相

打开文件夹后，main 记下 `rootPath`，写入 `workspaces` 表。所有相对路径相对该根；工具与 `readFile` / `listDir` / `diff` / `changes` 不得逃出根目录。

当前能力：

- 打开 / 列出 / 移除工作区；创建弹窗先 `workspace.pickFolder` 只选路径，点「创建项目」才 `workspace.open({ path, name })` 写入 `workspaces` 表。`workspace.remove` 只删应用档案与该项目下会话，不删磁盘文件夹。
- 会话可归档：`session.archive` 后侧栏不再显示，设置 `#/settings/archived` 可恢复或删除。
- 列目录、读文件（`workspace.readFile` 必须 jail，禁止根外绝对路径直读）
- Git 变更列表 + 单文件 diff（Changes 窗）
- 工作区绑定的 pty 终端（`terminal.open` / `write` / `close`）

Agent 写盘与 bash 不走 renderer：审批通过后由 workspace host / `command.ts` 在 main 执行。bash 的 cwd 锁在工作区，输出截断，Windows 下 `windowsHide: true`。

右侧栏视图：Changes / Files / Terminal / Browser / Review。Browser 用 Electron `<webview>`（`partition persist:enjoy-preview`）预览 http(s)；对话链接与域名胶囊写入该标签。文件变更胶囊打开审查并选中文件。编辑器仍非完整 Monaco，不要假装接上了 CDN。

Files 视图是 **左树右预览**。树与预览之间有可拖拽分隔条（`react-resizable-panels`，热区 12px，`cursor-col-resize`）：

- 默认树宽 240px，最小 160px，最大占 Files 栏 55%
- 布局写入 `localStorage` 键 `enjoy-agents-files-tree-split`
- 顶栏文件夹按钮在路径左侧，可整栏收起树（收起后只留预览）
- 这是改宽，不是把文件拖进文件夹。文件移动 / 拖拽重组另开能力，未做。

## 不变量

- 路径必须规范化并限制在 `rootPath` 内（`..` 逃逸视为错误）。
- renderer 不直接 `fs`，不拼用户磁盘绝对路径当秘密通道。
- `git_commit` 与写文件一样默认要审批。
- 代码编辑器必须是本地视图，禁止 Monaco CDN「Loading…」空洞。

## 代码入口

- 工作区档案：`apps/desktop/src/main/services/workspace.ts`
- host（读写 / glob / grep / bash）：`workspace-host.ts`
- Git 变更 / diff：`workspace-git.ts`
- 命令执行：`apps/desktop/src/main/services/command.ts`
- 终端：`apps/desktop/src/main/services/terminal.ts`
- 右侧栏：`apps/desktop/src/renderer/src/components/ai-chat/right-pane/`

## 已知坑

- `packages/editor` 已在仓里，但主路径仍是 Changes / 文件 diff 卡片，不是完整 IDE 编辑器。文档不要写成「已经有完整 Monaco 工作区」。
- 文件监视、完整 Git 面板仍是后续。MCP / Knowledge / 资产导出已有路由，sidebar 必须 `navigate`，不能 no-op。
- 资产导出与知识库路径同样不得逃出 `rootPath`。
- 创建项目弹窗选文件夹必须走 `workspace.pickFolder`，不要 `workspace.open`，否则未点创建也会写入 `workspaces`。换目录时项目名称按「未手改则跟随新 basename」更新；创建时把 `projectName` 传给 `open.name`。
- Git 分支未接线。侧栏项目卡片、Composer、Studio 不要写死 `main`。
- 移除项目不是删文件夹。归档不是删除；永久删除走 `session.delete` / `session.deleteArchived`。
