# API Reference — Tutorialls API

> Audience: client developers (frontend, mobile, scripts), QA engineers
> Base URL: `http://localhost:3000` (docker-compose) · Live: `https://tutorialls-api-sha256.onrender.com`
> Interactive docs: Swagger at `/api/docs`
> All examples are JSON unless stated otherwise.

---

## Table of contents

- [1. Conventions](#1-conventions)
- [2. Health check](#2-health-check)
- [3. Authentication](#3-authentication)
- [4. User endpoints](#4-user-endpoints)
- [5. Tutorial endpoints](#5-tutorial-endpoints)
- [6. Error model](#6-error-model)
- [7. Validation rules](#7-validation-rules)
- [8. Known discrepancies](#8-known-discrepancies)

---

## 1. Conventions

| Convention | Value |
| --- | --- |
| Authentication | `Authorization: Bearer <token>` header (`passport-jwt`, HS256) |
| Request body encryption | Optional. `POST /user/*` accepts plain JSON **or** `{ "ciphertext": "<iv-hex>:<cipher-hex>" }` (AES-256-CTR, see [§3](#3-authentication)) |
| Validation | Zod schemas on `/user/*` only; **no validation** on `/tutorial/*` (see [§7](#7-validation-rules)) |
| Pagination | Query params `page`, `limit`; response `{ items, total, limit, page }` |
| Timestamps | ISO-8601 (`created_at`, `updated_at`); camelCase in DB (`createdAt`), snake_case in DTOs |

Endpoints at a glance:

| # | Method | Path | Auth | Description |
| --- | -------- | ------ | ------ | ------------- |
| 1 | GET | `/` | — | App hello (framework default) |
| 2 | POST | `/user/signup` | — | Register user |
| 3 | POST | `/user/login` | — | Authenticate → `{ token }` |
| 4 | POST | `/tutorial` | JWT | Create tutorial |
| 5 | GET | `/tutorial` | **public** | List all tutorials, paginated |
| 6 | GET | `/tutorial/title` | JWT | Filter by title substring |
| 7 | GET | `/tutorial/author` | JWT | Filter by author substring |
| 8 | GET | `/tutorial/content` | JWT | Filter by keyword in content |
| 9 | PATCH | `/tutorial/:id` | JWT | Update tutorial |
| 10 | DELETE | `/tutorial/:id` | JWT | Delete tutorial |

---

## 2. Health check

### `GET /` — App hello

Returns the stock Nest framework greeting.

**Response `200`**

```json
"Hello World!"
```

No health/readiness endpoint exists (no `/health`, no `/metrics`) — planned on the [roadmap](../README.md#roadmap).

---

## 3. Authentication

### Token model

- Tokens are signed **HS256** via `@nestjs/jwt`, expiry from `JWT_EXPIRES_IN` (example `1d`).
- The signed payload today is `{ id, email, password }` — **the plaintext password is embedded in the token** (see [docs/security.md](security.md#s1)). Do not rely on the payload claims for identity beyond this being fixed: the validation strategy reads `sub`/`username`, which are never present.
- There is no refresh-token flow, no revocation, and no token versioning.

### Request body encryption (optional)

`POST /user/signup` and `POST /user/login` accept either:

1. **Plain JSON** — `{ "email": "…", "password": "…" }` (the `DecryptUserPipe` passes through when `ciphertext` is absent), or
2. **Encrypted payload** — `{ "ciphertext": "<iv-hex><breakpoint><cipher-hex>" }` where:
   - `iv-hex` = 16-byte initialization vector in hex
   - `breakpoint` = `ENCRYPT_BREAKPOINT` (example `:`)
   - `cipher-hex` = AES-256-CTR ciphertext of `JSON.stringify({ email, password })` in hex

> ⚠️ **Security notice:** the current AES-256-CTR scheme reuses one IV per process and relies on a server key shared with every client — it provides no real confidentiality boundary and its example key value (`"256-bit key"`) is not a valid 32-byte AES-256 key. Treat the ciphertext path as an experimental demo feature and prefer TLS. Details and remediation in [docs/security.md](security.md#e1).

---

## 4. User endpoints

### `POST /user/signup` — Register user

| Attribute | Value |
| --- | --- |
| Auth | none |
| Pipes | `DecryptUserPipe` → `ZodValidationPipe(SignupSchema)` |
| Request body | `{ email: string, password: string }` (or `{ ciphertext }`) |
| Success | `201` — empty body |
| Errors | `400` invalid data · `409` email already exists |

**Request**

```json
{
  "email": "sam@example.com",
  "password": "s3cret-pass"
}
```

**Response `201`** — empty body.

**Response `409`** — duplicate email:

```json
{
  "name": "UserAlredyExistsError",
  "message": "User Alredy Exists",
  "status": 409,
  "error": true
}
```

Server behavior: duplicate policy check → bcrypt hash (`HASH_ROUNDS`) → `prisma.user.create`. The signup path is **not transactional** — two concurrent signups with the same email race between the policy check and the insert; the loser surfaces a Prisma `P2002` error as a 500 instead of a clean 409 (tracked in [docs/security.md](security.md#a1)).

### `POST /user/login` — Authenticate

| Attribute | Value |
| --- | --- |
| Auth | none |
| Pipes | `DecryptUserPipe` → `ZodValidationPipe(LoginSchema)` |
| Request body | `{ email: string, password: string }` (or `{ ciphertext }`) |
| Success | `200` — `{ token }` |
| Errors | `400` invalid data · `404` user not found · `401` invalid credentials |

**Request**

```json
{
  "email": "sam@example.com",
  "password": "s3cret-pass"
}
```

**Response `200`**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6I…"
}
```

Server behavior: existence policy → bcrypt compare → JWT sign. There is no rate limiting on this endpoint (brute-force surface) and no dummy compare when the user is not found (email-enumeration timing oracle) — see [docs/security.md](security.md#a2).

---

## 5. Tutorial endpoints

### `POST /tutorial` — Create tutorial

| Attribute | Value |
| --- | --- |
| Auth | `Bearer` JWT required |
| Validation | **none** (no pipe, no DTO class) |
| Request body | `{ title: string, content: string, author: string }` |
| Success | `201` — tutorial DTO |
| Errors | `401` unauthorized · `500` unexpected |

**Request**

```json
{
  "title": "NestJS + Prisma in 10 minutes",
  "content": "A practical walkthrough…",
  "author": "samuel_ricardo"
}
```

**Response `201`**

```json
{
  "id": "6f0b2c3e-…",
  "title": "NestJS + Prisma in 10 minutes",
  "content": "A practical walkthrough…",
  "author": "samuel_ricardo",
  "created_at": "2026-08-17T12:00:00.000Z",
  "updated_at": "2026-08-17T12:00:00.000Z"
}
```

Emits `ITutorialUpdatedEvent` to RabbitMQ queue `tutorials_queue` (no consumer yet).

### `GET /tutorial` — List all (public)

| Attribute | Value |
| --- | --- |
| Auth | **none — the only public tutorial route** |
| Query | `page`, `limit` (unvalidated; see [§8](#8-known-discrepancies)) |
| Success | `200` — paginated |

**Request**

```text
GET /tutorial?page=1&limit=10
```

**Response `200`**

```json
{
  "items": [
    {
      "id": "6f0b2c3e-…",
      "title": "NestJS + Prisma in 10 minutes",
      "content": "A practical walkthrough…",
      "author": "samuel_ricardo",
      "created_at": "2026-08-17T12:00:00.000Z",
      "updated_at": "2026-08-17T12:00:00.000Z"
    }
  ],
  "total": 42,
  "limit": 10,
  "page": 1
}
```

### `GET /tutorial/title` — Filter by title

| Attribute | Value |
| --- | --- |
| Auth | JWT |
| Query | `title`, `page`, `limit` |
| Behavior | case-insensitive substring (`ILIKE %title%`), Redis-cached |

### `GET /tutorial/author` — Filter by author

| Attribute | Value |
| --- | --- |
| Auth | JWT |
| Query | `author`, `page`, `limit` |
| Behavior | case-insensitive substring, Redis-cached |

### `GET /tutorial/content` — Filter by keyword

| Attribute | Value |
| --- | --- |
| Auth | JWT |
| Query | `keyword`, `page`, `limit` |
| Behavior | case-insensitive substring over `content`, Redis-cached |

**Response `200`** (all three filters): same paginated shape as `GET /tutorial`.

### `PATCH /tutorial/:id` — Update

| Attribute | Value |
| --- | --- |
| Auth | JWT |
| Param | `:id` — UUID (unvalidated) |
| Request body | `{ title, content, author }` — **all fields required** (the DTO declares no optional fields, so this is a full replace in practice) |
| Success | `200` tutorial DTO |
| Errors | `401` · `404` (missing row → Prisma `P2025` surfaces as **500** today — not mapped) |

**Request**

```json
{
  "title": "NestJS + Prisma in 10 minutes (rev. 2)",
  "content": "Updated walkthrough…",
  "author": "samuel_ricardo"
}
```

**Response `200`** — updated tutorial DTO (same shape as create). Emits update event to RabbitMQ.

### `DELETE /tutorial/:id` — Delete

| Attribute | Value |
| --- | --- |
| Auth | JWT |
| Param | `:id` — UUID (unvalidated) |
| Success | `200` — `true` (or `false` if nothing matched...) |
| Errors | `401` · missing row → 500 (`P2025` unmapped) |

**Response `200`**

```json
true
```

Emits delete event (empty payload) to RabbitMQ.

---

## 6. Error model

Domain errors are mapped by the global `ExceptionFilter`:

| Error | HTTP status | Body shape |
| --- | --- | --- |
| `InvalidDataError` (Zod failures) | `400` | `{ name, message, status, error }` |
| `InvalidCredentials` | `401` | `{ name, message, status, error }` |
| `UserNotFoundError` | `404` | `{ name, message, status, error }` |
| `UserAlredyExistsError` | `409` | `{ name, message, status, error }` |
| Any other exception | `500` | `{ name, status, message, error }` — `message` echoes the raw exception (see [§8](#8-known-discrepancies)) |

Example 400 body:

```json
{
  "name": "InvalidDataError",
  "message": "[{\"code\":\"too_small\",\"minimum\":8,\"path\":[\"password\"],\"message\":\"String must contain at least 8 character(s)\",…}]",
  "status": 400,
  "error": true
}
```

There is no envelope convention across endpoints: signup returns empty, login `{ token }`, create/update return a DTO, delete returns a boolean, lists return `{ items, total, limit, page }`.

---

## 7. Validation rules

| Endpoint | Validated | Rules |
| --- | --- | --- |
| `POST /user/signup` | ✅ Zod `SignupSchema` | `email` — valid e-mail · `password` — string, min 8 chars |
| `POST /user/login` | ✅ Zod `LoginSchema` | same rules |
| `POST /tutorial` | ❌ none | any body accepted |
| `GET /tutorial` | ❌ none | `page`/`limit` accepted as raw strings |
| `GET /tutorial/title\|author\|content` | ❌ none | query params unvalidated |
| `PATCH /tutorial/:id` | ❌ none | body unvalidated; `:id` unvalidated |
| `DELETE /tutorial/:id` | ❌ none | `:id` unvalidated |

Global `ValidationPipe` is configured with `transform: true` only — `whitelist` and `forbidNonWhitelisted` are **commented out** in `main.ts`, so unknown body properties pass through everywhere. The class-validator decorators on the domain entities are effectively documentation (never invoked by the pipe).

---

## 8. Known discrepancies

Where the docs/code differ from what a client might expect:

| # | Discrepancy | Detail |
| --- | --- | --- |
| 1 | `GET /tutorial` is public while `GET /tutorial/title`, `/author`, `/content` are JWT-guarded — same data, three filter endpoints | `tutorial.controller.ts:37-58` — inconsistent auth surface; either protect all reads or none and fold filters into query params |
| 2 | PATCH is a full replace | `IUpdateTutorialDTO` marks all fields required; a true partial PATCH is not supported |
| 3 | Pagination arithmetic breaks on bad input | `page=abc` → `NaN` skip → 500; `page=0` → negative skip → error; no `limit` cap (memory DoS on the public route) |
| 4 | Swagger documents `'1,0'` as the version and describes plain-JSON bodies only | the `{ ciphertext }` contract and the `DecryptUserPipe` are not documented in Swagger metadata |
| 5 | e2e specs assert contradictory statuses | `users.controller.e2e-spec.ts` expects signup with password `'12345'` → 201 (Zod requires ≥ 8 → 400) and login → 500; the `intgration` spec expects wrong-creds → 401, implementation returns 404 `UserNotFoundError`. See [docs/testing.md](testing.md#6-e2e-assessment) |
| 6 | `UPDATE`/`DELETE` on missing rows return 500, not 404 | Prisma `P2025`/`P2002` errors are not mapped to domain errors |
| 7 | Swagger and `/` run on the same port; there is no `/health` | observability gap, see [docs/devops.md](devops.md#7-observability) |

---

*Source of record: compiled against `tutorialls/src/application/{users,tutorial}/*.controller.ts`, pipes, schemas, and repositories on 2026-08-17. Raw appendices: [`docs/_drafts/02-code-analysis.md`](_drafts/02-code-analysis.md) §2, [`docs/_drafts/05-project-overview.md`](_drafts/05-project-overview.md) §2.*
