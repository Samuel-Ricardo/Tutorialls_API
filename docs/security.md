# Security — Tutorialls API

> Audience: maintainers, security reviewers
> Method: static analysis against the shipped code (paths + line numbers cited), reviewed with a security-first mindset. Secrets were never reproduced; values redacted.
> Status: **several Critical/High findings must be remediated before any production exposure.** This document is a findings register + remediation roadmap, not a clean bill of health.

---

## Table of contents

- [1. Findings register](#1-findings-register)
- [2. Security controls present](#2-security-controls-present)
- [3. Gaps](#3-gaps)
- [4. Remediation roadmap](#4-remediation-roadmap)

---

## 1. Findings register

Severity scale: **Critical** (fix now) · **High** (must fix this sprint) · **Medium** (fix soon) · **Low** (polish).

### 1.0 Summary

| ID | Severity | Finding | Section |
| --- | --- | --- | --- |
| S1 | Critical | Plaintext password inside JWT | [§1.1](#s1) |
| S2 | High | JWT secret read too early (decorator evaluation) | [§1.1](#s2) |
| S3 | High | `sub`/`username` claim mismatch (strategy vs token) | [§1.1](#s3) |
| S4 | High | bcrypt cost factor 1 as default | [§1.1](#s4) |
| S5 | Medium | No refresh/revocation/token versioning | [§1.1](#s5) |
| S6 | Medium | Dead local-auth path with type confusion | [§1.1](#s6) |
| S7 | Medium | Email-enumeration timing oracle on login | [§1.1](#s7) |
| E1 | Critical | Reused static IV (AES-CTR keystream reuse) | [§1.2](#e1) |
| E2 | Critical | Symmetric key shared with every client | [§1.2](#e2) |
| E3 | High | Unauthenticated cipher (no AEAD) | [§1.2](#e3) |
| E4 | High | Invalid example AES key (not 32 bytes) | [§1.2](#e4) |
| E5 | Medium | No error handling on decrypt/parse failures | [§1.2](#e5) |
| E6 | Medium | In-band IV + breakpoint coupling | [§1.2](#e6) |
| F1 | Critical | Global filter double response write | [§1.3](#f1) |
| F2 | High | Raw exception messages leak to clients | [§1.3](#f2) |
| F3 | Low | Error shape inconsistency | [§1.3](#f3) |
| I1 | Critical | Hardcoded RabbitMQ credentials + duplicate registration | [§1.4](#i1) |
| I2 | High | Committed PostgreSQL data directory | [§1.4](#i2) |
| I3 | High | Weak committed defaults (env template + compose) | [§1.4](#i3) |
| I4 | Medium | Credential in local `.env` comment | [§1.4](#i4) |
| I5 | Medium | Floating container image tags | [§1.4](#i5) |
| A1 | High | Signup race → unhandled 500 (no transaction) | [§1.5](#a1) |
| A2 | High | No rate limiting on auth endpoints | [§1.5](#a2) |
| A3 | High | Open CORS | [§1.5](#a3) |
| A4 | Medium | No security headers (helmet) | [§1.5](#a4) |
| A5 | Medium | `console.log` of request bodies in dead middleware | [§1.5](#a5) |
| A6 | Medium | Mass-assignment surface + unvalidated tutorial endpoints | [§1.5](#a6) |
| A7 | Medium | No body-size guard; no TLS in-compose | [§1.5](#a7) |
| A8 | High | Cache correctness: check-after-read, no invalidation, shape drift | [§1.5](#a8) |
| C1 | Medium | bcrypt rebuild hack in Dockerfile | [§1.6](#c1) |
| C2 | Medium | Config drift (`CACHE_TTL` vs `REDIS_TTL`, queue env ignored) | [§1.6](#c2) |
| C3 | Medium | CI blind spots (no scans, tests inside image build) | [§1.6](#c3) |

### 1.1 Authentication & token handling

#### S1

**Plaintext password inside JWT** (Critical)

Login calls `authService.authenticate({ id, email, password })` and `JwtGenerateAuthTokenUseCase` signs the whole object — the password is base64-visible in every token payload, so anyone holding a token (or a log/Redis dump of one) recovers the password. The DTO even declares it: `IJwtPayloadDTO.password`.

| | |
| --- | --- |
| Location | `src/application/users/user.service.ts:45-49` · `src/application/auth/use_case/generate_token.use_case.ts:10-11` · `src/domain/DTO/auth/jwt/payload.dto.ts` |
| Recommended fix | Sign only `{ sub: user.id, email }`; align `JwtStrategy.validate` with actual claims; rotate the signing secret once fixed (all existing tokens contain the password). |

#### S2

**JWT secret read too early** (High)

`JwtModule.register({ secret: EnvService.ENV.JWT.SECRET })` executes during decorator evaluation — before `@nestjs/config` loads `.env`. Local dev without exported env vars → `undefined` secret → `jwt.sign` throws. Works in Docker only because compose injects `.env` into the shell env. Zero startup validation: a missing secret fails with an opaque runtime error.

| | |
| --- | --- |
| Location | `src/application/auth/auth.module.ts:17-19` · `src/infra/config/env/env.service.ts:8-17` |
| Recommended fix | Register the JWT module asynchronously (`JwtModule.registerAsync` with `EnvService`), or load config before module evaluation; add zod/Joi bootstrap validation for `JWT_SECRET`, `ENCRYPT_KEY`, `DATABASE_URL`. |

#### S3

**`sub`/`username` claim mismatch** (High)

The strategy validates `payload.sub`/`payload.username` (`req.user = { userId: undefined, username: undefined }` on every authenticated request) because tokens are signed with `{ id, email, password }`. Guarded routes cannot identify the caller.

| | |
| --- | --- |
| Location | `src/application/auth/strategy/jwt/jwt.strategy.ts:17-19` vs `generate_token.use_case.ts:10-12` |
| Recommended fix | One of the two worlds is wrong — fix the token to carry `sub` + standard claims and make the strategy read them; add a unit test that signs and validates a token end-to-end. |

#### S4

**bcrypt cost factor 1** (High)

`HASH_ROUNDS=1` in `.env.example` — trivially brute-forceable; OWASP minimum is 10 (12 typical). `Number()` conversion has no fallback: if unset, `NaN` → bcrypt throws at signup.

| | |
| --- | --- |
| Location | `tutorialls/.env.example:17` · `src/application/users/use_case/hash_password.use_case.ts:10` |
| Recommended fix | Default `HASH_ROUNDS ≥ 10` (12 recommended); validate at bootstrap; rehash on next login after changing the factor. |

#### S5

**No refresh tokens / revocation / token versioning** (Medium)

A 1-day token cannot be invalidated after password change; the `authToken` column exists in the schema but is never written.

| | |
| --- | --- |
| Location | `prisma/schema.prisma:21` · `.env.example:11` |
| Recommended fix | Add token versioning (`authToken` write on password change) or a revocation list; document the session-kill story. |

#### S6

**Dead local-auth path with type confusion** (Medium)

`LocalStrategy.validate` returns a JWT string as the "user" object; `LocalAuthGuard` is never referenced by any route. Currently masked by being dead code; if wired, auth breaks confusingly.

| | |
| --- | --- |
| Location | `src/application/auth/strategy/local/local.strategy.ts:16-18` · `src/application/auth/guards/local.guard.ts` |
| Recommended fix | Delete the local strategy + guard (or rework to a real user object) as part of the dead-code pass. |

#### S7

**Email-enumeration timing oracle** (Medium)

Login runs `bcrypt.compare` only if the user exists — attackers can time responses to enumerate emails. Failed attempts are not throttled.

| | |
| --- | --- |
| Location | `src/application/users/user.service.ts:33-43` |
| Recommended fix | Dummy-compare against a fixed hash when the user is not found; add throttling (see [A2](#a2)). |

### 1.2 Encryption (weakest area)

#### E1

**Reused static IV** (Critical)

`private readonly iv = randomBytes(16)` is initialized once per singleton — every encryption reuses the same IV. AES-CTR (stream mode) with fixed IV + fixed key enables keystream-reuse attacks and account fingerprinting (identical plaintext → identical ciphertext).

| | |
| --- | --- |
| Location | `src/application/encryption/use_case/user/encrypt.use_case.ts:11` |
| Recommended fix | Generate a fresh random IV per message (it already rides along in the output). |

#### E2

**Shared symmetric key with every client** (Critical)

The decrypt contract implies clients encrypt with the server's `ENCRYPT_KEY`/IV scheme — any client can decrypt any other client's payload. Zero confidentiality boundary; transport security belongs to TLS.

| | |
| --- | --- |
| Location | `src/domain/DTO/security/user/decrypt.dto.ts` · `.env.example:13-15` |
| Recommended fix | Drop client-side encryption for transport protection; rely on TLS. If symmetric encryption must exist, define a real key-agreement/storage model. |

#### E3

**Unauthenticated cipher** (High)

`aes-256-ctr` has no authentication tag; combined with a reused IV, ciphertext is malleable.

| | |
| --- | --- |
| Location | `.env.example:14` · `encrypt.use_case.ts:19-26` |
| Recommended fix | Move to `aes-256-gcm` with per-message random IV, or eliminate client-side crypto entirely (preferred). |

#### E4

**Invalid example AES key** (High)

`ENCRYPT_KEY="256-bit key"` is 10 bytes; `createCipheriv` requires 32 bytes for aes-256 → runtime `Invalid key length` the first time a ciphertext is created. No key-derivation, no startup validation.

| | |
| --- | --- |
| Location | `tutorialls/.env.example:13` · `encrypt.use_case.ts:14-19` |
| Recommended fix | Derive the key (e.g. `createHash('sha256').update(key)` for a passphrase) or require exact 32-byte keys; validate length at bootstrap. |

#### E5

**No error handling on decrypt/parse failures** (Medium)

`JSON.parse` of decrypted data throws raw `SyntaxError` → 500 with internals; `DecryptUserPipe.transform` crashes with TypeError when the body is `undefined` (checks `value.ciphertext` on an undefined value) or when `ciphertext` is `null`.

| | |
| --- | --- |
| Location | `src/application/encryption/use_case/user/decrypt.use_case.ts:30` · `src/application/users/pipe/encryption/encryption.pipe.ts:19-21` |
| Recommended fix | Validate input shape first; map parse failures to `InvalidDataError` (400). |

#### E6

**In-band IV + breakpoint coupling** (Medium)

Output `iv + breakpoint + ciphertext`; split on the breakpoint. The repeated leading IV bytes leak message equality.

| | |
| --- | --- |
| Location | `decrypt.use_case.ts:17-20` |
| Recommended fix | Resolved by E1/E3 rework (per-message IV, structured envelope). |

### 1.3 Error handling & information disclosure

#### F1

**Double response write** (Critical)

The filter writes `response.status(…).json(…)` then calls `super.catch(exception, host)` — a second write on every exception (`ERR_HTTP_HEADERS_SENT`, undefined client behavior).

| | |
| --- | --- |
| Location | `src/exception.filter.ts:11-24` |
| Recommended fix | Remove the `super.catch` call after the manual write; keep a single write path. |

#### F2

**Raw exception messages leak** (High)

Non-`AppError` exceptions return `exception.message` verbatim with status 500 — Prisma internals, Zod serialized messages, stack fragments reach the client. `Logger.error` also logs full exception + response body on every failure.

| | |
| --- | --- |
| Location | `src/exception.filter.ts:14-18,21-22` |
| Recommended fix | Return a generic 500 with a correlation id; log details server-side only. |

#### F3

**Error shape inconsistency** (Low)

`AppError.toStruct()` drops the `url` hint; the non-AppError branch has `name` + `message` only. Error contract is not tested.

| | |
| --- | --- |
| Location | `src/exception.filter.ts` · `src/internal/lib/error/app.error.ts` |
| Recommended fix | Single envelope shape + contract tests (tracked in [docs/testing.md](testing.md#9-qa-roadmap)). |

### 1.4 Infrastructure & secrets

#### I1

**Hardcoded RabbitMQ credentials + duplicate registration** (Critical)

`amqp://admin:admin@rabbitmq:5672` in the first of two duplicate `ClientsModule.register` calls for token `'RABBITMQ_SERVICE'` (the async registration may win or lose — registration-order dependent).

| | |
| --- | --- |
| Location | `src/application/tutorial/tutorial.module.ts:35-47` |
| Recommended fix | Delete the static registration; keep only `registerAsync` reading `RABBITMQ_URL`; credentials from env. |

#### I2

**Committed PostgreSQL data directory** (High)

~1,281 binary files including `pg_hba.conf` (auth config); if ever holding real rows, this is a credential/PII leak vector and permanent repo bloat.

| | |
| --- | --- |
| Location | `tutorialls/.docker/data/db/**` (tracked since commit `ee12b16`) |
| Recommended fix | `git rm -r --cached` + ignore; rotate DB/RabbitMQ/`JWT_SECRET`/`ENCRYPT_KEY` (they may exist in the dump); consider history purge (BFG/filter-repo); see [docs/devops.md](devops.md#5-database-lifecycle). |

#### I3

**Weak committed defaults** (High)

`JWT_SECRET="secret"`, `HASH_ROUNDS=1`, Postgres `root/root`, RabbitMQ `admin/admin`, pgAdmin `admin`, Redis passwordless. Fine as a demo template, dangerous if copied to prod.

| | |
| --- | --- |
| Location | `tutorialls/.env.example:10,17` · `docker-compose.yaml:20-23,47-48,58-59` |
| Recommended fix | Generate real secrets for any non-demo env (`openssl rand -base64 32`), enforce via env validation, rotate on first prod setup. |

#### I4

**Credential in local `.env` comment** (Medium)

The local (untracked) `.env` contains a commented-out Render Postgres URL with a plaintext DB password. Rotate that credential; never paste secrets even in comments. Git history for `.env` is clean (never committed — verified).

| | |
| --- | --- |
| Location | local `tutorialls/.env` |
| Recommended fix | Rotate; adopt a secret manager or `.env` templates without values. |

#### I5

**Floating container image tags** (Medium)

`postgres:latest`, `redis`, `dpage/pgadmin4` in compose — supply chain drift.

| | |
| --- | --- |
| Location | `tutorialls/docker-compose.yaml:16,30,53` |
| Recommended fix | Pin versions (e.g. `postgres:16-alpine`, `redis:7-alpine`). |

### 1.5 Application hardening

#### A1

**Signup race → unhandled 500** (High)

Check-then-insert with no `$transaction`: concurrent duplicate emails pass the policy check; the loser hits Prisma `P2002`, unmapped → 500 instead of 409.

| | |
| --- | --- |
| Location | `src/application/users/user.service.ts:54-60` |
| Recommended fix | `prisma.$transaction` or catch-and-map `P2002` → `UserAlredyExistsError`; map `P2025` → 404 for tutorial update/delete. |

#### A2

**No rate limiting** (High)

`/user/login` (and signup) are wide open to brute force; no `@nestjs/throttler` anywhere.

| | |
| --- | --- |
| Location | `package.json` deps |
| Recommended fix | Add `@nestjs/throttler` on `/user/*` (login especially); consider per-IP + per-account limits. |

#### A3

**Open CORS** (High)

`app.enableCors()` with no options — every origin, method, header reflected.

| | |
| --- | --- |
| Location | `src/main.ts:10` |
| Recommended fix | Scope to configured origins (env-driven allowlist). |

#### A4

**No security headers** (Medium)

No `helmet` (no CSP, `X-Content-Type-Options`, …).

| | |
| --- | --- |
| Location | `package.json` deps |
| Recommended fix | Add `helmet`. |

#### A5

**`console.log` of request bodies** (Medium)

Logs raw passwords/PII before encryption in dead middleware.

| | |
| --- | --- |
| Location | `src/application/users/middleware/security/security.middleware.ts:14` |
| Recommended fix | Delete the middleware (dead code) and never log bodies. |

#### A6

**Mass-assignment surface + unvalidated tutorial endpoints** (Medium)

Global `ValidationPipe` has `whitelist`/`forbidNonWhitelisted` commented out; `/tutorial/*` bodies and `:id` params are entirely unvalidated; pagination is stringly-typed with no caps (`page=abc` → NaN skip → 500; unbounded `limit` → memory DoS on the **public** list route).

| | |
| --- | --- |
| Location | `src/main.ts:18-19` · `src/application/tutorial/tutorial.controller.ts` · `src/application/tutorial/repository/prisma/tutorial.repositiry.ts:47` |
| Recommended fix | Re-enable whitelisting; add zod/class-validator DTOs for tutorial endpoints; validate `page ≥ 1`, `limit ≤ 100`; UUID validation on `:id`. |

#### A7

**No body-size guard; no TLS in-compose** (Medium)

Express default 100kb body limit only; the client "encryption" masks the absence of real transport security.

| | |
| --- | --- |
| Location | `docker-compose.yaml` |
| Recommended fix | Reverse-proxy TLS (e.g. Caddy/nginx/Traefik) or terminate at the platform edge; keep payload crypto only if a real design justifies it. |

#### A8

**Cache correctness: check-after-read, no invalidation, shape drift** (High)

`TutorialService` executes the use case **before** checking Redis on every read path (caching saves no DB work); there is no invalidation on create/update/delete (stale reads until TTL — which is misconfigured, see [C2](#c2)); and cached payloads serialize the entity's private `autor` field, so cache-hit responses differ in shape from cache-miss responses.

| | |
| --- | --- |
| Location | `src/application/tutorial/tutorial.service.ts:86-140` · `src/domain/entity/tutorial.entity.ts:21,48` |
| Recommended fix | Read cache first (or drop caching); cache `toDTO()` output, not entities; invalidate on mutations; align TTL env names. |

### 1.6 Supply chain & CI

#### C1

**bcrypt rebuild hack** (Medium)

`RUN npm uninstall bcrypt && npm i bcrypt` unpins from the lockfile, needs network at image build, and can fail on `node:20-slim` (no build toolchain). Root cause: missing `.dockerignore` lets host `node_modules` overwrite the image's.

| | |
| --- | --- |
| Location | `tutorialls/Dockerfile:28` |
| Recommended fix | Add `.dockerignore`; pruned prod deps (`npm ci --omit=dev`); delete the hack. |

#### C2

**Config drift** (Medium)

`EnvService` reads `CACHE_TTL` while env files define `REDIS_TTL` (cache TTL silently `undefined`); `RABBITMQ_QUEUE_DURABLE` read but never defined; `RABBITMQ_QUEUE` configured but ignored by the hardcoded `tutorials_queue` emit path.

| | |
| --- | --- |
| Location | `src/infra/config/env/env.service.ts:29,34` · `tutorialls/.env.example:22` · `src/application/tutorial/tutorial.service.ts:31` |
| Recommended fix | Align names; env validation at bootstrap makes drift fail fast. |

#### C3

**CI blind spots** (Medium)

No lint/test coverage gate (tests run inside the image build only), no secret scan (gitleaks), no `npm audit`, no container scan/SBOM.

| | |
| --- | --- |
| Location | `.github/workflows/docker-publish.yml` |
| Recommended fix | Add fast-fail jobs + scans; see [docs/devops.md](devops.md#9-prioritized-improvements). |

### 1.7 Verified-clean areas

- ✅ **No SQL injection** — all queries go through Prisma parameterization (verified scan; `contains` wildcards `%`/`_` pass through to `ILIKE` — minor, unescaped, but not injectable).
- ✅ **No command injection, no `eval`, no `child_process`** usage; regexes are simple (no ReDoS).
- ✅ **`.env` never committed** (verified via `git log -- tutorialls/.env` — empty).
- ✅ **JWT verification defaults are correct**: `ignoreExpiration: false`, bearer extraction, HS256.
- ✅ **Third-party GitHub Actions pinned by SHA**; cosign signing on non-PR pushes with OIDC short-lived certs.
- ✅ **Non-root container** (`USER node`).

---

## 2. Security controls present

| Control | Status | Notes |
| --- | --- | --- |
| Password hashing | ✅ bcrypt | cost configurable via `HASH_ROUNDS` — default example `1` is a finding ([S4](#s4)) |
| JWT auth (+ expiry, ignoreExpiration: false) | ✅/⚠️ | present but payload defect ([S1](#s1)) + claim mismatch ([S3](#s3)) |
| `JwtAuthGuard` on 6/7 tutorial routes | ✅ | `GET /tutorial` public — see [docs/api.md](api.md#8-known-discrepancies) |
| Request-body encryption | ⚠️ | AES-256-CTR — [E1](#e1)/[E2](#e2)/[E3](#e3) defects make it security theater today |
| Zod input validation | ⚠️ | `/user/*` only; `/tutorial/*` unvalidated ([A6](#a6)) |
| Global exception filter | ⚠️ | present, double-write + leak bugs ([F1](#f1)/[F2](#f2)) |
| `.env` hygiene | ✅ | gitignored, never committed |
| CORS | ❌ | open by default ([A3](#a3)) |
| Security headers (helmet) | ❌ | absent ([A4](#a4)) |
| Rate limiting / brute-force protection | ❌ | absent ([A2](#a2)) |
| Secret rotation policy | ❌ | none; `JWT_SECRET`/`ENCRYPT_KEY`/infra creds unchanged since early commits |
| Secrets scan / SAST / dependency audit in CI | ❌ | absent ([C3](#c3)) |

---

## 3. Gaps

1. **Transport security is missing** — plain HTTP; the client-side cipher masks this instead of fixing it ([E2](#e2)/[A7](#a7)).
2. **No rate limiting anywhere** — login brute force, signup spam, public pagination abuse ([A2](#a2)/[A6](#a6)).
3. **No security headers / CORS scoping** ([A3](#a3)/[A4](#a4)).
4. **No secret rotation or breach-response story** — worsened by the committed DB volume ([I2](#i2)) and the local `.env` comment ([I4](#i4)).
5. **No env validation at bootstrap** — missing/invalid secrets fail late and opaquely ([S2](#s2), [S4](#s4), [C2](#c2)).
6. **Security-critical code is the least tested** — JWT strategy/use cases, crypto, guards, filter, repositories all 0% coverage (see [docs/testing.md](testing.md#5-coverage-gaps)).
7. **No audit/forensics** — no request-id correlation, no structured logs (see [docs/devops.md](devops.md#7-observability)).

---

## 4. Remediation roadmap

### Sprint 1 — stop the bleeding (Critical)

1. Remove `password` from the JWT payload; sign `{ sub: user.id, email }`; fix the strategy to read the actual claims ([S1](#s1), [S3](#s3)). Rotate the JWT secret on deploy so old tokens die.
2. Fix the exception filter: single response write; generic 500 + correlation id; log server-side only ([F1](#f1), [F2](#f2)). Add a unit spec.
3. Rework encryption: per-message random IV; switch to `aes-256-gcm` or drop client-side encryption for TLS; validate key length at startup ([E1](#e1), [E2](#e2), [E3](#e3), [E4](#e4)). Delete `SecurityMiddleware` + its `console.log` ([A5](#a5)).
4. Map Prisma errors: `P2002` → 409, `P2025` → 404; wrap signup in a transaction ([A1](#a1)).
5. Delete the hardcoded RabbitMQ registration; keep `registerAsync` ([I1](#i1)). Untrack + ignore `.docker/data/db` ([I2](#i2)).

### Sprint 2 — harden the surface (High)

1. Add `@nestjs/throttler` on `/user/*` with sensible login limits ([A2](#a2)); scope CORS via env allowlist ([A3](#a3)); add `helmet` ([A4](#a4)).
2. Real validation for `/tutorial/*`: zod/class-validator DTOs, pagination caps (`page ≥ 1`, `limit ≤ 100`), UUID `:id`, re-enable `whitelist` + `forbidNonWhitelisted` ([A6](#a6)).
3. Bootstrap env validation (zod/Joi) for `JWT_SECRET`, `ENCRYPT_KEY`, `HASH_ROUNDS`, `DATABASE_URL`, `CACHE_TTL`/`REDIS_TTL` alignment ([S2](#s2), [S4](#s4), [C2](#c2)).
4. Hashing: `HASH_ROUNDS ≥ 10` default; rehash on login when the stored cost differs ([S4](#s4)).
5. Fix cache correctness: cache `toDTO()` output, read cache first, invalidate on mutations, align TTL ([A8](#a8)).

### Sprint 3 — engineering hygiene (Medium/Low)

 1. Dead-code removal pass (`LocalStrategy`/`LocalAuthGuard`, `SecurityMiddleware`, `findById` stub, `bcrypt.engine.ts`, `startAllMicroservices`, `a.js`) ([S6](#s6), [A5](#a5)).
 2. Registry/token consistency: rename typos + add a container-resolution test (see [docs/architecture.md](architecture.md#53-assessment)).
 3. CI: secret scan (gitleaks), `npm audit`, container scan (Trivy), SBOM, dedicated test job ([C3](#c3)).
 4. Refresh/revocation story: `authToken` versioning or a blacklist ([S5](#s5)); TLS termination ([A7](#a7)); observability (see [docs/devops.md](devops.md#9-prioritized-improvements)).

---

*Evidence set: full source review (auth, encryption, users, tutorial, infra, errors), `.env.example`, `docker-compose.yaml`, `Dockerfile`, CI workflow, git history — compiled 2026-08-17. Raw appendices: [`docs/_drafts/01-architecture-map.md`](_drafts/01-architecture-map.md) §9 and [`docs/_drafts/02-code-analysis.md`](_drafts/02-code-analysis.md) §5-8.*
