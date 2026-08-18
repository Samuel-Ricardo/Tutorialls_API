# Testing — Tutorialls API

> Audience: QA engineers, developers running or extending the test suite
> Status: **honest snapshot** — the suite is structure-heavy, security-critical areas are untested, and the local runner is currently broken (repair steps below).

---

## Table of contents

- [1. Test strategy](#1-test-strategy)
- [2. Test inventory](#2-test-inventory)
- [3. How to run](#3-how-to-run)
- [4. Current execution status](#4-current-execution-status)
- [5. Coverage gaps](#5-coverage-gaps)
- [6. e2e assessment](#6-e2e-assessment)
- [7. Test quality findings](#7-test-quality-findings)
- [8. Definition of Done assessment](#8-definition-of-done-assessment)
- [9. QA roadmap](#9-qa-roadmap)

---

## 1. Test strategy

The suite follows the standard NestJS split:

| Scope | Runner config | Location | What it covers today |
| --- | --- | --- | --- |
| Unit/component | jest (package.json: `rootDir: src`, `testRegex: .*\.spec\.ts$`) | `tutorialls/src/**/*.spec.ts` | Service/controller delegation, mocks for infra |
| e2e | jest (`test/jest-e2e.json`, `testRegex: .e2e-spec.ts$`) | `tutorialls/test/**/*.e2e-spec.ts` | HTTP-level flows; **requires live PostgreSQL/Redis/RabbitMQ** (boots full `AppModule`, which connects to RabbitMQ in `TutorialService.onModuleInit`) |
| Staged | `npm run test:staged` — jest `--passWithNoTests --findRelatedTests --coverage` | run via lint-staged on staged `*.ts` (hook currently inert, see [docs/devops.md](devops.md#4-husky--lint-staged)) | — |

Coverage is collected (`collectCoverageFrom: **/*.(t|j)s`, output `tutorialls/coverage/`) but **no thresholds are configured** anywhere — neither in jest config, CI, nor lint-staged.

---

## 2. Test inventory

### 2.1 Unit tests — 9 spec files, 36 `it()` cases

| Spec file | Target (SUT) | Cases | Isolation | What it actually asserts | Verdict |
| --- | --- | --- | --- | --- | --- |
| `src/app.controller.spec.ts` | `AppController` + `AppService` | 1 | real `AppService` | `getHello() === 'Hello World!'` | Boilerplate, zero business value |
| `src/application/auth/auth.service.spec.ts` | `JwtAuthService` | 2 | use-case fakes | Delegates to generate/validate use cases; happy path only | OK delegation proof; no invalid-token/error path |
| `src/application/encryption/encryption.service.spec.ts` | `NodeEncryptionService` | 3 | use-case fakes | Delegation + "should be defined" | Real crypto (encrypt/decrypt use cases) untested — 0% |
| `src/application/tutorial/tutorial.controller.spec.ts` | `TutorialController` | 8 | service fake | Delegation calls only; no status/response/auth assertions; `JwtAuthGuard` never exercised | Wiring proof only |
| `src/application/tutorial/tutorial.service.spec.ts` | `TutorialService` | 8 | use-case fakes + `CACHE_MANAGER` + RabbitMQ fakes | Delegation to use cases only; cache get/set and `emit()` mocks never asserted | Misses the only real logic (cache + events) |
| `src/application/users/user.service.spec.ts` | `UserService` | 6 | all policies/use cases/auth mocked | Duplicate-user (409), user-not-found (404), invalid-password (401), token happy path | **Best spec** — meaningful, covers error paths |
| `src/application/users/users.controller.unit.spec.ts` | `UsersController` | 5 | service + **both pipes mocked away** | Delegation + return shape | Real pipe chain (Decrypt + Zod) untested at this level |
| `src/application/users/middleware/security/security.middleware.spec.ts` | `SecurityMiddleware` | 2 | encryption service fake | Asserts `next('encrypted-user-data')` — Express treats a `next(err)` argument as an error; the middleware is also dead code (never registered) | **Tests wrong behavior** |
| `src/application/users/pipe/validation/zod/zod.pipe.spec.ts` | `ZodValidationPipe` | 1 | — | `new ZodValidationPipe(z.object({}))` with **no assertion** | Vacuous — passes always |

### 2.2 Isolation summary

- Prisma **never** touches a real DB in unit tests — repository/policy/use-case layers are mocked at service/controller level. Good isolation, but persistence itself is **0% tested** (no `prisma-mock`, no in-memory adapter).
- No `@nestjs/testing` compile of the full `AppModule` in the unit suite; the DI graph is only exercised via e2e.

### 2.3 e2e tests — 3 files, 7 `it()` cases

| File | Cases | Verdict |
| --- | --- | --- |
| `test/app.e2e-spec.ts` | 1 (GET /) | Smoke only; boots full `AppModule` → needs live infra |
| `test/application/users/users.controller.e2e-spec.ts` | 2 | signup with `password: '12345'` expects **201** (Zod requires min 8 → 400); login expects **500** — asserts a broken state as expected behavior |
| `test/application/users/users.controller.intgration.e2e-spec.ts` | 4 | 3 of 4 expectations mismatch the implementation (see §6) |

---

## 3. How to run

All commands run inside `tutorialls/` (the app folder — it holds `package.json`).

### 3.1 Repair the runner first

The installed `node_modules` is corrupted: `jest-cli@29.7.0` has no `build/` folder, and `npm test` fails with `Cannot find module '…\node_modules\jest-cli\build\index.js'` (verified 2026-08-17). Repair:

```bash
# from tutorialls/
npm ci
```

`npm ci` restores a clean, lockfile-exact install (≈ 1–2 minutes). Do not skip this and report "tests pass".

### 3.2 Commands

```bash
npm test          # unit/component suite (jest, rootDir: src)
npm run test:cov  # unit suite with coverage report → tutorialls/coverage/
npm run test:e2e  # e2e suite — REQUIRES the docker-compose stack (Postgres/Redis/RabbitMQ)
npm run test:watch  # watch mode
```

### 3.3 Infrastructure for e2e

```bash
# from tutorialls/
docker compose up -d postgres redis rabbitmq   # bring up infra only
npm run test:e2e
```

> Note: e2e expects a reachable Prisma schema (run `npx prisma migrate deploy` first) and a clean/shared DB state — there is no setup/teardown, no DB reset, and no testcontainers, so duplicate-email runs can be flaky (409).

### 3.4 CI note

GitHub Actions (`docker-publish.yml`) has **no dedicated test job** — lint + unit tests run inside the Docker image build via `npm run build:docker` (`format → lint → test → nest build`), and artifacts are discarded. `test:e2e` is never invoked in CI.

---

## 4. Current execution status

| Command | Status | Detail |
| --- | --- | --- |
| `npm test` | ❌ BLOCKED | `jest-cli` build folder missing — repair with `npm ci` |
| `npm run test:cov` | ❌ BLOCKED | same root cause |
| `npm run test:e2e` | ❌ BLOCKED | same root cause + requires live infra |
| Coverage % | ⛔ Not measurable | no runner, no coverage artifact in repo |

**Do not treat the suite as green** until `npm ci` has been run and the numbers below are re-captured.

---

## 5. Coverage gaps

### 5.1 Untested source files (by risk)

| Area / file | Risk | Why it matters |
| --- | --- | --- |
| `application/auth/guards/jwt.guard.ts`, `local.guard.ts` | 🔴 Critical | Auth enforcement on 6/7 tutorial routes |
| `application/auth/strategy/jwt/jwt.strategy.ts` | 🔴 Critical | Known defect by inspection: `validate()` returns `{ userId: payload.sub, username: payload.username }` but tokens are signed with `{ id, email, password }` → `sub` is `undefined`. Untested, ships broken |
| `application/auth/strategy/local/local.strategy.ts` | 🔴 High | Passport local path (dead code, but wired in the module) |
| `application/auth/use_case/{generate,validate}_token.use_case.ts` | 🔴 High | JWT sign/verify — no expiry/malformed-token tests |
| `application/encryption/use_case/user/encrypt.use_case.ts` | 🔴 High | IV reuse (defect by inspection); no round-trip or tamper tests |
| `application/encryption/use_case/user/decrypt.use_case.ts` | 🔴 High | Malformed `ciphertext` → uncaught parse error → 500 |
| `application/users/pipe/encryption/encryption.pipe.ts` | 🔴 High | `value.ciphertext` access crashes when the body is `undefined` → 500 instead of 400 |
| `application/users/policy/*.policy.ts` (3 files) | 🔴 High | Business rules (duplicate detection, bcrypt compare) — 0% |
| `application/users/repository/prisma/user.repository.ts` | 🔴 High | Only DB touchpoint for users; `findById` is a throwing stub |
| `application/tutorial/repository/prisma/tutorial.repositiry.ts` | 🔴 High | Pagination math (`(page-1)*limit`), `count()` queries, case-insensitive filters — 0% |
| `exception.filter.ts` | 🔴 High | Double response write risk; untested |
| `application/users/use_case/{signup,hash_password}.use_case.ts` | 🟠 Medium | Hash-rounds config untested; input mutation in `hashPassword.execute(user)` |
| `application/users/validation/zod/user/*.schema.ts` | 🟠 Medium | The **only** request validation; e2e uses passwords violating `min(8)` |
| `application/tutorial/use_case/**` (7 files) | 🟠 Medium | Thin delegation, but no repository contract tests |
| `infra/**` (prisma service, env service, bcrypt engine) | 🟠 Medium | Missing env vars → `undefined` keys passed to JWT/crypto silently |
| `internal/lib/error/**` | 🟠 Medium | Error contract (`toStruct`, status mapping) |
| `main.ts`, `app.module.ts`, `app.registry.ts`, domain entities/DTOs | 🟢 Low | Boilerplate/config |

### 5.2 Covered by any test

`app.controller/app.service` · `JwtAuthService` (delegation) · `NodeEncryptionService` (delegation) · `TutorialController/Service` (delegation) · `UserService` · `UsersController` (delegation) · `SecurityMiddleware` (wrong semantics) · `ZodValidationPipe` (vacuous).

**Overall statement-coverage estimate: ~30–40%** of `src/`; crypto, auth strategies/guards, repositories, policies, and the exception filter are effectively 0%.

---

## 6. e2e assessment

| File | Tests | Against real impl | Verdict |
| --- | --- | --- | --- |
| `test/app.e2e-spec.ts` | 1 | requires full AppModule boot → Prisma + RabbitMQ connect | Smoke; not runnable without the docker stack |
| `test/application/users/users.controller.e2e-spec.ts` | 2 | `POST /user/signup` with `password: '12345'` **expects 201**, Zod requires `min(8)` → would be 400; `POST /user/login` **expects 500** — asserts a broken state | Contradicts implementation |
| `test/application/users/users.controller.intgration.e2e-spec.ts` | 4 | signup `'12345'` → 400 not 201; invalid email/password → 400 (OK); login `'12345'` → 400 not 200; wrong creds → implementation returns **404** `UserNotFoundError`, spec expects **401** | 3 of 4 expectations mismatch |

**Missing e2e coverage:** tutorial CRUD (guard 401 path, create/update/delete, pagination, filters), duplicate-user 409, validation-failure 400 path, and any cleanup/isolation strategy.

---

## 7. Test quality findings

1. **Vacuous test** — `zod.pipe.spec.ts` instantiates and asserts nothing.
2. **Trivial mocks** — controller/service specs assert delegation only; the only real behavior in `TutorialService` (cache hit/miss, RabbitMQ `emit`) is never asserted; cache-key collisions are invisible.
3. **Wrong-behavior test** — `security.middleware.spec.ts` locks in `next(encryptedString)` (Express error semantics) for dead code.
4. **Naming** — `user.service.spec` uses behavior sentences (good); others use "should be defined" ×5 (bad).
5. **Missing edge cases** — missing body, malformed ciphertext, expired/invalid JWT, duplicate email at e2e level, Zod failures at unit level, pagination boundaries (`page=0`, negative, huge `limit`), not-found tutorial, RabbitMQ/Redis down, missing env vars.
6. **No coverage thresholds** anywhere; `--passWithNoTests` can silently skip.
7. **Dead/hybrid code in the suite** — `local.strategy`/`local.guard` and `SecurityMiddleware` specs exercise code no route uses.

---

## 8. Definition of Done assessment

| DoD criterion | Status |
| --- | --- |
| Tests execute and pass | ❌ Blocked — runner broken locally; no dedicated CI test job |
| Tests meaningful (assert behavior, not mocks) | ❌ Mostly delegation-proof; 1 vacuous; 1 wrong-behavior |
| 80%+ coverage on critical paths (auth, crypto, persistence, caching) | ❌ Auth/strategy/guards/JWT 0%; crypto 0%; repositories 0%; cache branch 0%; ~30–40% overall |
| e2e coverage of guarded business flows | ❌ 7 e2e tests, 3–5 contradict the implementation, require manual infra, not in CI |
| Edge cases covered (validation, auth failure, duplicate, not-found) | ⚠️ Unit-level for `UserService` only; integration expectations wrong |
| Quality gates enforce coverage | ❌ No thresholds; `--passWithNoTests` |

### QA verdict: ❌ NOT READY — REJECT

Justification:

1. The suite cannot execute in the current environment (broken `jest-cli` install) — [verified].
2. The single most security-critical path — JWT auth — is untested **and** broken by inspection (claim mismatch between strategy and token).
3. The e2e suite contains expectations contradicted by the implementation and cannot run without manual infrastructure.
4. No coverage is measured, enforced, or reported anywhere.
5. Existing tests are predominantly delegation-proofs; the real logic (cache, events, crypto, persistence, validation) is untested.

This is a **hardening target, not a statement about the codebase's potential** — the architecture lends itself well to testing once the environment and expectations are aligned.

---

## 9. QA roadmap

**Minimum path to approve**

1. Repair the environment (`npm ci`); re-run `npm test`, `npm run test:cov`, `npm run test:e2e`; capture counts + coverage as evidence.
2. Fix and test: JWT strategy + generate/validate use cases (unit), encryption round-trip + tamper tests, `ZodValidationPipe` (input classes), `DecryptUserPipe` (missing body), exception filter (single write).
3. Correct e2e expectations to the implementation contract (or fix the implementation — see [docs/security.md](security.md) §4), add guarded tutorial e2e flows, move to isolated DBs (testcontainers or `prisma-mock` at unit level).
4. Add coverage thresholds (≥ 80% statements/branches on `application/**` + `infra/**`) and a GitHub Actions test job that fails below threshold; remove `--passWithNoTests`.
5. Remove dead code (`SecurityMiddleware`, `LocalStrategy`/`LocalAuthGuard`, `findById` stub, `a.js`) and the `console.log` of request bodies.

**Medium term**

- Property/round-trip tests for crypto (encrypt → decrypt → identity).
- Contract tests for the error model (shape + status per domain error).
- Performance sanity tests for pagination (unbounded `limit` is a DoS vector on the public route).
- Coverage reporting artifact published from CI (e.g. Codecov) so trends are visible.

---

*Evidence set: 9 unit specs + 3 e2e specs, `package.json` jest config, `.lintstagedrc.json`, `.husky/pre-commit`, `.github/workflows/docker-publish.yml`, `Dockerfile` — compiled 2026-08-17. Raw appendix: [`docs/_drafts/03-qa-analysis.md`](_drafts/03-qa-analysis.md).*
