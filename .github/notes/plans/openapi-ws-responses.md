# OpenAPI: WS upgrade route lists inapplicable 429/500 responses

- Status: backlog
- Links: #664; subsumed by [api-envelope-typed-endpoint](api-envelope-typed-endpoint.md) (can ship independently as the smaller fix)

The WebSocket upgrade route `/api/health/ws` shows `application/json` 429/500 error-envelope responses in Scalar alongside its `101`, because `openAPIRouteHandler`'s `defaultOptions.GET`/`POST` inject the global error responses onto every GET, the WS upgrade included. Cosmetic doc-accuracy only (the 429 is actually reachable; the 500 is the shared default). Options: leave it, add a per-route opt-out, spread `globalErrorResponses` explicitly per route, or drop `/health/ws` from the spec.
