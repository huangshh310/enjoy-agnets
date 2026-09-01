# spec/knowledge

> 用户显式选择的本地 RAG。最后更新：2026-09-02

## 当前真相

包：`packages/knowledge`。来源、忽略规则、解析、确定性 chunk、本地余弦 / 词袋检索。SQLite 表：`knowledge_sources` `knowledge_documents` `knowledge_chunks` `knowledge_embeddings`。

只索引用户添加的文件或目录。`addKnowledgeSource` / `collectKnowledgeFiles` 都走 `resolveKnowledgePath`：工作区内绝对路径（含 Windows 盘符大小写）收成相对路径，根外与 `..` 逃逸即拒。扫盘子路径再 jail，失败抛错，不要 `catch` 成 `[]`。自动排除 `.git`、构建目录、密钥文件和 `.gitignore`；忽略规则只认相对路径，不把盘符祖先里的 `out`/`dist` 当构建目录。单个文件失败不阻塞。`knowledge_documents` 记文件 hash：未变文件 Resume 跳过，Pause 把来源标 `paused`，Rebuild 清空 chunk 后全量重建。解析阶段只写 `hashedEmbedding`；整源结束后再 `reembedStaleSource`（8s 回落），不要每个文件等网络。每写入一篇文档就 `tally()`，Collections 行在 Indexing 中也能看到文件数。`knowledge.documents` 合并库内文档与磁盘扫描，未入库文件以 `unindexed`/`indexing` 出现。来源列表带 `embeddingsStale`。Agent 开跑时 `citeKnowledge` 按用户最后一句检索，结果作为 `source.added`；知识页 View Files 必须设置 `selectedPath` 再切到文件 tab。检索可开 rerank：先试 SDK `rerank`，失败回落本地词袋+向量融合。`ai.generate` kind=`embedding`/`rerank` 走同一套向量。

路由：`#/knowledge`。UI 组装层 `knowledge-page.tsx` + `use-knowledge-page.ts`；区域组件 `knowledge-folder-cards.tsx`、`knowledge-documents-table.tsx`、`knowledge-document-list.tsx`、`knowledge-sources-table.tsx`、`knowledge-retriever-drawer.tsx`、`knowledge-file-preview-modal.tsx`、`knowledge-add-modal.tsx`。预设卡未索引时写「Not indexed yet」，不要写死 estimated files。IPC：`knowledge.sources` `knowledge.documents` `knowledge.addSource` `knowledge.index` `knowledge.search`。设置：Knowledge Indexing。`knowledgeAutoIndex` 为真时 `addSource` 立刻 `indexKnowledgeSource`。

## 不变量

- 路径不得逃出工作区根。
- renderer 不直接读盘。
- 无 embedding 时用词袋兜底，不假装已向量化。

## 代码入口

- 忽略 / 分块 / 检索：`packages/knowledge`
- 路径 jail：`packages/db/src/path-safe.ts`（`resolveKnowledgePath`）
- 服务：`apps/desktop/src/main/services/knowledge-service.ts`（索引）；检索 `knowledge-search.ts`
- UI：`apps/desktop/src/renderer/src/components/knowledge/`

## 已知坑

- PDF 解析是启发式抽文本，复杂 PDF 可能 `pdf-unreadable`，不要当成完整 PDF 引擎。
- 索引先写 `hashedEmbedding`（32 维），有 Key 再 `embedMany` 覆盖。检索按 `model_id` 选同一套 query 向量，维度不一致时回落词袋。
- Provider / embedding 模型变了不会自动清文档；Resume 或再次 Index 会 `reembedStaleSource`。Rebuild 才清空 chunk。
- Provider embed 失败或超过 8s 回落 hashed，不要让索引一直转。`ENJOY_E2E_STUB` 跳过 Provider embed。解析阶段禁止 per-file `embedMany`；添加来源后立刻刷新，Indexing 中按 1.5s 刷 `knowledge.documents`，完成再刷一次。
- Windows 选择器常给 `C:/...`，工作区根可能是 `c:/...`。`startsWith` 大小写敏感会把库内目录存成绝对路径，随后 `shouldIgnore` 或 `relative()` 把文件扫成 0。比较根前缀必须忽略盘符大小写。
- `knowledge.documents` 失败时 UI 必须显示错误，不能把 `data ?? []` 画成「还没有文件」。View Files 若只切 tab 不设 `selectedPath`，看起来像点了没打开该目录。
- 编辑来源弹窗不要用「路径没变」禁用保存。同一路径点 Rebuild 走 `knowledge.index rebuild`；改路径才删旧建新。卡住 Indexing 时也要能点。
- 相对路径相对**当前打开的工作区根**，不是仓库自己的 `design/`。工作区是 `Desktop/img` 时，`design` 会变成 `Desktop/img/design`，不存在就 ENOENT。索引失败要把 `status=error` 和可读 `error` 写回来源，UI 必须显示；预设卡若磁盘上没有该目录，禁用 Index Now。
- 分块 / 余弦排序有吞吐单测（约 8000 行 / 500 向量）。Agent / generate 会写 `ttfoMs`；用真实 Key 才能解释成模型 TTFO，stub 只证明字段被写入。
- Cohere 以外没有官方 rerank 工厂时 `createRerankModel` 返回 undefined，必须走本地融合，不要空排。
- 来源路径必须 `assertInsideRoot`；不要 `join(root, rel)` 后直接 `stat`，POSIX 上绝对 `rel` 会丢掉 root。
