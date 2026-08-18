# Technical & Code-Quality Analysis — Tutorialls_API (NestJS)

> **Author:** Tiago (Full Stack Dev) · **Date:** 2026-08-17
> **Scope:** `tutorialls/` app inside `Tutorialls_API/` — NestJS 10 + Prisma 5 + PostgreSQL + Redis + RabbitMQ
> **Method:** static analysis with file evidence (paths + line numbers), security review per `code-security` skill, lint executed (passes), test execution attempted (blocked, see §8)
> **Stack facts:** `package.json` — `@nestjs/* ^10`, `@prisma/client ^5.18.0`, `bcrypt ^5.1.1`, `zod ^3.23.8`, `passport-jwt`, `cache-manager-redis-store`, `amqplib`; **no `@nestjs/throttler`, no `helmet`, no class-validator runtime usage** (dep present, effectively dead)

---

## 1. Executive Summary

The project follows a clean **layered intent** (controller → service → use case → repository, with domain/policy interfaces and a string-token registry DI style), but the execution is undermined by:

1. **Plaintext passwords embedded in JWTs** (`user.service.ts:45-49` → `IJwtPayloadDTO.password`)
2. **Broken crypto**: AES-CTR with a single class-level IV reused for every encryption (`encrypt.use_case.ts:11`), shared client/server key, no authentication tag
3. **Double-response bug in the global exception filter** (`exception.filter.ts:13/24`) — every exception triggers a second response write
4. **Hardcoded infra credentials** (`tutorial.module.ts:40`, `docker-compose.yaml`)
5. **A registry/DI pattern that trades IDE-safe navigation for stringly-typed ceremony**, with typo'd tokens, filenames, and duplicated namespaces
6. **No transactions** in the only multi-step write path (signup), race conditions unhandled
7. **Caching that reads the DB first anyway, never invalidates, and returns a different response shape on cache hit** (`tutorial.service.ts`, `tutorial.entity.ts:48`)
8. **Tests that codify the bugs** (password-in-JWT, broken middleware behavior, login→500), e2e suites that require live infra and are currently un-runnable

Severity scale: **CRITICAL** (fix now) / **HIGH** (must fix this sprint) / **MEDIUM** (fix soon) / **LOW** (polish).

---

## 2. Architecture & Route Map

### 2.1 Route map (evidence: `src/application/users/users.controller.ts`, `src/application/tutorial/tutorial.controller.ts`)

