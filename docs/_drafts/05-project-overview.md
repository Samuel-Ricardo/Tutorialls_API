# 05 — Tutorialls API: Product & Business Overview

> **Type:** Draft (analysis artifact)
> **Source:** code at `tutorialls/src`, `tutorialls/prisma`, git history (259 commits), root `README.md`, `tutorialls/README.md`
> **Compiled:** 2026-08-17 · **Status:** internal reference for docs consolidation

---

## 1. What the Product Does

**Tutorialls API** is a REST API for a tutorial content platform: users register and authenticate, then create, read, search, update, and delete tutorials. It is a personal portfolio project ("Application developed for explore my dev skills") built to demonstrate production-grade backend practices: Clean/Hexagonal architecture in NestJS, JWT auth, payload encryption, Redis caching, RabbitMQ eventing, and containerized deployment.

- **Repository layout:** monorepo-style root with a single NestJS app nested in `tutorialls/` (Docker context, package.json, source all live there).
- **Domain model** (`tutorialls/prisma/schema.prisma`, PostgreSQL):
  - `User`: `id` (uuid), `email` (unique), `password` (bcrypt hash), `authToken` (optional), timestamps.
  - `Tutorial`: `id` (uuid), `title`, `content`, `author` (plain string — **no FK to User**), timestamps.
- **Architecture:** three concentric layers — `domain/` (entities, DTOs, use-case & policy interfaces), `application/` (use-case impls, services, controllers, policies, pipes), `infra/` (Prisma engine, bcrypt engine, env config). DI via NestJS with a centralized token registry (`app.registry.ts`).
- **Key flows:** signup → login → JWT → protected tutorial CRUD; queries cached in Redis; every tutorial mutation emits an event to RabbitMQ (`tutorials_queue`); user auth payloads are AES-256-CTR encrypted end-to-end (client encrypts → API decrypts via `DecryptUserPipe`).

### 1.1 Business rules found in code (policies & constraints)

| Rule | Where | Behavior |
|---|---|---|
| User must NOT already exist to signup | `signup_alredy_exists.policy.ts` → `UserService.signup()` | If email taken → throws `UserAlredyExistsError` |
| User must already exist to login | `login_alredy_exists.policy.ts` → `UserService.login()` | If not found → throws `UserNotFoundError` |
| Password must be valid to login | `password_is_valid.policy.ts` → bcrypt compare | If mismatch → throws `InvalidCredentials` |
| Password minimum 8 chars; email format | Zod schemas `signup.schema.ts` / `login.schema.ts` | 400 on validation failure |
| Password stored only as bcrypt hash (10 rounds) | `hash_password.use_case.ts` + `HASH_ROUNDS=10` | Plain text never persisted |
| Auth payload encryption mandatory | `DecryptUserPipe` on `/user/*` + AES-256-CTR | Body must arrive encrypted (IV + breakpoint + ciphertext hex) |
| Mutations emit tutorial events | `TutorialService.emit()` → RabbitMQ `tutorials_queue` | create/update emit full DTO; delete emits empty payload |
| JWT required for tutorial writes & filters | `JwtAuthGuard` | All routes except public list |
| Search is case-insensitive substring | Prisma `contains`, `mode: 'insensitive'` | title / author / content keyword |
| Pagination contract | `page`, `limit` query params; `skip=(page-1)*limit` | Read queries return `{items, total, limit, page}` |

## 2. Feature Inventory (Endpoints)

Base URL: `http://localhost:3000` · API docs (Swagger): `/api/docs` · Live: `https://tutorialls-api-sha256.onrender.com`

### Auth (`application/users/users.controller.ts`, controller `user`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/user/signup` | — | Register user (decrypt → Zod validate → duplicate policy → hash → create) |
| POST | `/user/login` | — | Authenticate (exists policy → password policy → JWT sign) → `{ token }` |
| GET | `/` | — | Health/app hello (framework default) |

### Tutorials (`application/tutorial/tutorial.controller.ts`, controller `tutorial`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/tutorial` | JWT | Create tutorial; emits `ITutorialUpdatedEvent` → RabbitMQ |
| GET | `/tutorial` | **public** | List all, paginated (`page`, `limit`); Redis-cached |
| GET | `/tutorial/title` | JWT | Filter by title substring (insensitive), paginated; cached |
| GET | `/tutorial/author` | JWT | Filter by author substring (insensitive), paginated; cached |
| GET | `/tutorial/content` | JWT | Filter by keyword in content (insensitive), paginated; cached |
| PATCH | `/tutorial/:id` | JWT | Update title/content/author; emits event |
| DELETE | `/tutorial/:id` | JWT | Delete by id; emits event (no payload) |

### Cross-cutting capabilities

