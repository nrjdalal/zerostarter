"use client"

import { useTheme } from "next-themes"
import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

// A subtle grain gradient for the landing backdrop. The grain math (simplex + value-noise FBM)
// and color mixing are ported from paper.design's grain-gradient shader, with its noise texture
// swapped for a procedural hash so nothing is fetched and there is no runtime dependency.
//
// It renders a single frame off-DOM (a canvas never mounted to the page) into an image, then
// fades that image in. Keeping no live <canvas> on the page avoids a macOS/Metal WebGL first
// swap that flashes white, independent of CSS opacity. Trade-off: the slow drift is dropped.

// Color stops read live from the app's --chart-* accent ramp (the oklch tokens in
// globals.css), resolved to sRGB by the browser so the grain matches them exactly.
const STOP_TOKENS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"]
const STOP_ALPHA = 0.5
const SOFTNESS = 0.9
const INTENSITY = 0.35
const GRAIN = 0.12
// Container opacity per theme, the last subtlety knob.
const OPACITY = { dark: 0.72, light: 0.5 }
// The single animation frame to bake (t = 0.1 * (FRAME_TIME + 7)); chosen for a balanced layout.
const FRAME_TIME = 9
// Cap the rendered long side so the baked image stays a reasonable size.
const MAX_SIDE = 2560

const VERT = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform vec4 u_colorBack;
uniform vec4 u_colors[5];
uniform float u_colorsCount;
uniform float u_softness;
uniform float u_intensity;
uniform float u_noise;

out vec4 fragColor;

vec2 rotate(vec2 v, float a) {
  float s = sin(a), c = cos(a);
  return mat2(c, -s, s, c) * v;
}

