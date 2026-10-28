// Type shim for the author's untyped engine module (mesh.js is unchanged).
export const PALETTES: Record<string, string[]>
export const OUTFITS: Record<string, number>
export const FACE: Record<string, number>
export function hexToRgb(hex: string): number[]
export interface MomoRenderer {
  draw: (target: null, px: number, state: Record<string, unknown>) => HTMLCanvasElement | null
  canvas: HTMLCanvasElement
  gl: WebGL2RenderingContext
  info: { lost: boolean; renderer: string; gpu: string }
  preload: () => unknown
}
export function createRenderer(opts?: { canvas?: HTMLCanvasElement; base?: string }): MomoRenderer
