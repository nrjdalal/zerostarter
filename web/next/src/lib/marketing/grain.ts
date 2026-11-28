// A software renderer draws each grain frame on the CPU, which blocks the main thread; a hidden renderer string (null) keeps the grain on.
export const skipsGrain = (renderer: string | null) =>
  renderer !== null && /swiftshader|llvmpipe|software/i.test(renderer)
