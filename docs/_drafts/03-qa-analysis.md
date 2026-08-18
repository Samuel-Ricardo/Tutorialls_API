# 03 — QA Analysis: Tutorialls API (NestJS)

**Date:** 2026-08-17 · **Author:** Carla (QA Engineer)
**Scope:** `tutorialls/` (nested NestJS app at repo root `Tutorialls_API/`)
**Method:** software-testing-qa skill (evidence-weighted, adversarial). All claims labeled: `[Verified]`, `[Assumption]`, `[Blocked]`, `[Unverified]`.

---

## 1. Evidence Ledger

| # | Claim | Label | Source / Access |
|---|-------|-------|-----------------|
| E1 | Jest suite (`npm test`) cannot run: `Cannot find module '...node_modules\jest-cli\build\index.js'` — `jest-cli/build/` directory physically absent | **[Verified]** | `npm test` run 2026-08-17, exit 1; `dir /a node_modules\jest-cli` |
| E2 | `npm run test:cov` fails with same missing-module error (jest-cli entry point) | **[Verified]** | `npm run test:cov` run 2026-08-17 |
| E3 | node_modules present (554 top-level dirs) but corrupted/partial (jest-cli 29.7.0 without `build/`) | **[Verified]** | package-lock → jest 29.7.0; filesystem listing |
| E4 | 9 unit spec files, **36** `it()` cases; 3 e2e files, **7** `it()` cases → 43 tests total | **[Verified]** | grep counts of `^\s*it\(` per file |
| E5 | No `coverage/` directory anywhere in repo → no historical coverage evidence | **[Verified]** | filesystem |
| E6 | Prisma client generated (`node_modules/.prisma/client/index.js` exists) | **[Verified]** | filesystem |
| E7 | Docker daemon not running; docker-compose (postgres/redis/rabbitmq) is the documented infra path | **[Verified]** | `docker ps` failed: pipe not found; `docker-compose.yaml` |
| E8 | Toolchain: NestJS ^10, Jest ^29.5 (locked 29.7.0), ts-jest 29.2.4, Prisma ^5.18, TS ^5.1.3, Node 20 (Dockerfile) | **[Verified]** | package.json / package-lock |
| E9 | CI: `.github/workflows/docker-publish.yml` has no test job; tests only run inside `Dockerfile` via `npm run build:docker` (= format + lint + test + build), artifacts discarded | **[Verified]** | workflow + Dockerfile |
| E10 | Husky pre-commit → lint-staged → `npm run test:staged` (jest `--findRelatedTests --coverage`, `--passWithNoTests`); no threshold enforcement | **[Verified]** | `.husky/pre-commit`, `.lintstagedrc.json`, package.json |
| E11 | e2e would require live Postgres/Redis/RabbitMQ (AppModule boots Prisma + RabbitMQ connect in `TutorialService.onModuleInit`) — infeasible today | **[Assumption]** | module wiring inspection |
| E12 | Overall statement coverage estimate **~30–40%** of `src/`, branch coverage lower; crypto/auth/persistence ≈ 0% | **[Assumption]** | static mapping of 9 spec files vs ~95 src files |

---

## 2. Test Inventory — Unit/Component (9 spec files, 36 tests)

| Spec file | Target (SUT) | Tests | Isolation (mocked deps) | What it actually asserts | Verdict |
|---|---|---|---|---|---|
| `src/app.controller.spec.ts` | `AppController` + `AppService` | 1 | Real AppService | `getHello() === 'Hello World!'` | ❌ Boilerplate, zero business value |
| `src/application/auth/auth.service.spec.ts` | `JwtAuthService` | 2 | Use-case fakes | Delegates to generate/validate use cases; happy path only | ⚠️ OK delegation proof; no invalid-token/error path |
| `src/application/encryption/encryption.service.spec.ts` | `NodeEncryptionService` | 3 | Use-case fakes | Delegation + "should be defined" | ⚠️ Real crypto (encrypt/decrypt use cases) untested — 0% |
| `src/application/tutorial/tutorial.controller.spec.ts` | `TutorialController` | 8 | Service fake | Delegation calls only; **no status/response/auth assertions; `JwtAuthGuard` never exercised** | ⚠️ Wiring proof only |
| `src/application/tutorial/tutorial.service.spec.ts` | `TutorialService` | 8 | Use-case fakes + CACHE_MANAGER + RabbitMQ fakes | Delegation to use cases only; **cache get/set and `emit()` mocks never asserted → cache hit branch & event emission = 0% coverage** | ⚠️ Misses the only real logic (cache + events) |
| `src/application/users/user.service.spec.ts` | `UserService` | 6 | All policies/use cases/auth mocked | ✅ Best spec: duplicate-user (409), user-not-found (404), invalid-password (401), token happy path | ✅ Meaningful, covers error paths |
| `src/application/users/users.controller.unit.spec.ts` | `UsersController` | 5 | Service + **both pipes mocked away** | Delegation + return shape | ⚠️ Real pipe chain (Decrypt+Zod) untested at this level |
| `src/application/users/middleware/security/security.middleware.spec.ts` | `SecurityMiddleware` | 2 | Encryption service fake | Asserts `next('encrypted-user-data')` — **cements a bug**: Express `next(err)` treats the encrypted payload as an error; middleware is also dead code (never registered in `UsersModule`) | ❌ Tests wrong behavior |
| `src/application/users/pipe/validation/zod/zod.pipe.spec.ts` | `ZodValidationPipe` | 1 | — | `new ZodValidationPipe(z.object({}))` with **no assertion** — vacuous test, passes always | ❌ Zero value |

