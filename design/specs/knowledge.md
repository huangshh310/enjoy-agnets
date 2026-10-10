# spec/knowledge

> 用户显式选择的本地 RAG。最后更新：2026-10-10（本轮来源知识库行：打开文件或展开片段）

## 当前真相

包：`packages/knowledge`。来源、忽略规则、解析、确定性 chunk、本地余弦 / 词袋检索。SQLite 表：`knowledge_sources` `knowledge_documents` `knowledge_chunks` `knowledge_embeddings`。

只索引用户添加的文件或目录。`addKnowledgeSource` / `collectKnowledgeFiles` 都走 `resolveKnowledgePath`：工作区内绝对路径（含 Windows 盘符大小写）收成相对路径，根外与 `..` 逃逸即拒。扫盘子路径再 jail，失败抛错，不要 `catch` 成 `[]`。自动排除 `.git`、构建目录、密钥文件和 `.gitignore`；忽略规则只认相对路径，不把盘符祖先里的 `out`/`dist` 当构建目录。单个文件失败不阻塞。`knowledge_documents` 记文件 hash：未变文件 Resume 跳过，Pause 把来源标 `paused`，Rebuild 清空 chunk 后全量重建。解析阶段只写 `hashedEmbedding`；整源结束后再 `reembedStaleSource`（8s 回落），不要每个文件等网络。每写入一篇文档就 `tally()`，Collections 行在 Indexing 中也能看到文件数。`knowledge.documents` 合并库内文档与磁盘扫描，未入库文件以 `unindexed`/`indexing` 出现。来源列表带 `embeddingsStale`。Agent 开跑时 `citeKnowledge` 按用户最后一句检索，结果作为 `source.added`；知识页 View Files 必须设置 `selectedPath` 再切到文件 tab。检索可开 rerank：先试 SDK `rerank`，失败回落本地词袋+向量融合。`ai.generate` kind=`embedding`/`rerank` 走同一套向量。

路由：`#/knowledge`，在 `AppShell` 内换轨（情境栏=来源透镜切换）。首页数字以可问块为准（`askableChunks`），扫描文件数不得冒充已索引；动作失败与健康卡只显示 `pathNotFound` / `statusError` 短句，ENOENT 原文只进 tooltip。核心交互遵循「检索是首页，索引是面板」：
1. **检索舞台 (Retrieval Stage)**：页面主视觉。自然语言输入默认焦点、回车即搜。透镜开关把启用的 `sourceIds` 传给 `knowledge.search`；当前选中路径仍可在前端再收窄。【钉到当前对话】走页面 `handlePinToChat` → 会话上下文芯片，发送时随消息带入。空态展示最近命中或「还不能问」，不用样例提问冒充引用。
2. **记忆层 Bento (Memory Layer Bento)**：非对称 2:1:1。脉冲 0 块主文案「还不能问」；透镜开关决定本次检索范围，星标写入工作区 `localStorage` 默认范围；健康卡折叠不可用源，缺失源禁用 Index Now。
3. **索引管理面板**：默认收起，在舞台与 Bento **下方页内**展开（`rounded-3xl shadow-card`），不是遮罩 overlay。面板 `min-h-[28rem]` / `max-h-[min(40rem,75vh)]`，工具栏固定，文件空态与列表吃剩余高度并内部滚动。来源 Rebuild 在 Indexing 卡住时仍可点。预览 / View Files 先写 `selectedPath`。
4. 区域组件：`components/retrieval/`、`components/bento/`、`components/drawer/`、`components/table/`、`knowledge-add-modal.tsx`、`knowledge-file-preview-modal.tsx`。
5. 聊天 `SourceList` 点引用导航 `#/knowledge`（`path` / `q` / `snippet` / `startLine`），命中卡 `data-testid=knowledge-cited-hit`。助手气泡底脚知识库 cite 是独立 `knowledge` 芯片（书标 +「知识库」），点开「本轮来源」选中该行。工作区里还在的文件点行打开右侧并滚到行；找不到或不在工作区则就地展开片段。图标表在 `thread/sources/source-badge.ts`，缺 kind 回落问号，禁止 undefined 白屏。

## 不变量

- 路径不得逃出工作区根。
- renderer 不直接读盘。
- 无 embedding 时用词袋兜底，不假装已向量化。

## 代码入口

- 忽略 / 分块 / 检索：`packages/knowledge`
- PDF 抽词：`packages/knowledge/src/parsers/pdf-text.ts`、`pdf-streams.ts`（含 ObjStm）、`pdf-operators.ts`、`pdf-cmap.ts`、`pdf-images.ts`、`pdf-ocr.ts`
- 路径 jail：`packages/db/src/path-safe.ts`（`resolveKnowledgePath`）
- 服务：`apps/desktop/src/main/services/knowledge-service.ts`（索引）；检索 `knowledge-search.ts`
- UI：`apps/desktop/src/renderer/src/components/knowledge/`
- 聊天来源芯片 / 本轮来源行：`apps/desktop/src/renderer/src/components/ai-chat/thread/sources/`（`source-badge.ts` 图标表；点击计划 `source-row-action.ts`；打开/展开 `open-source-row.ts`；滚到行 `source-file-reveal.ts`）

## 已知坑

