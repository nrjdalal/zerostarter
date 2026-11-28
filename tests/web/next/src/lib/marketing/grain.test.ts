import { describe, expect, test } from "bun:test"

import { skipsGrain } from "../../../../../../web/next/src/lib/marketing/grain"

// Renderer strings as UNMASKED_RENDERER_WEBGL reports them.
describe("skipsGrain", () => {
  test("skips the grain on a software renderer", () => {
    for (const renderer of [
      "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (LLVM 10.0.0) (0x0000C0DE)), SwiftShader driver)",
      "llvmpipe (LLVM 15.0.7, 256 bits)",
      "Software Rasterizer",
      "softpipe",
      "ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)",
    ])
      expect(skipsGrain(renderer)).toBe(true)
  })

  test("runs the grain on a GPU", () => {
    for (const renderer of [
      "ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Pro, Unspecified Version)",
      "ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      "Mali-G78",
    ])
      expect(skipsGrain(renderer)).toBe(false)
  })

  test("runs the grain when the renderer string is hidden", () => {
    expect(skipsGrain(null)).toBe(false)
  })
})