- **Encryption:** AES-256-CTR request-body cipher (`node:crypto`), IV hex + `ENCRYPT_BREAKPOINT` delimiter + ciphertext; `SecurityMiddleware` (encrypt) + `DecryptUserPipe` (decrypt).
- **Validation:** Zod schemas via `ZodValidationPipe`; global Nest `ValidationPipe` (transform on; `whitelist`/`forbidNonWhitelisted` intentionally commented out in `main.ts`).
- **Caching:** Redis via `@nestjs/cache-manager`; keys `tutorial:{op}:{limit}:{page}`; TTL 5s (`REDIS_TTL=5`); read-through (check → miss → set).
- **Messaging:** RabbitMQ client proxy (`amqp-connection-manager`), queue `tutorials_queue` (env `RABBITMQ_QUEUE`), connect/close lifecycle hooks on `TutorialService`.
- **Auth internals:** Passport `local` + `jwt` strategies, custom `JwtAuthGuard`/`LocalGuard`, token generate/validate use-cases; JWT expiry 1 day.
- **Error handling:** global `ExceptionFilter` (HttpAdapterHost) mapping domain errors (`UserAlredyExistsError`, `UserNotFoundError`, `InvalidCredentials`, etc.) to HTTP responses.
- **Observability/ops:** Swagger UI, Docker + docker-compose (postgres, redis, rabbitmq:3-management-alpine, pgadmin), Dockerfile with multi-stage-ish build (`build:docker` = format → lint → test → build), GitHub Actions publish to GHCR with cosign signing, Prisma migrations + DB dump.

