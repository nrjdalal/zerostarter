// takumi-js (via @takumi-rs/image-response) calls Promise.withResolvers
// at OG-image request time. Next 16 prerender workers on ubuntu-latest CI
// can land on Node <22, which lacks the API. Imported for side effect by
// every OG route before takumi. No-op on Bun and Node 22+.
if (typeof Promise.withResolvers !== "function") {
  Promise.withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}