### Isolation summary
- Prisma **never** hits a real DB in unit tests — all repository/policy/use-case layers are mocked at service/controller level. Good isolation, but persistence layer itself is **0% tested** (no `prisma-mock`, no in-memory adapter).
- No `@nestjs/testing` compile of full `AppModule` in unit suite; no DI-graph verification except e2e.

---

## 3. Execution Results

| Command | Result | Detail |
|---|---|---|
| `npm test` | ❌ **BLOCKED — exit 1** | `Error: Cannot find module 'C:\...\tutorialls\node_modules\jest-cli\build\index.js'` |
| `npm run test:cov` | ❌ **BLOCKED — exit 1** | Same jest-cli entry-point failure |
| `npm run test:e2e` | ❌ **BLOCKED (same root cause)** | Same runner; additionally would need Postgres/Redis/RabbitMQ (E7, E11) |
| Coverage % | ⛔ **Not measurable** | No runner, no coverage artifact (E5) |

**Do not treat as green.** The environment install is corrupted: `jest-cli@29.7.0` lacks its `build/` folder (package.json `main: ./build/index.js` → module resolution fails). A repair (`npm ci` / reinstall, ~1–2 min, needs authorization) is required before any suite can be executed. GitHub Actions `docker-publish.yml` has no test job; tests run only inside the Docker image build (`npm run build:docker`) with artifacts discarded (E9) — CI is effectively blind to coverage too.

---

## 4. Coverage Gap Map — Untested Source Files

| File (relative to `tutorialls/src/`) | Risk | Why it matters |
|---|---|---|
| `application/auth/guards/jwt.guard.ts`, `guards/local.guard.ts` | 🔴 CRITICAL | Auth enforcement on tutorial routes; JwtAuthGuard applied to 6/7 routes |
| `application/auth/strategy/jwt/jwt.strategy.ts` | 🔴 CRITICAL | **Known defect by inspection:** `validate()` returns `{ userId: payload.sub, username: payload.username }` but `use_case/generate_token.use_case.ts` signs `{ id, email, password }` → `payload.sub` is `undefined`. JWT-protected routes resolve `userId` to nothing. Untested, ships broken |
| `application/auth/strategy/local/local.strategy.ts` | 🔴 HIGH | Passport local auth path |
| `application/auth/use_case/generate_token.use_case.ts`, `validate_token.use_case.ts` | 🔴 HIGH | JWT sign/verify — no expiry/malformed-token tests |
| `application/encryption/use_case/user/encrypt.use_case.ts` | 🔴 HIGH | **Defect by inspection:** `iv = randomBytes(16)` generated once at construction and **reused for every message** (IV reuse); no tests for round-trip, tampered ciphertext, or missing `ENCRYPT_KEY` |
| `application/encryption/use_case/user/decrypt.use_case.ts` | 🔴 HIGH | Parse errors on malformed `ciphertext` → uncaught (500) |
| `application/users/pipe/encryption/encryption.pipe.ts` | 🔴 HIGH | **Defect by inspection:** `transform(value)` accesses `value.ciphertext` — if body is `undefined` (missing body), TypeError → 500 instead of 400 |
| `application/users/policy/alredy_exists.policy.ts`, `should_exists.policy.ts`, `password_should_be_valid.policy.ts` | 🔴 HIGH | Business rules (duplicate-user detection, bcrypt compare) — 0% |
| `application/users/repository/prisma/user.repository.ts` | 🔴 HIGH | Only DB touchpoint for users; `findById` is `throw new Error('Method not implemented')` — dead code shipped |
| `application/users/use_case/signup.use_case.ts`, `hash_password.use_case.ts` | 🟠 MED | Hash rounds config untested; structural DTO misuse (`hashPassword.execute(user)` passes whole user object, `user.password` mutated in place) |
| `application/users/validation/zod/user/signup.schema.ts`, `login.schema.ts` | 🟠 MED | The **only** request validation; e2e uses passwords that violate `min(8)` |
| `application/users/middleware/security/security.middleware.ts` | 🟠 MED | Dead code + `console.log({body})` leaks credentials in logs + wrong `next(err)` semantics |
| `application/tutorial/use_case/create|update|delete|filter/*|list/all.use_case.ts` (7 files) | 🟠 MED | Delegation thin, but no repository contract tests |
| `application/tutorial/repository/prisma/tutorial.repositiry.ts` | 🔴 HIGH | Pagination math (`(page-1)*limit`), `count()` queries, case-insensitive filters — 0% |
| `infra/engine/database/prisma/prisma.service.ts`, `prisma.module.ts` | 🟠 MED | DB lifecycle |
| `infra/config/env/env.service.ts`, `config.module.ts` | 🟠 MED | Missing env vars → `undefined` keys passed to JWT/crypto silently |
| `exception.filter.ts` | 🔴 HIGH | **Risk by inspection:** writes `response.status().json()` then calls `super.catch()` → double response handling ("headers already sent" risk); untested |
| `internal/lib/error/*` (AppError, 4×) | 🟠 MED | Error contract (`toStruct`, http.cat URL) |
| `main.ts`, `app.module.ts`, `app.registry.ts`, `infra/engine/hashing/bcrypt.engine.ts`, domain entities/DTOs/interfaces | 🟢 LOW | Boilerplate/config |

