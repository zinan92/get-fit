# API boundary

The deployable API entrypoint is `worker/index.ts`. Route handlers and provider
adapters live in `server/api/`; this directory is reserved for future API-only
fixtures and edge-specific adapters so the WeChat client never owns secrets.

The API is single-coach by design in V1. It must fail closed when a plan is not
validated and must never expose a draft to the client mini-program.
