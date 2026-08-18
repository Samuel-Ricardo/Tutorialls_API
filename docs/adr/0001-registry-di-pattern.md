# ADR-0001 — Centralized string-token DI registry

- **Status:** accepted (retrospective — pattern shipped with the codebase)
- **Date:** 2024-08-20 (inferred from git history) · documented 2026-08-17
- **Related:** [docs/architecture.md §5](../architecture.md#5-the-di-registry-pattern)

## Context

The application needed dependency-inversion wiring that lets feature implementations be swapped (e.g. Prisma repository → in-memory double) without touching consumers, while keeping a single source of truth for provider names across modules.

Class tokens satisfy this in NestJS, but the project chose **string tokens organized in nested registry objects** (`*.registry.ts` files aggregating into `src/app.registry.ts`), with consumers injecting via `@Inject(MODULE.X.Y)` typed against `domain/` interfaces.

## Decision

- Every feature folder ships a `*.registry.ts` exporting a plain object tree of string tokens such as `MODULE::AUTH::USE_CASE::TOKEN::GENERATE`.
- `src/app.registry.ts` aggregates all feature registries into one `MODULE` object imported everywhere.
- Modules bind implementations with `{ provide: MODULE.X.Y, useClass: Impl }`; exports re-declare the bound provider for cross-module consumption.
- Consumers depend on `domain/` interfaces and never on concrete classes.

## Consequences

**Positive**

- Strict dependency inversion: swapping an implementation is a one-line `useClass`/`useValue` change.
- Trivial test doubles: specs override tokens with `useValue` fakes.
- Single constant tree for token names; consistent naming encodes the nesting path.

**Negative**

- Token strings are **runtime-only** — a typo fails at bootstrap, not compile time; several tokens already drifted (use-case tokens prefixed `POLICY`, `…::HASH_PASSWORD` mislabels, `ENCRYTION_REGISTRY`/`auth.regsitry.ts` filename typos).
- Tracing a binding requires four files (consumer → module → registry → hub).
- `exports` re-declarations can diverge from internal bindings.

**Follow-ups (tracked on the roadmap)**

- Add an ArchUnit-style spec that walks `MODULE` and asserts every token resolves in the container.
- Rename typo'd tokens/files in a coordinated pass; consider class tokens for the common path while keeping `domain/` interfaces as the contract layer.