**Covered by any test:** `app.controller/app.service`, `JwtAuthService` (delegation), `NodeEncryptionService` (delegation), `TutorialController/Service` (delegation), `UserService`, `UsersController` (delegation), `SecurityMiddleware` (wrong semantics), `ZodValidationPipe` (vacuous).

---

## 5. e2e Assessment (`test/`)

| File | Tests | Against real impl | Verdict |
|---|---|---|---|
| `test/app.e2e-spec.ts` | 1 (GET /) | Requires full AppModule boot → Prisma + RabbitMQ `onModuleInit` connect → needs live infra | ⚠️ Smoke only; not runnable without docker stack |
| `test/application/users/users.controller.e2e-spec.ts` | 2 | `POST /user/signup` with `password: '12345'` **expects 201 but Zod schema requires `min(8)`** → would get 400 ❌; `POST /user/login` **expects 500** — asserts a broken state instead of fixing it ❌ | ❌ Contradicts implementation; asserts failure as expected behavior |
| `test/application/users/users.controller.intgration.e2e-spec.ts` (typo: "intgration") | 4 | signup `'12345'` → 400 not 201 ❌; invalid email/password → 400 ✅; login `'12345'` → 400 not 200 ❌; wrong creds → **404 `UserNotFoundError`, test expects 401** ❌ | ❌ 3 of 4 expectations mismatch current implementation |
| `test/jest-e2e.json` | — | No setup/teardown, no DB reset, no coverage, no testcontainers, no timeout tuning; DB state shared → duplicate-email runs flaky (409) | ⚠️ Missing infra isolated e2e |

**e2e gaps:** no tutorial endpoints e2e (JWT guard 401 path, CRUD, pagination, filters) despite them being the guarded surface; no duplicate-user e2e; no validation 400 e2e; no cleanup/isolation; no CI job runs `test:e2e`.

---

## 6. Test Quality Findings (adversarial pass)

