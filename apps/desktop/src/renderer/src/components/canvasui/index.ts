/**
 * Canvas UI 官方 WebGL 特效组件统一导出桶：
 * 对齐 https://canvasui.dev/docs/components：
 * - GlyphRain: 极客代码雨粒子流动 (Matrix Digital Rain)
 * - HexFloat: 3D 悬浮六边形网格棱镜 (Floating Hexagon Tiles)
 * - RetroDither: 8-bit 复古点阵抖动透镜 (Retro Dither Filter)
 * - Frost: 冰霜凝冻与体温融化透镜 (Frosted Ice Melt)
 */

export { GlyphRain, type GlyphRainProps, type GlyphRainOptions } from "./glyph-rain"
export { HexFloat, type HexFloatProps, type HexFloatOptions } from "./hex-float"
export { RetroDither, type RetroDitherProps, type RetroDitherOptions } from "./retro-dither"
export { Frost, type FrostProps, type FrostOptions } from "./frost"
export { createRectCache } from "./rect-cache"
