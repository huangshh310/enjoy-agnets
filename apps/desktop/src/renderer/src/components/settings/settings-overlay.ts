/**
 * 设置抽屉叠层。弹出层必须高于 nested，否则模型下拉会开在抽屉背面。
 */
export const SETTINGS_DRAWER_Z = {
  base: 50,
  nested: 70,
  float: 80,
  modal: 90
} as const

export const SETTINGS_DRAWER_Z_CLASS = {
  base: "z-50",
  nested: "z-[70]",
  float: "z-[80]",
  modal: "z-[90]"
} as const