1. **Vacuous test:** `zod.pipe.spec.ts` — instantiates and asserts nothing.
2. **Trivial mocks:** controller/service specs assert delegation only; the *only* behavior in `TutorialService` (cache hit/miss, RabbitMQ `emit`) is never asserted; cache-key bug invisible (`cacheKey('filterByTitle', DTO)` → `[object Object]`-style keys plus page/limit-only keys → cross-title cache collision).
3. **Wrong-behavior test:** `security.middleware.spec.ts` locks in `next(encryptedString)` (Express error semantics).
4. **Naming:** decent for `user.service.spec` (behavior sentence); poor for "should be defined" ×5 and "should call service.X" (implementation-detail names, not behavior).
5. **Edge cases missing:** missing body (undefined → pipe TypeError), malformed ciphertext, expired/invalid JWT, duplicate email (covered only at unit level in service), validation failures (Zod) at unit level, pagination boundary (page=0/negative → negative skip?), not-found tutorial, RabbitMQ/Redis down, env vars missing.
6. **Auth review (8-dimension #4):** JWT claim mismatch (`sub` vs `id`), IV reuse, `console.log(req.body)` in middleware, `whitelist/forbidNonWhitelisted` commented out in `main.ts` ValidationPipe, no rate limiting/helmet.
7. **No coverage thresholds** anywhere (jest config, CI, lint-staged) — `--passWithNoTests` can silently skip.
8. **Hybrids/dead code:** `local.strategy`/`local.guard` wired in `AuthModule` but no route uses them (no `@UseGuards(LocalAuthGuard)` found); `SecurityMiddleware` unused; stray `a.js` artifact file in `tutorialls/` root.

---

## 7. Definition of Done Verdict

| DoD criterion | Status |
|---|---|
| Tests execute and pass | ❌ **BLOCKED** — runner broken locally; no CI test job (only inside Docker build) |
| Tests meaningful (assert behavior, not mocks) | ❌ Mostly delegation-proof; 1 vacuous; 1 wrong-behavior |
| 80%+ coverage on critical paths (auth, crypto, persistence, caching) | ❌ Auth/strategy/guards/JWT 0%; crypto 0%; Prisma repositories 0%; cache branch 0%; estimate ~30–40% statements overall |
| e2e coverage of guarded business flows | ❌ 7 e2e tests, 3–5 contradict implementation, require manual infra, not in CI |
| Edge cases (validation, auth failure, duplicate, not-found) | ⚠️ Unit-level for UserService only; integration/e2e expectations wrong; no 400-first validation tests |
| Quality gates enforce coverage | ❌ No thresholds; `--passWithNoTests` |

### QA Verdict: ❌ **NOT READY — REJECT**

**Justification:** (1) suite cannot execute in the current environment ([Verified] broken jest-cli); (2) the single most security-critical path — JWT auth — is untested *and* broken by inspection (claim mismatch); (3) e2e suite asserts expectations contradicted by the implementation and cannot run without manual infra; (4) no coverage is measured, enforced, or reported anywhere; (5) tests that exist are predominantly delegation-proofs with the real logic (cache, events, crypto, persistence, validation) untested.

### Minimum path to approve
1. Repair environment (`npm ci`) — authorize; re-run `npm test`, `npm run test:cov`, `npm run test:e2e`; capture counts + coverage report as evidence.
2. Fix and test JWT strategy/use cases (unit), encryption round-trip + tamper tests, Zod pipe (input classes), DecryptUserPipe (missing body), exception filter (double-write).
3. Correct e2e expectations to implementation contract (or fix impl), add guarded tutorial e2e flows, isolated DB (testcontainers or `prisma-mock` at unit level).
4. Add coverage thresholds (≥80% statements/branches on `application/**` + `infra/**`) and a GH Actions test job that fails the build below threshold; remove `--passWithNoTests`.
5. Remove dead code (SecurityMiddleware, LocalStrategy/LocalAuthGuard if unused, `findById` stub, `a.js`); remove `console.log` of request bodies.

---

## 8. Summary Table (file → coverage → verdict)

| Area | Spec files | Test count | Coverage est. (statements) | Verdict |
|---|---|---|---|---|
| App shell (`app.controller`, `app.service`) | 1 | 1 | ~100% (trivial) | ❌ Boilerplate |
| Auth service | 1 | 2 | ~100% happy-path | ❌ No errors/guards/strategies |
| JWT strategies/guards/use cases | 0 | 0 | **0%** | ❌ CRITICAL (known defect) |
| Encryption service | 1 | 3 | service 100%; **real crypto 0%** | ❌ IV-reuse defect untested |
| Tutorial controller | 1 | 8 | ~100% delegation | ⚠️ No guards/status |
| Tutorial service | 1 | 8 | lines ~100%; **cache branch ~50%** | ❌ Key logic unasserted |
| Tutorial use cases + Prisma repo | 0 | 0 | **0%** | ❌ Persistence untested |
| Users service | 1 | 6 | ~90% (best) | ✅ Meaningful |
| Users controller | 1 | 5 | ~100% delegation | ⚠️ Pipes mocked away |
| Users policies/repo/use cases | 0 | 0 | **0%** | ❌ Business rules untested |
| Zod pipe | 1 | 1 | lines 100%, **assertions 0** | ❌ Vacuous |
| Security middleware | 1 | 2 | 100% (wrong semantics) | ❌ Tests a bug |
| Exception filter / env / infra | 0 | 0 | **0%** | ❌ |
| **e2e (3 files)** | — | 7 | n/a | ❌ 3–5 wrong expectations; needs infra; not in CI |
| **TOTAL** | **9 unit + 3 e2e** | **36 + 7 = 43** | **~30–40% overall** | ❌ **NOT READY** |