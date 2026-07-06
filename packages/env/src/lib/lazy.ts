// Defers createEnv (and its validation) to first property access, so importing a lazy env never validates; the owner validates on first read at runtime.
export function lazyEnv<T extends object>(create: () => T): T {
  let cached: T | undefined
  const resolve = () => (cached ??= create())

  return new Proxy({} as T, {
    get: (_, key, receiver) => Reflect.get(resolve(), key, receiver),
    has: (_, key) => Reflect.has(resolve(), key),
    ownKeys: () => Reflect.ownKeys(resolve()),
    getOwnPropertyDescriptor: (_, key) => {
      const descriptor = Reflect.getOwnPropertyDescriptor(resolve(), key)
      // The proxy target is an empty object, so a real key must be reported configurable to satisfy the invariant.
      if (descriptor) descriptor.configurable = true
      return descriptor
    },
  })
}