**Environment config** (`.env.example`): `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `ENCRYPT_KEY`, `ENCRYPT_ALGORITHM`, `ENCRYPT_BREAKPOINT`, `HASH_ROUNDS`, `REDIS_HOST/PORT/TTL`, `RABBITMQ_URL/HOST/PORT/USER/PASS/QUEUE`.

## 3. Git History Analysis

- **Commits:** 259 total · **Authors:** 1 person (236 `samuel_ricardo` + 23 `Samuel_Ricardo` — same human, inconsistent git identity case) · **Activity window:** ~2024-08-20 → 2024-09-02 (≈2-week build sprint; **no commits since 2024-09-02** — project likely dormant/archived in practice).
- **Branch strategy (GitHub Flow + branch types):**
  - `main` (production, protected, receives merge PRs) and `develop` (integration).
  - `feature/*` — e.g., `feature/domain_tutorial`, `feature/encryption`, `feature/validation`, `feature/user_domain`, `feature/config/env`, `feature/error_handler`, `feature/setup_database`, `feature/setup_docs`.
  - `bugfix/*` — `bugfix/config_module`; `hotfix/*` — `hotfix/fix_cors`.
  - Merge pattern visible in history: `feature/* → develop` (PRs #13, #15), `develop → main` (PRs #9, #11, #14), and direct-to-main hotfix/bugfix (PRs #10, #12). Up to PR #15.
- **Commit convention:** structured format `[ <emoji> ] | <verb>: <noun subject> (<scope>)` where the scope is a layering tag, e.g. `(module::application)`, `(module::domain)`, `(module::infra)`, `(app::database::prisma)`, `(app::test)`, `(project::env)`. Verb set: `create`, `implement(s)`, `update`, `fix`, `setup`, `add`, `use`, `delete`, `rename`. Emoji taxonomy observed: `:sparkles:` new code, `:label:` DTOs, `:card_file_box:` repositories/migrations/models, `:passport_control:` security (guards/use-cases/services), `:syringe:` DI/registries, `:video_game:` controllers, `:white_check_mark:` tests, `:key:` env config, `:construction_worker:` docker-compose, `:heavy_plus_sign:` deps, `:bug:`/`:pencil2:` fixes, `:recycle:` renames, `:fire:` deletions, `:cloud:` RabbitMQ, `:gear:` scripts, `:memo:` docs (also occasional non-conforming plain commits, e.g. "Update hash_password.use_case.ts", ".").
- **Workflow hints:** PR-based delivery to `main` (all merges via "Merge pull request #N"), feature branches per domain slice (tutorial domain, user domain, encryption, validation), sequential delivery in small cohesive commits; husky + lint-staged hooks enforce lint/tests before commit (`test:staged` script); test commits (`:white_check_mark:`) interspersed with features (auth tests, controller/spec files, unit specs for zod pipe, middleware, services).
- **Notable one-offs:** DB dump committed (`app::database`), typos in commit scope (`doccker::container`) and a typo'd filename `tutorial.repositiry.ts` in code.

## 4. Existing README Content & Quality

### Root `README.md` (243 lines) — **decent branding, thin substance**

What it documents: product blurb ("full stack tutorial platform… consume tutorials and search with filters…"), badges/social links, tech list (20+ items incl. Clean Architecture, Scalability), live deployment links (Render API, hosted Postgres/Redis, CloudAMQP, Swagger), performance screenshots (unverifiable static images), Docker run instructions (`docker-compose up --build`, image pull `ghcr.io/samuel-ricardo/tutorialls_api:main`), author section.

Quality evaluation:
- ✅ Good runway/quickstart for Docker users; live environment links; decent visual polish.
- ❌ No endpoint documentation (barely mentions JWT/Redis/RabbitMQ in one paragraph); no architecture explanation; no config/env table; no testing or CI/CD section; no license; broken/misleading bits: header says "Employee Dashboard", the "FRONTEND Repository" link actually points to the API repo, PostgreSQL shown at Mongo-style port `27017`, dead custom badges, `herf` typos in anchors, unstyled stray images.
- Mixed EN/PT content — fine for a portfolio, friction for international contributors.

### `tutorialls/README.md` (85 lines) — **stale framework boilerplate**

The default NestJS starter README (Description/Setup/Compile/Run tests/Resources/Support/License for Nest itself). Completely generic; describes NestJS, not this project; not updated since scaffolding. Alternative to documenting as a second README: convert to an architecture/domain reference page targeted at developers working inside the package (or delete and point to root).

### Overall docs gap
Repository has **no** `docs/` folder before this draft, no API reference, no architecture decision records, no roadmap, no contribution guide, no license file, no changelog. README is the only "documentation" and the inner README is boilerplate.

## 5. Target Users & Use Cases

| Segment | Use case |
|---|---|
| **Primary (stated):** the author | Portfolio/showcase — "explore my dev skills"; demonstrates NestJS, clean architecture, messaging, caching, crypto, CI/CD |
| **Product consumers** | End users of the tutorial platform: read/search tutorials (public list), registered authors manage their tutorials (JWT-guarded CRUD) |
| **Technical consumers** | Frontend client (README references a frontend repo) consuming the REST API with encrypted payloads + JWT; developers onboarding the codebase |

**Roadmap hints found in code/comments/store:**
- `main.ts`: `ValidationPipe` hardening (`whitelist`, `forbidNonWhitelisted`) is implemented-but-commented — likely intended tightening.
- `docker-publish.yml`: scheduled nightly build cron is commented out (could be re-enabled).
- Branch names imply planned/finished workstreams: `feature/setup_docs` (Swagger), `feature/error_handler` (ExceptionFilter exists), `feature/config/env` (env config exists), `feature/validation` (Zod), `feature/encryption` (AES).
- README "Scalability" mention + RabbitMQ/Redis adoption suggest intent to expand event-driven features (currently only `tutorials_queue` outbound events; no consumer yet).
- No `TODO`/`FIXME`/`HACK` markers in source — no explicit self-documented roadmap.

## 6. Recommended README / Docs Structure

Proposed outline for the consolidated root `README.md` (with `docs/` folder absorbing depth):

```text
1.  Header — name, one-liner, live link, badges (build, GHCR, license placeholder)
2.  Overview — what it is, problem it solves, key capabilities (3–5 bullets)
3.  Architecture — layer diagram (domain/application/infra), request flow
    (encrypt → decrypt pipe → Zod → policies → use-case → Prisma),
    event flow (mutations → RabbitMQ), cache flow (Redis read-through)
4.  Tech Stack — table: NestJS 10, TS, Prisma/PostgreSQL, Redis, RabbitMQ,
    JWT/Passport, bcrypt, AES-256-CTR, Zod, Jest, Docker, GHCR, Render
5.  Getting Started — prerequisites (Docker), env setup (table of all
    ENV vars with purpose), docker-compose up, local run without Docker,
    GHCR image pull
6.  API Reference — endpoint table (this doc's §2) + link to Swagger and
    docs/api.md; auth model (encrypted body, JWT header); error model
    (custom errors → HTTP statuses)
7.  Domain Rules — policy table (this doc's §1.1)
8.  Testing — unit (jest), e2e, coverage, husky/lint-staged gates; CI note
9.  Deployment & CI/CD — Render services (API/Postgres/Redis), CloudAMQP,
    GHCR workflow (push/PR → build+sign), docker-compose topology
10. Repository Structure — root vs tutorialls/ map, layer conventions,
    naming conventions (registry tokens, `.repositiry` typo to fix)
11. Development Guide — commit convention ([ :emoji: ] | verb: subject (scope)),
    branch strategy (feature/* → develop → main, bugfix/*, hotfix/*)
12. Roadmap — hardening (ValidationPipe whitelist), event consumers,
    cron builds (or fold into GitHub Issues)
13. License & Credits — add explicit license; author links
```

Complementary docs to create under `docs/`: `01-overview.md` (this one, cleaned), `02-architecture.md` (ADRs), `03-api.md` (endpoint reference), `04-guides.md` (dev/ops runbooks), plus replacing `tutorialls/README.md` boilerplate with a short package-level readme (or removing it).

---

**Appendix — raw evidence pointers**

- Endpoints: `tutorialls/src/application/{tutorial/tutorial.controller.ts, users/users.controller.ts}`
- Policies: `tutorialls/src/application/users/policy/*.ts`; service orchestration: `user.service.ts`
- Caching & events: `tutorialls/src/application/tutorial/tutorial.service.ts`
- Schema: `tutorialls/prisma/schema.prisma` + 7 migrations under `tutorialls/prisma/migrations/`
- Deploy/DX: `.github/workflows/docker-publish.yml`, `tutorialls/docker-compose.yaml` (root file name in README), `tutorialls/.env.example`
- Git: 259 commits, 1 author, PRs ≤ #15, branches `main`/`develop`/`feature/*`/`bugfix/*`/`hotfix/*`