- PDF 抽文本会解 `/Filter /FlateDecode` 内容流，读 `Tj` / `TJ` / `'` / `"`，并用 ToUnicode CMap 的 `bfchar` / `bfrange` 把 CID 映成 Unicode（`parsers/pdf-cmap.ts`）。`/Type /ObjStm` 只用来收集 CMap，不当页面算子。找 `stream` 关键字时前一个字符不能是字母，否则会把 `endstream` 当成新流。算子抽不出正文时，才对 `/Subtype /Image` 做 OCR：DCTDecode 当 JPEG，8bit Gray/RGB Flate 收成 PNM，调用本机 `tesseract`。没有 tesseract 标 `pdf-ocr-unavailable`，不要装成已识别。没有嵌入字体 cmap、JBIG2/CCITT 仍可能 `pdf-unreadable`。
- 索引先写 `hashedEmbedding`（32 维），有 Key 再 `embedMany` 覆盖。检索按 `model_id` 选同一套 query 向量，维度不一致时回落词袋。
- Provider / embedding 模型变了不会自动清文档；Resume 或再次 Index 会 `reembedStaleSource`。Rebuild 才清空 chunk。
- Provider embed 失败或超过 8s 回落 hashed，不要让索引一直转。`ENJOY_E2E_STUB` 跳过 Provider embed。解析阶段禁止 per-file `embedMany`；添加来源后立刻刷新，Indexing 中按 1.5s 刷 `knowledge.documents`，完成再刷一次。
- `queryVector` 走 Provider 时同样 8s 封顶；超时返回 `null` 让检索回落词袋，不要用 hashed 去对 Provider 向量（维度不一致）。Agent 开跑不得被这条检索堵住 IPC 返回。
- Windows 选择器常给 `C:/...`，工作区根可能是 `c:/...`。`startsWith` 大小写敏感会把库内目录存成绝对路径，随后 `shouldIgnore` 或 `relative()` 把文件扫成 0。比较根前缀必须忽略盘符大小写。
- `knowledge.documents` 失败时 UI 必须显示错误，不能把 `data ?? []` 画成「还没有文件」。View Files 若只切 tab 不设 `selectedPath`，看起来像点了没打开该目录。
- 编辑来源弹窗不要用「路径没变」禁用保存。同一路径点 Rebuild 走 `knowledge.index rebuild`；改路径才删旧建新。卡住 Indexing 时也要能点。
- 相对路径相对**当前打开的工作区根**，不是仓库自己的 `design/`。工作区是 `Desktop/img` 时，`design` 会变成 `Desktop/img/design`，不存在就 ENOENT。索引失败要把 `status=error` 和可读 `error` 写回来源，UI 必须显示；预设卡若磁盘上没有该目录，禁用 Index Now。
- 添加来源弹窗的「整个项目」芯片不能藏在 `workspaceDirs.length > 0` 后面：只有 `readme.md`、没有子目录的工作区否则没法点根。`ENJOY_E2E_STUB` 启动时索引 `.`，否则 `citeKnowledge` 没有命中，聊天里看不到 `readme.md`。文档路径在索引面板里，检索首页要搜才会在命中卡出现 `readme.md`。窗口验收：发 `hello knowledge` → 一次点芯片开抽屉 → 点 `readme.md` 行打开右侧并滚到行；缺失文件就地展开片段；`data-selected=true` 只能一行（`e2e/knowledge-source-chip.spec.ts`）。夹具先 `git init`，否则审查栏非 git 空态看不到打开的文件。
- `citeKnowledge` 的 `sourceId` 是知识库来源（整个 `.`），不是文件。芯片 id 若写成 `source.sourceId || path`，多文件会撞 id、两行一起亮。正确做法：`sourceChipStableId` = `path:startLine`。
- 本轮来源知识库行点了没反应、页脚却写「点文件可以在右侧打开」。根因：旧逻辑只让 `file`+path 聚焦审查。正确做法：工作区相对路径且 `workspace.readFile` 成功则走 `openChangedFile`；找不到 / `..` / 盘符 / URL 就地展开 `snippet`。页脚必须跟真实行为：「点文件可以在右侧打开；找不到的文件会就地展开片段。」
- 聊天来源行若只给 file/skill/mcp 画图标，点知识库芯片会 `Element type is invalid`（`SourceRowBody`）。图标 / 词条必须是 `Record<SourceBadgeKind, …>`，并留运行时回落。
- 分块 / 余弦排序有吞吐单测（约 8000 行 / 500 向量）。Agent / generate 会写 `ttfoMs`；用真实 Key 才能解释成模型 TTFO，stub 只证明字段被写入。
- Cohere 以外没有官方 rerank 工厂时 `createRerankModel` 返回 undefined，必须走本地融合，不要空排。
- 来源路径必须 `assertInsideRoot`；不要 `join(root, rel)` 后直接 `stat`，POSIX 上绝对 `rel` 会丢掉 root。`assertInsideRoot` 用 `path.isAbsolute`：Linux CI 上 `C:/Windows/...` 不是绝对路径，测「绝对路径被拒绝」必须按平台取样（POSIX 用 `/etc/passwd`）。
- `knowledge.search` 可带 `sourceIds`；返回 `{ hits, embeddingKind }`。`hashed` / `lexical` 命中卡禁止画「N% 匹配」，只标「本地哈希」或「词袋命中」。Chat 引用点 `SourceList` 走 `#/knowledge?path&q&snippet&startLine`，知识页 `useKnowledgeCiteFromRoute` 灌 query 并高亮命中卡。无 embedding Key 时页面禁止写「语义 RAG」。
- 添加来源的预设路径相对**当前工作区**。工作区没有 `design/` 时禁用该预设，不要提交后用横幅报「路径不存在」。浏览文件夹若在根外，必须提示，禁止静默不填路径。`workspace.pickFolder` 取消会抛错，浏览入口必须当成 cancel。图片等不可解析文件不要建成来源。
