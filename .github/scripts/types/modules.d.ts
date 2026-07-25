// Minimal hand declarations for untyped build-only deps; widen only when a script needs more surface.

declare module "fontkit" {
  export type Font = {
    characterSet: number[]
    getVariation(settings: Record<string, number>): Font
    layout(text: string): { advanceWidth: number }
    unitsPerEm: number
  }
  export type FontCollection = { fonts: Font[] }
  export function create(buffer: Uint8Array): Font | FontCollection
}

declare module "wawoff2" {
  const wawoff2: { decompress(input: Uint8Array): Promise<Uint8Array> }
  export default wawoff2
}