| # | Method | Path | Guard | Validation | Request shape | Response | HTTP |
|---|--------|------|-------|-----------|---------------|----------|------|
| 1 | POST | `/user/signup` | none | zod (`DecryptUserPipe` → `SignupSchema`) | `{ ciphertext }` or plain JSON (pipe bypass at `encryption.pipe.ts:20`) | empty body | 200/201 |
| 2 | POST | `/user/login` | none | zod (`LoginSchema`) | `{ ciphertext }` or plain JSON | `{ token }` | 200 |
| 3 | POST | `/tutorial` | `JwtAuthGuard` | **none** (plain interface DTO, `tutorial.controller.ts:33`) | arbitrary body | tutorial entity | 201 |
| 4 | GET | `/tutorial` | **none** (public — inconsistent with #5-7) | **none** (query strings, `pagination.dto.ts` is an interface) | `?page&limit` | `{items,total,limit,page}` | 200 |
| 5 | GET | `/tutorial/title` | JWT | none | `?title&page&limit` | paginated | 200 |
| 6 | GET | `/tutorial/author` | JWT | none | `?author&page&limit` | paginated | 200 |
| 7 | GET | `/tutorial/content` | JWT | none | `?keyword&page&limit` | paginated | 200 |
| 8 | PATCH | `/tutorial/:id` | JWT | none | partial body (all fields required by `update.dto.ts`) | tutorial entity | 200 |
| 9 | DELETE | `/tutorial/:id` | JWT | none | — | `true`/`false` | 200 |

**REST-design issues (HIGH):**
- **Inconsistent auth**: `GET /tutorial` is public while `GET /tutorial/title|author|content` are protected (same data, three filter endpoints) — either protect all or none (`tutorial.controller.ts:37-58`).
- **Identical filter semantics as separate endpoints** — `/author`, `/title`, `/content` should be query params on one resource (`GET /tutorial?title=&author=`), not 3 routes.
- **Signup returns no body/no 201 explicitly** and relies on Nest default; `app.controller.ts` still serves the stock `Hello World!`.
- `PATCH /tutorial/:id` uses `IUpdateTutorialDTO` where **all fields are required** (`update.dto.ts:2-6`) — a PATCH that can't do partial updates; also the client controls the `id` merge, `:id` param has no UUID validation (`tutorial.controller.ts:62-64`), and `delete.dto.ts` id unused validation.
- **Pagination is unvalidated and stringly-typed**: `@Query() pagination: PaginationDTO` (interface, no class-validator decorators, `pagination.dto.ts:1-4`) receives `{ page: '1', limit: '10' }` **as strings**; repository does `skip: (page - 1) * limit` (`tutorial.repositiry.ts:47`) — `'abc' - 1` → `NaN` → Prisma 500; `page=0` → `skip: -10` → error; no upper bound on `limit` → memory DoS (unprotected route #4).
- **Swagger is misleading**: `DocumentBuilder` version `'1,0'` (`main.ts:22`), and the docs describe plain JSON bodies while the controller's `DecryptUserPipe` contract is `{ciphertext}` — no Swagger metadata for the pipe.

**Response-shape inconsistency (MEDIUM):** create/update return entity `toDTO()`; delete returns a boolean; login `{token}`; signup nothing; list returns `{items,total,limit,page}` — 4 different shapes with no envelope convention.

---

## 3. Services & Use Cases — Business Logic Quality

### 3.1 UserService (`src/application/users/user.service.ts`)

| Line | Finding | Severity |
|------|---------|----------|
| 45-49 | **Token payload includes `password: user.password` — plaintext password inside the JWT.** `signAsync(user)` signs the whole object; payloads are base64. Anyone with a token (or a log of it) can read the password. Confirmed by `domain/DTO/auth/jwt/payload.dto.ts:4` (`password: string`). | **CRITICAL** |
| 58 | `user.password = ...` **mutates the caller's DTO** (side effect); pass a copy instead. | MEDIUM |
| 46 | `result.id!` non-null assertion — masks a possibly-undefined id (and it lands in the token). | LOW |
| 54-60 | **Signup is check-then-insert with no `$transaction`** — two concurrent signups with the same email both pass the policy check; the second hits the Prisma `P2002` unique violation, which is **not mapped to 409** and surfaces as 500 via the filter. | **HIGH** |
| 33-52 | Login: `findByEmail` (policy) → `bcrypt.compare` → token. No dummy-compare on user-not-found (timing oracle lets attackers enumerate emails), no failed-attempt throttle. | HIGH |
| 37 | `if (!result)` — the policy returns `User \| undefined` (`login_alredy_exists.policy.ts:11`); a `User` with a falsy shape would break — works today, fragile. | LOW |

### 3.2 TutorialService (`src/application/tutorial/tutorial.service.ts`)

| Line | Finding | Severity |
|------|---------|----------|
| 86-98,100-140 | **Cache is checked AFTER the use case already hit the DB** (`result` computed first at 87/101/115/129) — caching defeats ~zero DB work. All four read paths repeat the same if/else boilerplate (DRY violation). | MEDIUM |
| 65-84 | **No cache invalidation on create/update/delete** — stale reads until TTL. TTL depends on `CACHE_TTL` which is **not in `.env.example`** (it defines `REDIS_TTL`, `env.service.ts:29` reads `CACHE_TTL`) → undefined TTL → unexpiring stale cache. | **HIGH** |
| 89-97 | `listAll` executes the query before the cache get; also caches the repository result **containing `Tutorial` entity instances** — on cache hit the serialized object exposes the private field `autor` (`tutorial.entity.ts:21,48`) instead of `author`, **so cache-hit responses differ in shape from cache-miss responses**. | HIGH |
| 29-34 | RabbitMQ queue name **hardcoded** `'tutorials_queue'` while the module configures `RABBITMQ_QUEUE` env (`tutorial.module.ts:56`) — env is ignored in the emit path. | MEDIUM |
| 57-63 | `onModuleInit` connect / `onModuleDestroy` close — good lifecycle hygiene, but if RabbitMQ is down, app bootstrap fails. | LOW |

### 3.3 Use cases (evidence: `src/application/tutorial/use_case/*`, `src/application/users/use_case/*`)

- Every use case is a **stateless 1:1 passthrough** to the repository/engine (e.g., `create.use_case.ts:14-16`). The pattern adds a file + token + provider per operation with zero domain logic; domain rules instead live in services/policies. Architectural ceremony with no payoff.
- `delete.use_case.ts` / `update.use_case.ts` do not check existence first — Prisma throws `P2025` on missing rows → unhandled → 500 instead of 404. **HIGH** (should map to `UserNotFoundError`-style 404).
- No `$transaction` anywhere in the codebase (verified: only `prisma.user.create`, `findUnique`, `tutorial.*` calls).

### 3.4 Prisma usage (`src/application/tutorial/repository/prisma/tutorial.repositiry.ts`)

- `findByTitle/findByAuthor/findByKeywordInContent` use `contains` + `mode: 'insensitive'` (`:62,77,96`) — fine against SQLi (Prisma parameterizes), but wildcard chars (`%`, `_`) are passed through unescaped and `findMany` count + `skip/take` arithmetic mix strings/numbers (`:47-48`).
- `total` computed via a **second `count()` query per page** (`:53:67:82:104`) — 2 queries per request; could be `$transaction([findMany, count])` or one query.
- `user.repository.ts:41-43` — `findById` is a **throwing stub** ("Method not implemented") — dead contract method.
- No `select` projections — passwords fetched on every `findByEmail` (needed for compare, but entity carries `authToken` too, which is never used — dead column, `schema.prisma:21`).

---

## 4. The Registry/Provider Pattern — DI Deep Dive

### 4.1 How it works

- Tokens are **string constants** organized in nested registry objects, e.g. `AUTH_REGISTRY.SERVICE.JWT = 'MODULE::AUTH::SERVICE::JWT'` (`auth.regsitry.ts:7`).
- Registries are aggregated at `src/app.registry.ts` → single `MODULE` object imported everywhere.
- Modules bind implementations to tokens via `{ provide: MODULE.X.Y, useClass: Impl }` (`users.module.ts:22-49`) and services inject via `@Inject(MODULE.X.Y)` (`user.service.ts:19-30`).
- `app.registry.ts` must be updated for every new module; each module re-declares the provider in `exports` even when nothing imports it (e.g., `tutorial.module.ts:103-105`, `auth.module.ts:33-37`).

### 4.2 Assessment: usable, but heavily convoluted

| Aspect | Verdict |
|--------|---------|
| **Why it exists** | Decouples application layer from domain interfaces — legitimate goal (similar to "provider tokens" in DDD-style Nest). |
| **Maintainability** | Weak. Developer must traverse 4 files (module → registry → `app.registry.ts` → consumer) to trace one binding; tokens are plain strings so **a typo silently breaks DI at runtime**, not at compile time. Evidence: tokens already drifted — `use_case.registry.ts:5` defines `MODULE::...::POLICY::USER::SIGNUP` for a USE_CASE (copied from the policy namespace); `policy.registry.ts:4` keys `IS_VALID_PASSWORD` to token `...::HASH_PASSWORD`. |
| **Typo's in the registry itself** | `auth.regsitry.ts` (missing 'e'), `ENCRYTION_REGISTRY` (`encryption.registry.ts:3`), `alredy_exists` everywhere. |
| **Nest-native alternative** | Plain class tokens (`@Inject(UserService)`) or `@nestjs/bull`-style named providers; the registry adds indirection without adding swappability beyond what `useClass` already provides. If the goal is "swap Prisma for Mongo", interfaces in `domain/` already deliver that — the string tokens don't add swap capability, they add ceremony. |
| **Dead duplication** | `exports` blocks re-register the whole provider (users.module:51-56, auth.module:33-37) — if `useClass` ever diverges, the exported instance differs from the internal one. |

**Recommendation (MEDIUM):** keep the domain interfaces, drop the string-token ceremony for the common path — use class tokens or `@Inject(IRepository)` with `useExisting`. If kept, add a **compile-time check** (a test that iterates `MODULE` and asserts each token resolves in the container — one ArchUnit-style spec would have caught the drifted tokens) and fix the namespace typos.

---

## 5. Auth — Local Strategy, JWT, Token Flow

### 5.1 Flow

```
POST /user/login (no guard)
  → UsersController (DecryptUserPipe → Zod)
  → UserService.login
     → policy should_exists (findByEmail)
     → policy password_is_valid (bcrypt.compare)
     → authService.authenticate({ id, email, password })   ← plaintext password
     → JwtGenerateAuthTokenUseCase → jwt.signAsync(user)    ← password signed in
LocalStrategy (passport-local)                            ← NOT USED by the controller!
JwtStrategy (passport-jwt)                                 ← used by JwtAuthGuard on /tutorial/*
```

### 5.2 Findings

| # | Finding | Evidence | Severity |
|---|---------|----------|----------|
| A1 | **Plaintext password in JWT payload** — base64-readable by anyone holding the token; leaks to logs, Redis cache? (tokens are returned only, but still). `IJwtPayloadDTO` even codifies `password: string`. | `user.service.ts:45-49`, `domain/DTO/auth/jwt/payload.dto.ts:1-6` | **CRITICAL** |
| A2 | **`sub` claim never set** — `jwt.strategy.ts:18` reads `payload.sub` and `payload.username`, but `signAsync` signs `{id, email, password}` (`generate_token.use_case.ts:11`) — no `sub`, no `username` → `req.user = { userId: undefined, username: undefined }` on every authenticated request. One of the two DTO/strategy worlds is wrong. | `jwt.strategy.ts:17-19` vs `generate_token.use_case.ts:10-12` | **HIGH** |
| A3 | **`LocalStrategy` is dead code** — nothing uses `AuthGuard('local')`; `LocalAuthGuard` (`local.guard.ts:6-12`) is never referenced, `LocalStrategy.validate` calls `service.authenticate({email, password})` which would proceed to sign a token with `id: undefined`. Only `JwtAuthGuard` is wired (`tutorial.controller.ts:22,31`). | grep: `LocalAuthGuard` only in `local.guard.ts` | MEDIUM |
| A4 | **`validate_token.use_case.ts` is dead code with a type lie** — interface declares `execute(): Promise<boolean>` (`domain/use_case/auth/validate_token.use_case.ts:6`), implementation returns `verifyAsync(token) as T` (`validate_token.use_case.ts:10-12`); the generic `Promise<T>` satisfies the interface structurally but returns the payload, not a boolean. Only `auth.service.spec.ts` exercises it. | grep across `src/` (only spec + service) | MEDIUM |
| A5 | **JWT secret loaded via a static getter that news up a ConfigService per access** — `EnvService.ENV` (`env.service.ts:8-37`) is evaluated in `JwtModule.register({ secret: EnvService.ENV.JWT.SECRET })` (`auth.module.ts:20-23`). Works only because `ConfigModule.forRoot()` happens to load dotenv earlier; **zero validation** — missing `JWT_SECRET` fails at runtime with an opaque error; `.env.example` suggests `JWT_SECRET="secret"` (trivially brute-forceable HS256 key). | `auth.module.ts:20-23`, `env.service.ts:8-17`, `.env.example:10` | HIGH |
| A6 | **No refresh tokens, no revocation, no token versioning**; the `authToken` column (`schema.prisma:21`) exists but is never written — dead schema field. Long-lived `1d` token with no blacklist after password change = password-reset doesn't kill sessions. | `schema.prisma:21`, `.env.example:11` | MEDIUM |
| A7 | **bcrypt rounds = 1 in `.env.example`** (`HASH_ROUNDS=1`) — OWASP minimum is 10+ (cost factor 12 recommended). The real `.env` has a 2-digit value (unverifiable here), but the committed default invites weak configs; `hash_password.use_case.ts:10` does `Number(...)` with no fallback — `NaN` if unset → bcrypt throws at signup. | `.env.example:17`, `hash_password.use_case.ts:10` | HIGH |
| A8 | `JwtModule` global default HS256 + `passport-jwt` `ignoreExpiration: false` — **correct** defaults. `jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()` — correct. | `jwt.strategy.ts:10-14` | ✔ good |

---

## 6. Encryption Module — Crypto Review

Files: `src/application/encryption/use_case/user/encrypt.use_case.ts`, `decrypt.use_case.ts`, `encryption.service.ts`, `encryption.registry.ts`

### 6.1 Design summary

Clients send `{ ciphertext }`; `DecryptUserPipe` decrypts into `{email, password}`; zod validates; `SecurityMiddleware` (unwired) would have done the reverse (encrypt body) and passed the ciphertext into `next()`.

### 6.2 Findings (all **CRITICAL/HIGH** — this is the weakest area)

| # | Finding | Evidence | Severity |
|---|---------|----------|----------|
| E1 | **IV reuse — single class-level IV for the process lifetime.** `private readonly iv = randomBytes(16)` is initialized once when Nest instantiates the singleton. Every subsequent encryption reuses the same IV with AES-CTR (a stream cipher) → identical plaintext → identical ciphertext (e.g., same password for many users), enabling keystream-reuse attacks and user-account fingerprinting. The "randomness" is a one-time event. | `encrypt.use_case.ts:11` | **CRITICAL** |
| E2 | **Client holds the server's symmetric key** — the decrypt contract implies the client must encrypt with the same `ENCRYPT_KEY`/IV scheme. A symmetric key shared with every client provides **zero confidentiality** (any client can decrypt any other client's payload) and is security theater; transport security belongs to TLS, not to this scheme. | `decrypt.dto.ts:1-3`, `.env.example:13-15` | **CRITICAL** (design) |
| E3 | **No AEAD / no authentication tag** — `aes-256-ctr` is unauthenticated; combined with a known/reused IV, ciphertext is malleable. Use `aes-256-gcm` with per-message random IV, or eliminate client-side crypto entirely. | `.env.example:14`, `encrypt.use_case.ts:19-26` | **HIGH** |
| E4 | **`ENCRYPT_KEY` example is not a valid AES-256 key** — `"256-bit key"` is 10 bytes; `createCipheriv` requires 32 for aes-256 → runtime `Invalid key length` error if followed. No key-derivation (KDF), no validation at startup. | `.env.example:13` | HIGH |
| E5 | **IV + breakpoint in-band coupling**: output `iv + breakpoint + ciphertext` (`encrypt.use_case.ts:26`), parsing with `ciphertext.split(breakpoint)` (`decrypt.use_case.ts:18-20`) — fragile if the breakpoint ever appears in hex output (impossible for `:`, OK) but the real issue: the SAME, reused IV is embedded in the output, so the prefix is identical across messages → leaks equality of first 16 bytes. | `decrypt.use_case.ts:17-20` | MEDIUM |
| E6 | `JSON.parse` of decrypted data with **no error handling** → malformed ciphertext → raw `SyntaxError` → 500 leak (via filter). Also `DecryptUserPipe.transform` passes `null` through (`value.ciphertext === undefined` only, `encryption.pipe.ts:20`) → `null.split` TypeError. | `decrypt.use_case.ts:30`, `encryption.pipe.ts:19-21` | MEDIUM |
| E7 | **Dead middleware that would break everything if wired**: `SecurityMiddleware.use` does `console.log({body: req.body})` — logging raw passwords (**PII leak**) — then calls `next(user)` with a string (`security.middleware.ts:14-17`). Express treats any argument to `next()` as an error → if ever registered, every request becomes an error. Unregistered anywhere (grep: no `applyMiddleware`/`MiddlewareConsumer`). Its spec codifies the broken behavior (`security.middleware.spec.ts:43`). | `security.middleware.ts:13-18` | HIGH |

---

## 7. Validation & Error Handling

### 7.1 Validation layering (inconsistent, three systems)

| Layer | Where | Status |
|-------|-------|--------|
| class-validator | entities `user.entity.ts:5-11`, `tutorial.entity.ts:11-25` + global `ValidationPipe` (`main.ts:12-17` with `whitelist`/`forbidNonWhitelisted` **commented out**) | **Dead**. Entities are never piped through ValidationPipe; the pipe only transforms (no whitelist), so unknown fields pass everywhere. |
| zod | users only: `ZodValidationPipe` + `SignupSchema`/`LoginSchema` (`users/validation/zod/user/*.ts`) | Active for `/user/*` only |
| none | **All `/tutorial/*` endpoints** — `ICreateTutorialDTO` is a plain interface (`create.dto.ts:1-5`); `@Body()` accepts anything; `id` params unvalidated; `PaginationDTO` unvalidated (see §2.1) | **Gap** |

Also: `LoginSchema` requires `password.min(8)` (`login.schema.ts:6`) — a user whose password is shorter than 8 (created under a different policy, or legacy) **can never log in**. Signup schema doesn't strip/validate `authToken`. Zod's `result.error.message` is a long serialized JSON-ish string → ugly 400 bodies.

### 7.2 Policies (`src/application/users/policy/*`)

- `alredy_exists.policy.ts:16-18` — `(await findByEmail(...)) ? true : false` — a boolean for "should NOT exist", read as `if (await policy.execute(user)) throw 409` (`user.service.ts:55-56`) — the naming requires keeping a double negative in your head (`UserShouldNotAlreadyExistsToSignupPolicy.execute() === true` means "exists"). Functionally correct, ergonomically inverted.
- `should_exists.policy.ts:16-18` — one-line passthrough returning the entity; it's a query, not a policy — could live in the repository/use case.
- `password_should_be_valid.policy.ts:10-14` — fine.
- Goal of the policy layer: reuse/decouple — reasonable; current value: marginal (3 one-liners).

### 7.3 Exception filter — two real bugs (`src/exception.filter.ts`)

| # | Finding | Severity |
|---|---------|----------|
| F1 | **Double response write**: `response.status(...).json(...)` is called at :13/:14, **then** `super.catch(exception, host)` runs at :24 and writes a second response → `ERR_HTTP_HEADERS_SENT` on **every** exception; the noise is logged via `Logger.error('Response: ', error_response)` at :22, which also double-logs full stack + body. | **CRITICAL** |
| F2 | **Information disclosure**: non-`AppError` exceptions return `exception.message` verbatim to the client (:14-18) — Prisma errors, Zod JSON, stack traces fragment… an attacker learns internals. Should return a generic 500 with a correlation id and log details server-side only. | **HIGH** |
| F3 | `AppError.toStruct()` drops `url` (the http.cat hint) — inconsistent shape vs the non-AppError branch (which has `name` + `message` but no `url`/`data`). Error shape is not contract-tested. | LOW |

---

## 8. Security Review (per `code-security` skill)

### 8.1 Findings matrix

| # | Category | Finding | Evidence | Severity |
|---|----------|---------|----------|----------|
| S1 | Secrets | **Hardcoded RabbitMQ credentials** `amqp://admin:admin@rabbitmq:5672` | `tutorial.module.ts:40` (and duplicate env-less registration `:48-64` for the same token `RABBITMQ_SERVICE` — useAsync overwrites/conflicts with the static one) | **CRITICAL** |
| S2 | Secrets | **Weak committed defaults in `.env.example`** — `JWT_SECRET="secret"`, `HASH_ROUNDS=1`, RabbitMQ `admin/admin`, Postgres `root/root`, pgAdmin `admin` | `.env.example:10,17,24`; `docker-compose.yaml:21-23,47-48,58-59` | HIGH |
| S3 | Secrets hygiene | Root `.env` (not tracked, correctly ignored) contains a **commented-out Render Postgres URL with plaintext DB password** — rotate that credential; never paste secrets even in comments. Verify history: `git ls-files` shows only `.env.example` tracked — good. | `.env` (local) | MEDIUM |
| S4 | Rate limiting | **None** — no `@nestjs/throttler`, no brute-force protection on `/user/login` (or signup); JWT endpoints unprotected from token guessing (they're signed, so guessing is moot, but login brute-force is wide open) | `package.json` deps | **CRITICAL** (login) |
| S5 | CORS | `app.enableCors()` — **all origins, all methods, all headers** reflected | `main.ts:8` | HIGH |
| S6 | Security headers | **No `helmet`** — no CSP, no X-Content-Type-Options, etc. | `package.json` | MEDIUM |
| S7 | JWT | See §5 A1 (password in token), A5 (weak secret default), `ignoreExpiration:false` ✔ | §5 | CRITICAL/HIGH |
| S8 | Injection | No SQL injection (Prisma parameterized everywhere ✔); no command injection; no eval; no `child_process` usage; regexes are simple (no ReDoS). `contains` wildcards `%/_` pass through to ILIKE — minor. | code scan | ✔ / LOW |
| S9 | Crypto | See §6 — IV reuse, shared client key, unauthenticated mode | §6 | CRITICAL |
| S10 | Logging | `console.log` of raw request body containing passwords; `Logger.error` logs full exception objects/bodies | `security.middleware.ts:14`, `exception.filter.ts:21-22` | HIGH |
| S11 | Input limits | No body-size guard besides Express default 100kb; pagination unbounded (see §2.1) | — | MEDIUM |
| S12 | Supply chain | `node:20-slim`, `postgres:latest`, `redis`, `rabbitmq:3-management-alpine` — **floating tags** (`Dockerfile:1`, `docker-compose.yaml:16,30,38`); `bcrypt` native rebuild hack `npm uninstall bcrypt && npm i bcrypt` in the prod stage (`Dockerfile:28`) requires network at image build and can fail on `node:20-slim` (no build toolchain) | `Dockerfile`, `docker-compose.yaml` | MEDIUM |
| S13 | CI | Actions are **pinned by SHA** ✔ (good), but `docker-publish.yml` only builds+pushes on PR/main — **no lint/test/coverage gate, no secret scan**; PRs can merge red | `.github/workflows/docker-publish.yml` | MEDIUM |
| S14 | Transport | HTTP only (`app.listen(3000)`), no TLS termination config in-compose; client "encryption" masks the absence of real transport security | `main.ts:28` | MEDIUM |

---

## 9. Code Smells, Typos & Dead Code Inventory

### 9.1 Typo/identifier inventory (evidence: filesystem)

| File | Typo/Issue |
|------|-----------|
| `src/application/auth/auth.regsitry.ts` | **regsitry → registry** |
| `src/application/encryption/encryption.registry.ts:3` | `ENCRYTION_REGISTRY` (missing 'p'); propagated to `app.registry.ts:3` |
| `src/application/tutorial/repository/prisma/tutorial.repositiry.ts` | **repositiry → repository** |
| `src/application/users/policy/alredy_exists.policy.ts`, `src/application/users/policy/should_exists.policy.ts` (import), `domain/DTO/user/policy/alredy_exists.dto.ts`, `internal/lib/error/user/alredy_exists.error.ts`, `domain/policy/user/login_alredy_exists.policy.ts`, `domain/policy/user/signup_alredy_exists.policy.ts`, `policy.registry.ts:2`, module tokens, error message `'User Alredy Exists'` (`alredy_exists.error.ts:5`) | **alredy → already** (7+ occurrences, token strings included — renaming breaks DI unless coordinated) |
| `src/application/tutorial/use_case/list/all.use_case.ts:8`, `tutorial.module.ts:87` | `ListAllTutotialsUseCase` (**tutotials**) |
| `test/application/users/users.controller.intgration.e2e-spec.ts` | **intgration → integration** |
| `src/domain/entity/tutorial.entity.ts:21,38,44,48` | field `autor` (PT) vs DTO `author` (EN) — mixed language, source of the cache-shape bug (§3.2) |
| `src/main.ts:22` | Swagger version `'1,0'` |
| `src/application/users/validation/zod/user/signup.schema.ts:10` | `zodSignupSchema` type — PascalCase type, unused |
| `src/application/users/policy/policy.registry.ts:4` | Token `...POLICY::USER::HASH_PASSWORD` bound to `IS_VALID_PASSWORD` — mismatched name |
| `src/application/users/use_case/use_case.registry.ts:3,5` | Tokens prefixed `MODULE::APPLICATION::POLICY::...` inside the **use_case** registry (copy-paste) |
| `src/internal/lib/error/user/invalid_password.error.ts:3` | `InvalidCredentials` — no `Error` suffix (inconsistent with siblings) |

### 9.2 Dead code / unused

| Item | Evidence |
|------|----------|
| `SecurityMiddleware` (encrypt direction) | never wired (no `MiddlewareConsumer`); logically broken if wired (next(string)) |
| `LocalStrategy` + `LocalAuthGuard` | never referenced |
| `JwtAuthService.validate` + `validate_token.use_case.ts` | only exercised by specs; `Promise<boolean>` vs actual payload type mismatch |
| `UserRepository.findById` | throwing stub (`user.repository.ts:41-43`) |
| `authToken` column + `User.authToken` | never written (signup DTO passes it through, entity carries it, nothing uses it) |
| class-validator decorators on entities | never validated through ValidationPipe; `class-validator`/`class-transformer` deps dead in practice |
| `bcrypt.engine.ts` | pointless re-export wrapper (`export { bcrypt }`) |
| `app.startAllMicroservices()` | no microservice servers registered (`main.ts:27`) |
| RabbitMQ + Redis + `@nestjs/microservices`/`amqplib`/`cache-manager-redis-store` | only used by tutorial module (events/cache) |
| `ExceptionFilter` `HttpStatus` import | unused at `exception.filter.ts:1` |
| `.github` root + `.husky` pre-commit | hooks exist but `lint-staged` script (`test:staged`) defined; actual hook files empty (checked: no commands inside `pre-commit`) |

### 9.3 Magic numbers / hardcoded values

- `app.listen(3000)` (`main.ts:28`) — no `PORT` env
- `skip: (page - 1) * limit` with string arithmetic (`tutorial.repositiry.ts:47,60,75,94`)
- `HASH_ROUNDS` `Number()` conversion without default (`hash_password.use_case.ts:10`)
- `password.min(8)` duplicated in both zod schemas
- queue name `'tutorials_queue'` hardcoded in `tutorial.service.ts:31`
- `http.cat` URL default in `app.error.ts:13`

### 9.4 tsconfig & lint

- `strictNullChecks: false`, `noImplicitAny: false`, `forceConsistentCasingInFileNames: false` — the typo'd `tutorial.repositiry.ts` imports would silently break on case-sensitive platforms; `any`/`!` patterns everywhere.
- `eslint` passes (`npm run lint` — clean, `--fix` mode in script), `prettier` configured.
- Jest config: `rootDir: src`, moduleNameMapper `^src/` ✔, **no coverage thresholds** (`package.json` jest block) — "80% coverage" not enforced; `collectCoverageFrom **/*.(t|j)s` collects everything but nothing gates on it.

---

## 10. Test Suite Assessment (evidence)

| Finding | Evidence |
|---------|----------|
| **Tests currently cannot run locally**: `npm test` → `MODULE_NOT_FOUND` for `jest-cli` in `node_modules` (broken install; Node v25 vs package's Node 20 era). CI doesn't run tests either (§8 S13). | `npm test` output |
| Unit specs exist for: app, auth service, encryption service, tutorial controller/service, user service/controller, security middleware, zod pipe — good coverage intent, mocks are hand-rolled objects (`as unknown as jest.Mocked<...>`) — brittle. | `src/**/*.spec.ts` |
| **Specs codify bugs**: `user.service.spec.ts:196-197` asserts `authenticate` is called with the plaintext `password` in the payload; `security.middleware.spec.ts:43` asserts `next()` receives the encrypted string; `auth.service.spec.ts:42-55` tests the dead `validate` path. | spec files |
| **e2e codify failures**: `users.controller.e2e-spec.ts:35` asserts `POST /user/login → 500` as expected behavior; `:17-18` builds via `createApplicationContext` then calls `getHttpServer()` — no HTTP server exists in an application context → broken test. The "integration" spec requires live PostgreSQL/Redis/RabbitMQ (imports full `AppModule`) — not portable CI. | `test/application/users/*` |
| No tests for: exception filter, encryption use cases (crypto), policies, repositories, JWT strategy, guards, prisma service, config — the **security-critical code is the least tested**; the only crypto spec tests the service passthrough with mocks. | `filesystem` scan |

---

## 11. Tech Debt & Improvement Recommendations (ranked by impact)

| Rank | Recommendation | Impact | Effort |
|------|----------------|--------|--------|
| 1 | **Remove `password` from the JWT payload** — sign only `{ sub: user.id, email }`; align `JwtStrategy.validate` with the actual claims (fix `sub`/`username` mismatch §5 A2). Invalidate old tokens on deploy (secret rotation or `authToken` versioning). | CRITICAL — data breach class | S (30 min) |
| 2 | **Fix `ExceptionFilter`**: single response write (remove `super.catch` after writing), don't leak `exception.message` to clients, return generic 500 + request id; add a spec. | CRITICAL — every error double-writes + leaks internals | S |
| 3 | **Rework encryption**: generate a fresh random IV per message; switch to `aes-256-gcm` (AEAD); validate key at startup; if client-side encryption is meant as transport security, **replace it with TLS** and drop the shared-key scheme; delete `SecurityMiddleware` and the `console.log` of bodies. | CRITICAL — crypto | M |
| 4 | **Harden auth surface**: add `@nestjs/throttler` on `/user/*` (esp. login); map `P2002` → 409 and `P2025` → 404; `HASH_ROUNDS` ≥ 12 default; env validation (zod/Joi) at bootstrap for `JWT_SECRET`, `ENCRYPT_KEY`, `DATABASE_URL`. | HIGH | M |
| 5 | **Fix cache correctness**: read cache first (or don't cache at all), invalidate on create/update/delete, cache `toDTO()` output not entities (fixes `autor`/`author` shape bug), align `CACHE_TTL` env name (`REDIS_TTL` vs `CACHE_TTL`). | HIGH — stale + wrong-shape data | S |
| 6 | **Remove RabbitMQ credential hardcoding & duplicate registration** — single `ClientsModule.registerAsync` using `EnvService`; respect `RABBITMQ_QUEUE` in `emit()`; wire `helmet`; scope CORS to configured origins. | HIGH — secrets + CI/config drift | S |
| 7 | **Introduce real input validation for `/tutorial/*`**: class-validator DTOs (or zod) for create/update/filters; validated numeric pagination with caps (`limit ≤ 100`, `page ≥ 1`); UUID validation on `:id`. Re-enable `whitelist + forbidNonWhitelisted` globally. | HIGH — mass-assignment/DoS | M |
| 8 | **Add transaction for signup** (`prisma.$transaction`) and existence-check + mapping for update/delete; consider an error-mapping interceptor for Prisma errors. | HIGH — race conditions | S |
| 9 | **Fix the registry/DI drift**: rename typo'd tokens/files, or migrate to class tokens; at minimum add a container-resolution test that walks `MODULE` and asserts every token binds (catches the `POLICY::USER::SIGNUP` and `HASH_PASSWORD` drift). | MEDIUM — maintainability | M |
| 10 | **Test & CI gate**: repair `node_modules`/pin Node 20; set coverage thresholds (≥80% on `application/**`); delete the 500-asserting e2e; make e2e use Testcontainers or a test DB; add lint+test+secret-scan to `docker-publish.yml` (gitleaks); pin Docker base images; remove the `npm uninstall bcrypt` hack. | MEDIUM — engineering hygiene | M |

**Quick wins (LOW):** rename `ListAllTutotialsUseCase`/`alredy_*`/`intgration`; drop dead code (`SecurityMiddleware`, `LocalStrategy/LocalAuthGuard`, `findById` stub, `bcrypt.engine.ts`, `startAllMicroservices`); Swagger version `'1,0'`→`'1.0'`; README is the stock Nest starter — write real docs incl. the `{ciphertext}` contract or remove it.

---

## 12. Files Examined (evidence set)

Core: `main.ts`, `app.module.ts`, `app.registry.ts`, `app.controller.ts`, `app.service.ts`, `exception.filter.ts` · Auth: `application/auth/**` (module, service, `auth.regsitry.ts`, guards, jwt/local strategies, use cases, registries) · Users: `application/users/**` (controller, service, module, registries, policies, middleware, pipes, schemas, repo) · Tutorial: `application/tutorial/**` (controller, service, module, registry, use cases, `tutorial.repositiry.ts`) · Encryption: `application/encryption/**` · Domain: entities, all DTOs, service/policy/use_case/repository interfaces · Infra: `config/**`, `prisma/*`, `bcrypt.engine.ts` · Config: `package.json`, `tsconfig.json`, `.eslintrc.js`, `.env.example` (+ local `.env` scaled values), `prisma/schema.prisma`, `Dockerfile`, `docker-compose.yaml`, `.github/workflows/docker-publish.yml`, `.gitignore`, husky hooks, 9 unit specs + 3 e2e specs.