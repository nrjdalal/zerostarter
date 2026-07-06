// Wraps a createEnv factory so validation runs on first property access, not at import. A build tool (tsdown) that only imports a lazy env never triggers validation, so building a package does not require that package's runtime variables; the owning code validates them when it actually reads the env.
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
