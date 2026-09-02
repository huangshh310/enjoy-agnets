/**
 * 中文文案总表。新增域在此合并，en 侧必须同构。
 */
import { zhChat } from "./chat.ts"
import { zhCommand } from "./command.ts"
import { zhCommon } from "./common.ts"
import { zhNav } from "./nav.ts"
import { zhPages } from "./pages.ts"
import { zhSettings } from "./settings.ts"
import { zhStudio } from "./studio.ts"

export const zh = {
  common: zhCommon,
  nav: zhNav,
  command: zhCommand,
  settings: zhSettings,
  chat: zhChat,
  studio: zhStudio,
  pages: zhPages
}

export type Messages = typeof zh
