// Minimal hand declaration for an untyped build-only dep (fontkit ships @types/fontkit; wawoff2 has none).

declare module "wawoff2" {
  const wawoff2: { decompress(input: Uint8Array): Promise<Uint8Array> }
  export default wawoff2
}
