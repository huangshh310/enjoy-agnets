# spec/media

> 应用资产库与实验媒体。最后更新：2026-09-13

## 当前真相

包：`packages/assets`。路由 `#/media` 在 `AppShell` 内换轨。对齐原型 Slide 9「Import → Preview → Translate → Export 与聊天并轨」：导入入口明确注明 8MB 上限（支持图片/音频/视频）；卡片提供 `Attach to chat`（`queueComposerAsset` 进 Composer 附件队列并回对话，发送走 `attachments`，不要只往输入框塞 `[asset:name]`）。二进制在 `userData/assets`，SQLite 存 hash / 类型 / 大小 / 来源。导入 `assets.import` 上限 8 MB（base64 合约封顶 12_000_000）。导入时 `resolveMediaType`：空 type / `octet-stream` 按扩展名补（`.md` → `text/markdown`），不要默认二进制。导出 `assets.export` 必须给工作区相对路径并做逃逸校验；覆盖需显式 `overwrite`。真正写盘前弹出系统保存框，选中路径再 `resolvePickedExportPath`；`ENJOY_E2E_STUB` 跳过对话框。生成图片 / 语音 / 视频后发 `asset.created`。视频走 SDK `experimental_generateVideo`：`grok-imagine-video*` 用 `@ai-sdk/xai` 的 `.video()`（即使档案是 OpenAI 兼容、Base URL 指向 x.ai），Fal / Replicate 走官方 `.video()`。禁止 `image()` 冒充 VideoModel。失败换同族/官方视频档案，**不再默默回落静图**。默认 5s / 16:9 / 480p，xAI 轮询窗口 10 分钟。聊天附件里的图片会作为图生视频的首帧。`experimentalMedia` 为假时 main 拒绝 `video` / `realtime-session`。`assets.upload` 走 SDK `uploadFile` / `uploadSkill`，按 hash 写入 `provider_file_refs`。

设置页 (`#/settings/media`)：对标 Vercel AI SDK 7 多模态分层架构，支持全局配置专用生图模型 (`defaultImageModelId`，如 DALL-E 3 / Grok Imagine / Flux)、视频模型 (`defaultVideoModelId`，如 Grok Imagine Video / Luma / Kling)、语音合成模型 (`defaultSpeechModelId`) 与语音转写模型 (`defaultTranscriptionModelId`)。在会话中触发生图或调用媒体工具时，直接路由至该处配置的专用多模态模型执行；支持从已激活模型选择或自定义输入 Model ID。

## 不变量

- 写入工作区必须显式导出 + 路径审批。
- renderer 不持有 Provider Key，不直接 `fs`。

## 代码入口

- `packages/assets`
- `apps/desktop/src/main/services/asset-service.ts`
- `apps/desktop/src/main/services/media-generation.ts`
- `apps/desktop/src/main/services/realtime-service.ts`
- `apps/desktop/src/main/services/attach-realtime-ws.ts`
- `apps/desktop/src/main/services/provider-files.ts`
- UI：`apps/desktop/src/renderer/src/components/media/`（`media-page.tsx` 页面壳与 hidden file input、`use-media-library.ts` 组合状态、`studio-console.tsx` 常驻生成器、`asset-grid.tsx` 分页网格、`asset-card.tsx` 卡片、`library-actions.ts` 导入导出生成纯流程、`media-filters.ts` 分类）
- 视频工厂：`packages/providers/src/media/video-factory.ts`；生成：`packages/agent-core/src/media/generate-video.ts`；播放协议：`apps/desktop/src/main/services/asset-protocol.ts`

## 已知坑

- 大文件 `bytesBase64` 走 IPC，超过 8 MB 直接拒；后续应改流式分片。
- `btoa(String.fromCharCode(...bytes))` 会在远低于 8 MB 时 RangeError。导入走 `fileToBase64` 循环编码。
- Upload 按钮依赖页面壳的 `fileInputRef`。Hook 只提供 `importFiles`，不要把 `<input>` ref 塞进 `useMediaLibrary` 再弄丢。
- `.md` / `.txt` 在 Windows 上 `File.type` 常为空。导入必须 `resolveMediaType`，否则会落成 `application/octet-stream`，聊天再当二进制 file part 发给 grok 会空输出。
- 资产进了 `assets` 表不等于气泡能回放。用户消息必须有 `message_parts` 的 `file` part（`assetId`）；旧会话只有 text 时，列出消息按「上一轮之后到本轮发送」的 `source=import` 资产补回，不要按文件名猜。
- 覆盖确认是两步：先预览 `overwriteRisk`，页面再带 `overwrite: true`；写盘仍要过系统保存框，不要只信 renderer 的布尔值。
- 导出到 `assets/export.bin` 这类尚未存在的子目录时，必须先 `mkdir` 父目录，否则 `writeFile` 抛 ENOENT，页面原先不 catch 会像没点到。
- 生图 / TTS / STT：`kind=fal|replicate|elevenlabs|deepgram|cohere` 走官方 `@ai-sdk/*` 工厂；其它 kind 走 OpenAI 兼容 `image()`（xAI `/v1/images/generations` 可用这条）。失败先换同族模型，再换已配置的官方媒体档案（Fal/Replicate/ElevenLabs/Deepgram）。转写先动态探测 `experimental_streamTranscribe`，没有则一次性 `transcribe`。翻译走 `experimental_streamTranslate` + OpenAI `translation()`；空结果会换备用模型，再失败记 run.failed。
- 在聊天里选 `grok-imagine-image-2.0` 却走 `agent.run`：SDK 7 生图是 `generateImage`，Chat Completions 不服务 imagine 模型，结果是 `No output generated`。Composer 必须按模型 id 分流到 `ai.generate` kind=`image`。
- 选 `grok-imagine-video` 却用 `createOpenAI().image()`：`experimental_generateVideo` 要 VideoModel。必须 `@ai-sdk/xai` 的 `.video()`。
- 视频 Connect Timeout、报一串 IP：工厂曾在 Base URL 不含 `x.ai` 时强行改打 `api.x.ai`，国内中转能出图却连不上官方主机。视频必须跟生图用同一套可达 Base URL。
- 视频 mp4 轻易超过 8 MB。回放走 `enjoy-asset://` 读盘，不要 `assets.read` 整段 base64。id 必须匹配 `ast_<uuid>`，拒绝路径穿越。
- Realtime WebSocket 需要对应 Provider Key 与 `wss` 可达；无 Key 或握手失败时保持本地回环，不要假装已连上远端。