float randomR(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float valueNoiseR(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = randomR(i);
  float b = randomR(i + vec2(1.0, 0.0));
  float c = randomR(i + vec2(0.0, 1.0));
  float d = randomR(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

vec4 fbmR(vec2 n0, vec2 n1, vec2 n2, vec2 n3) {
  float amp = 0.2;
  vec4 total = vec4(0.0);
  for (int i = 0; i < 3; i++) {
    n0 = rotate(n0, 0.3);
    n1 = rotate(n1, 0.3);
    n2 = rotate(n2, 0.3);
    n3 = rotate(n3, 0.3);
    total.x += valueNoiseR(n0) * amp;
    total.y += valueNoiseR(n1) * amp;
    total.z += valueNoiseR(n2) * amp;
    total.z += valueNoiseR(n3) * amp;
    n0 *= 1.99;
    n1 *= 1.99;
    n2 *= 1.99;
    n3 *= 1.99;
    amp *= 0.6;
  }
  return total;
}

void main() {
  float t = 0.1 * (u_time + 7.0);
  vec2 shape_uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  vec2 grain_uv = gl_FragCoord.xy / u_pixelRatio;

  // Corners shape with a wavy domain warp: organic glows anchored toward opposite corners.
  vec2 w = shape_uv;
  w += 0.14 * vec2(
    sin(w.y * 2.6 + t * 1.7) + 0.4 * sin(w.y * 5.5 - t * 1.2),
    cos(w.x * 2.6 - t * 1.4) + 0.4 * cos(w.x * 4.8 + t * 1.0)
  );
  w += 0.10 * vec2(snoise(w * 1.4 + t * 0.4), snoise(w * 1.4 - t * 0.35));
  vec2 s = w * 0.84;
  vec2 outer = vec2(0.5);
  vec2 bl = smoothstep(vec2(0.0), outer, s + vec2(0.1 + 0.1 * sin(3.0 * t), 0.2 - 0.1 * sin(5.25 * t)));
  vec2 tr = smoothstep(vec2(0.0), outer, 1.0 - s);
  float shape = 1.0 - bl.x * bl.y * tr.x * tr.y;
  s = -s;
  bl = smoothstep(vec2(0.0), outer, s + vec2(0.1 + 0.1 * sin(3.0 * t), 0.2 - 0.1 * cos(5.25 * t)));
  tr = smoothstep(vec2(0.0), outer, 1.0 - s);
  shape -= bl.x * bl.y * tr.x * tr.y;
  shape = 1.0 - smoothstep(0.0, 1.0, shape);

  // Grain: simplex base modulated by low-frequency FBM, applied to the shape.
  float baseNoise = snoise(grain_uv * 0.5);
  vec4 fbmVals = fbmR(0.002 * grain_uv + 10.0, 0.003 * grain_uv, 0.001 * grain_uv, rotate(0.4 * grain_uv, 2.0));
  float grainDist = baseNoise * snoise(grain_uv * 0.2) - fbmVals.x - fbmVals.y;
  float rawNoise = 0.75 * baseNoise - fbmVals.w - fbmVals.z;
  float noise = clamp(rawNoise, 0.0, 1.0);

  shape += u_intensity * 2.0 / u_colorsCount * (grainDist + 0.5);
  shape += u_noise * 10.0 / u_colorsCount * noise;

  float aa = fwidth(shape);
  shape = clamp(shape - 0.5 / u_colorsCount, 0.0, 1.0);
  float totalShape = smoothstep(0.0, u_softness + 2.0 * aa, clamp(shape * u_colorsCount, 0.0, 1.0));
  float mixer = shape * (u_colorsCount - 1.0);

  int cntStop = int(u_colorsCount) - 1;
  vec4 gradient = u_colors[0];
  gradient.rgb *= gradient.a;
  for (int i = 1; i < 5; i++) {
    if (i > cntStop) break;
    float localT = clamp(mixer - float(i - 1), 0.0, 1.0);
    localT = smoothstep(0.5 - 0.5 * u_softness - aa, 0.5 + 0.5 * u_softness + aa, localT);
    vec4 c = u_colors[i];
    c.rgb *= c.a;
    gradient = mix(gradient, c, localT);
  }

  vec3 color = gradient.rgb * totalShape;
  float opacity = gradient.a * totalShape;
  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  color = color + bgColor * (1.0 - opacity);
  opacity = opacity + u_colorBack.a * (1.0 - opacity);
  fragColor = vec4(color, opacity);
}`

const compile = (gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null => {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

// Bake one grain frame off-DOM and return an object URL for it (or null on failure).
function renderGrain(width: number, height: number, dpr: number): Promise<string | null> {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: false })
  if (!gl) return Promise.resolve(null)

  const vert = compile(gl, gl.VERTEX_SHADER, VERT)
  const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG)
  if (!vert || !frag) return Promise.resolve(null)
  const program = gl.createProgram()
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.bindAttribLocation(program, 0, "a_pos")
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return Promise.resolve(null)
  gl.useProgram(program)

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  const u = (name: string) => gl.getUniformLocation(program, name)
  gl.uniform2f(u("u_resolution"), width, height)
  gl.uniform1f(u("u_pixelRatio"), dpr)
  gl.uniform4f(u("u_colorBack"), 0, 0, 0, 0)
  gl.uniform1f(u("u_colorsCount"), STOP_TOKENS.length)
  gl.uniform1f(u("u_softness"), SOFTNESS)
  gl.uniform1f(u("u_intensity"), INTENSITY)
  gl.uniform1f(u("u_noise"), GRAIN)
  gl.uniform1f(u("u_time"), FRAME_TIME)

  // Resolve the oklch --chart-* tokens to sRGB via a 1x1 2D canvas, so the grain matches them exactly.
  const swatch = document.createElement("canvas")
  swatch.width = 1
  swatch.height = 1
  const swatchCtx = swatch.getContext("2d", { willReadFrequently: true })
  const styles = getComputedStyle(document.documentElement)
  const flat: number[] = []
  for (const token of STOP_TOKENS) {
    let r = 0,
      g = 0,
      b = 0
    if (swatchCtx) {
      swatchCtx.fillStyle = "#000"
      swatchCtx.fillStyle = styles.getPropertyValue(token).trim()
      swatchCtx.fillRect(0, 0, 1, 1)
      const d = swatchCtx.getImageData(0, 0, 1, 1).data
      r = d[0] / 255
      g = d[1] / 255
      b = d[2] / 255
    }
    flat.push(r, g, b, STOP_ALPHA)
  }
  gl.uniform4fv(u("u_colors"), new Float32Array(flat))

  gl.viewport(0, 0, width, height)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawArrays(gl.TRIANGLES, 0, 3)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vert)
      gl.deleteShader(frag)
      resolve(blob ? URL.createObjectURL(blob) : null)
    }, "image/png")
  })
}

export function GrainGradient({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme()
  const [url, setUrl] = useState<string | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer = 0

    const bake = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const scale = Math.min(1, MAX_SIDE / (Math.max(window.innerWidth, window.innerHeight) * dpr))
      const w = Math.max(1, Math.round(window.innerWidth * dpr * scale))
      const h = Math.max(1, Math.round(window.innerHeight * dpr * scale))
      renderGrain(w, h, dpr * scale).then((next) => {
        if (cancelled || !next) {
          if (next) URL.revokeObjectURL(next)
          return
        }
        if (urlRef.current) URL.revokeObjectURL(urlRef.current)
        urlRef.current = next
        setUrl(next)
      })
    }

    bake()
    // Re-bake at the new aspect after a resize settles, so the corner glows stay in place.
    const onResize = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(bake, 250)
    }
    window.addEventListener("resize", onResize)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      window.removeEventListener("resize", onResize)
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
  }, [])

  const theme = resolvedTheme === "light" ? "light" : "dark"

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none fixed inset-0 bg-cover bg-center",
        "motion-safe:transition-opacity motion-safe:duration-1000 motion-safe:ease-in-out",
        className,
      )}
      style={{
        zIndex: -1,
        backgroundImage: url ? `url(${url})` : undefined,
        opacity: url ? OPACITY[theme] : 0,
      }}
    />
  )
}
