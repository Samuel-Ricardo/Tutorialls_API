# ADR-0003 — Cache-aside with Redis and outbound events on RabbitMQ

- **Status:** accepted, **partially defective** — see [docs/security.md §C2](../security.md#c2) and [docs/architecture.md §9](../architecture.md#9-caching--events)
- **Date:** 2024-08-20 (inferred from git history, commits `2cc6592`/`9bf5ac3` for Redis, `2042a45`/`820327d` for RabbitMQ) · documented 2026-08-17

## Context

Reads dominate the tutorial resource (list/filters); writes must notify downstream consumers (no consumer existed at design time, but the product page advertises event-driven extensibility). The project adopted **Redis for read-side caching** and **RabbitMQ for write-side event emission**, both injectable through Nest's cache-manager and microservices clients.

## Decision

- **Reads:** cache-aside per operation — keys `tutorial:{op}:{limit}:{page}`; on miss, execute the use case → repository → DB, then `cache.set`.
- **Writes:** every create/update/delete emits `ITutorialUpdatedEvent` to the `tutorials_queue` RabbitMQ queue (create/update carry the full DTO; delete emits an empty payload).
- Lifecycle: `TutorialService.onModuleInit` connects the RMQ client; `onModuleDestroy` closes it.

## Consequences

**Positive**

- Infrastructure isolation: cache and broker are behind service/use-case contracts; the rest of the app is unaware.
- Writes are observable — any future consumer (search index, audit log, notifications) can subscribe without code changes to the API.

**Negative (defects tracked)**

- **Cache is checked after the use case already queried the DB** on all four read paths — caching currently saves no DB work.
- **No invalidation** on create/update/delete → stale reads until TTL; and the TTL is misconfigured (`CACHE_TTL` read vs `REDIS_TTL` defined → effectively `undefined`).
- **Cache-hit shape mismatch**: cached results serialize entity instances exposing the private `autor` field instead of `author` — cache hits differ from misses.
- **Queue name hardcoded** (`'tutorials_queue'` in `tutorial.service.ts:31`) while `RABBITMQ_QUEUE` env is configured — env contract ignored.
- **No consumer exists**; `app.startAllMicroservices()` registers nothing — events are fire-and-forget.

**Follow-ups (roadmap)**

- Read cache first (or drop caching); cache `toDTO()` output, not entities.
- Invalidate on mutations; align TTL env names.
- Emit to the env-configured queue; document/guarantee at-least-once semantics if consumers appear.
- Add the first consumer (e.g. audit log) to prove the event path end-to-end.
