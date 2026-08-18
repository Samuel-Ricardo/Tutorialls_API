# Architecture — Tutorialls API

> Audience: developers onboarding the codebase, architects reviewing the design
> Scope: the NestJS application inside `tutorialls/` (the git root also holds Docker/CI plumbing)
> All paths below are relative to the repository root unless stated otherwise.

---

## Table of contents

- [1. Design intent](#1-design-intent)
- [2. Layer map](#2-layer-map)
- [3. Module-by-module](#3-module-by-module)
- [4. Dependency graph](#4-dependency-graph)
- [5. The DI registry pattern](#5-the-di-registry-pattern)
- [6. Prisma schema & migrations](#6-prisma-schema--migrations)
- [7. Request lifecycle](#7-request-lifecycle)
- [8. Exception handling flow](#8-exception-handling-flow)
- [9. Caching & events](#9-caching--events)
- [10. Implementation vs. domain naming drift](#10-implementation-vs-domain-naming-drift)

---

## 1. Design intent

Tutorialls API follows a **Clean/Hexagonal-inspired layered architecture**: business rules live behind interface contracts, infrastructure is pushed to the edges, and every feature is wired through a centralized DI token registry.

The intent is visible in the folder structure:

```text
application/    use cases, policies, services, controllers, pipes (orchestration)
domain/         entities, DTOs, and pure interface contracts (no Nest decorators)
infra/          Prisma engine, bcrypt engine, environment config
internal/       shared error primitives
```

In practice the layering is **approximately** hexagonal: most use cases and policies are thin passthroughs, some orchestration lives in services, and a few contracts (`findById`, `authToken`) exist but are never exercised. See [§10](#10-implementation-vs-domain-naming-drift) for the honest gap list.

---

## 2. Layer map

```mermaid
flowchart TB
    subgraph CLIENT["Client"]
        C["Frontend / curl"]
    end

    subgraph APP["application/"]
        CTRL["Controllers<br/>(UsersController, TutorialController)"]
        PIPE["Pipes<br/>(DecryptUserPipe, ZodValidationPipe)"]
        SVC["Services<br/>(UserService, TutorialService, JwtAuthService)"]
        UC["Use cases & policies<br/>(13 use cases, 3 policies)"]
        REPO["Repositories — Prisma impls"]
    end

    subgraph DOM["domain/"]
        ENT["Entities (User, Tutorial)"]
        DTO["DTOs (~30 interfaces)"]
        CON["Contracts<br/>services · use cases · policies · repositories"]
    end

    subgraph INF["infra/ + internal/"]
        PS["PrismaService"]
        ES["EnvService (config)"]
        BE["bcrypt engine"]
        ERR["AppError hierarchy"]
    end

    subgraph EXT["External services"]
        PG[("PostgreSQL")]
        RD[("Redis")]
        RMQ[("RabbitMQ")]
    end

    C -->|HTTP| CTRL
    CTRL --> PIPE
    CTRL --> SVC
    SVC --> UC
    UC --> REPO
    UC -. implements .-> CON
    REPO -. implements .-> CON
    SVC -. per registry token .-> CON
    REPO --> PS --> PG
    SVC --> RD
    SVC --> RMQ
    SVC --> ERR
    UC --> ERR
    ES -. config .-> SVC
    UC --> BE
```

Routing is unidirectional at the source level: `application/` imports `domain/` contracts and `infra/` engines; `domain/` imports nothing outside itself. There are **no circular module imports** — Auth and Encryption deliberately do not import UsersModule.

---

## 3. Module-by-module

Seven modules compose the root `AppModule` (`tutorialls/src/app.module.ts`):

| Module | File | Imports | Provides (tokens shown) | Exports |
| --- | --- | --- | --- | --- |
| `AppModule` | `src/app.module.ts` | `@nestjs/config` (global), `PrismaModule`, `UsersModule`, `AuthModule`, `EncryptionModule`, `ConfigModule` (infra), `TutorialModule` | `AppService` | — |
| `PrismaModule` | `src/infra/engine/database/prisma/prisma.module.ts` | — | `PrismaService` | `PrismaService` |
| `ConfigModule` | `src/infra/config/config.module.ts` | — | `EnvService` | `EnvService` |
| `AuthModule` | `src/application/auth/auth.module.ts` | `PassportModule`, `ConfigModule`, `JwtModule.register({…})` | `JwtStrategy`, `LocalStrategy`, `AUTH.SERVICE.JWT`, `AUTH.USE_CASE.TOKEN.{GENERATE,VALIDATE}` | `AUTH.SERVICE.JWT` |
| `EncryptionModule` | `src/application/encryption/encryption.module.ts` | `ConfigModule` | `ENCRYPTION.SERVICE.NODE`, `ENCRYPTION.USE_CASE.USER.{ENCRYPT,DECRYPT}` | `ENCRYPTION.SERVICE.NODE` |
| `UsersModule` | `src/application/users/users.module.ts` | `PrismaModule`, `AuthModule`, `EncryptionModule`, `ConfigModule` | `DecryptUserPipe` + 7 registry-keyed providers (`POLICY.ALREDY_EXISTS`, `POLICY.SHOULD_EXISTS`, `POLICY.IS_VALID_PASSWORD`, `USE_CASE.HASH.PASSWORD`, `USE_CASE.SIGNUP`, `REPOSITORY.PRISMA`, `SERVICE.AUTH`) | `USER.SERVICE.AUTH` |
| `TutorialModule` | `src/application/tutorial/tutorial.module.ts` | `PrismaModule`, `CacheModule.register`, `ClientsModule.register` + `registerAsync` (RMQ) | `TUTORIAL.SERVICE.MAIN`, `TUTORIAL.REPOSITORY.PRISMA`, 7 use-case tokens | `TUTORIAL.SERVICE.MAIN` |

### Module notes

- **PrismaModule and infra ConfigModule use plain class tokens** — they are infrastructure singletons, not part of the registry scheme.
- **Auth strategy coupling**: `JwtStrategy` and `LocalStrategy` are provided (not exported) by `AuthModule`. `TutorialController`'s `JwtAuthGuard` still resolves them because `AuthModule` is instantiated app-wide via `AppModule` (implicit global passport registration). This works today but is a fragile implicit coupling — if `AuthModule` is ever removed from `AppModule`, the guard breaks silently.
- **TutorialModule registers RabbitMQ twice** with the same token `'RABBITMQ_SERVICE'`: a static `ClientsModule.register` with a hardcoded URL (`amqp://admin:admin@rabbitmq:5672`) immediately followed by `ClientsModule.registerAsync` reading `RABBITMQ_URL` from `EnvService`. Duplicate token registration is undefined behavior (order-dependent); the hardcoded registration should be deleted.
- **JwtModule secret timing**: `JwtModule.register({ secret: EnvService.ENV.JWT.SECRET })` evaluates the static `ENV` getter at decorator evaluation time — before `@nestjs/config` has loaded `.env` into `process.env`. Local development without exported shell env vars yields `undefined`, and `jwt.sign` fails at runtime. It works in Docker only because compose injects `.env` into the shell environment. See [docs/security.md](security.md#s2).

---

## 4. Dependency graph

```mermaid
graph TD
    AppModule -->|imports| ConfigForRoot["@nestjs/config forRoot (global)"]
    AppModule --> PrismaModule
    AppModule --> UsersModule
    AppModule --> AuthModule
    AppModule --> EncryptionModule
    AppModule --> AppConfigModule["ConfigModule (infra)"]
    AppModule --> TutorialModule

    UsersModule -->|imports| PrismaModule
    UsersModule -->|imports| AuthModule
    UsersModule -->|imports| EncryptionModule
    UsersModule -->|imports| AppConfigModule

    AuthModule -->|imports| AppConfigModule
    EncryptionModule -->|imports| AppConfigModule
    TutorialModule -->|imports| PrismaModule
    TutorialModule -->|imports| AppConfigModule

    PrismaModule -->|provides| PrismaService
    AppConfigModule -->|provides| EnvService

    subgraph Registry["Registry-token wiring (application layer)"]
        UserService -->|@Inject POLICY.ALREDY_EXISTS| AlreadyPolicy
        UserService -->|@Inject POLICY.SHOULD_EXISTS| ShouldExistsPolicy
        UserService -->|@Inject POLICY.IS_VALID_PASSWORD| PasswordPolicy
        UserService -->|@Inject USE_CASE.HASH.PASSWORD| HashUseCase
        UserService -->|@Inject USE_CASE.SIGNUP| SignupUseCase
        UserService -->|@Inject AUTH.SERVICE.JWT| JwtAuthService
        SignupUseCase -->|@Inject USER.REPOSITORY.PRISMA| PrismaUserRepository
        AlreadyPolicy -->|@Inject USER.REPOSITORY.PRISMA| PrismaUserRepository
        ShouldExistsPolicy -->|@Inject USER.REPOSITORY.PRISMA| PrismaUserRepository
        PrismaUserRepository --> PrismaService
        JwtAuthService -->|@Inject TOKEN.GENERATE| GenerateTokenUC
        JwtAuthService -->|@Inject TOKEN.VALIDATE| ValidateTokenUC
        GenerateTokenUC --> JwtService
        TutorialService -->|@Inject USE_CASE.*| TutorialUCs
        TutorialUCs -->|@Inject TUTORIAL.REPOSITORY.PRISMA| PrismaTutorialRepository
        PrismaTutorialRepository --> PrismaService
        TutorialService -->|@Inject CACHE_MANAGER| Redis
        TutorialService -->|@Inject 'RABBITMQ_SERVICE'| RMQClient
    end
```

---

## 5. The DI registry pattern

### 5.1 How it works

The application replaces class-token injection with a **nested object tree of string constants**. Three layers participate:

1. **Feature registries** — each feature folder ships a `*.registry.ts` exporting plain string tokens:

   ```ts
   // src/application/auth/auth.regsitry.ts
   export const AUTH_REGISTRY = {
     SERVICE: { JWT: 'MODULE::AUTH::SERVICE::JWT' },
     USE_CASE: AUTH_USE_CASE_REGISTRY,
   };
   ```

2. **The MODULE hub** — `src/app.registry.ts` aggregates every feature registry into one object:

   ```ts
   export const MODULE = {
     USER: USER_REGISTRY,
     AUTH: AUTH_REGISTRY,
     ENCRYPTION: ENCRYTION_REGISTRY,
     TUTORIAL: TUTORIAL_REGISTRY,
   };
   ```

3. **Bindings & consumers** — modules bind implementations to tokens; services inject by token against the **domain interface**:

   ```ts
   // src/application/users/users.module.ts
   providers: [
     { provide: MODULE.USER.REPOSITORY.PRISMA, useClass: PrismaUserRepository },
     // …
   ],

   // src/application/users/policy/should_exists.policy.ts
   constructor(
     @Inject(MODULE.USER.REPOSITORY.PRISMA)
     private readonly repository: IUserRepository,
   ) {}
   ```

The token string encodes the nesting path: `MODULE::AUTH::USE_CASE::TOKEN::GENERATE`.

### 5.2 Token inventory

| Registry path | Token string (exact value) | Bound class |
| --- | --- | --- |
| `MODULE.USER.SERVICE.AUTH` | `MODULE::USER::SERVICE::AUTH` | `UserService` |
| `MODULE.USER.POLICY.ALREDY_EXISTS` | `MODULE::APPLICATION::POLICY::USER::ALREDY_EXISTS` | `UserShouldNotAlreadyExistsToSignupPolicy` |
| `MODULE.USER.POLICY.SHOULD_EXISTS` | `MODULE::APPLICATION::POLICY::USER::SHOULD_EXISTS` | `UserShouldExistsToAuthPolicy` |
| `MODULE.USER.POLICY.IS_VALID_PASSWORD` | `MODULE::APPLICATION::POLICY::USER::HASH_PASSWORD` | `BcryptPasswordShouldBeValidToLoginPolicy` |
| `MODULE.USER.USE_CASE.HASH.PASSWORD` | `MODULE::APPLICATION::POLICY::USER::HASH::PASSWORD` | `BcryptHashPasswordUseCase` |
| `MODULE.USER.USE_CASE.SIGNUP` | `MODULE::APPLICATION::POLICY::USER::SIGNUP` | `RepositorySignupUserUseCase` |
| `MODULE.USER.REPOSITORY.PRISMA` | `MODULE::APPLICATION::REPOSITORY::USER::PRISMA` | `PrismaUserRepository` |
| `MODULE.AUTH.SERVICE.JWT` | `MODULE::AUTH::SERVICE::JWT` | `JwtAuthService` |
| `MODULE.AUTH.USE_CASE.TOKEN.GENERATE` | `MODULE::AUTH::USE_CASE::TOKEN::GENERATE` | `JwtGenerateAuthTokenUseCase` |
| `MODULE.AUTH.USE_CASE.TOKEN.VALIDATE` | `MODULE::AUTH::USE_CASE::TOKEN::VALIDATE` | `JwtValidateAuthTokenUseCase` |
| `MODULE.ENCRYPTION.SERVICE.NODE` | `MODULE::ENCRYPTION::SERVICE::NODE` | `NodeEncryptionService` |
| `MODULE.ENCRYPTION.USE_CASE.USER.ENCRYPT` | `MODULE::ENCRYPTION::USER::ENCRYPT` | `NodeEncryptUserUseCase` |
| `MODULE.ENCRYPTION.USE_CASE.USER.DECRYPT` | `MODULE::ENCRYPTION::USER::DECRYPT` | `NodeDecryptUserUseCase` |
| `MODULE.TUTORIAL.SERVICE.MAIN` | `MODULE::TUTORIAL::SERVICE::MAIN` | `TutorialService` |
| `MODULE.TUTORIAL.REPOSITORY.PRISMA` | `MODULE::TUTORIAL::REPOSITORY::PRISMA` | `PrismaTutorialRepository` |
| `MODULE.TUTORIAL.USE_CASE.{CREATE,UPDATE,DELETE}` | `MODULE::TUTORIAL::USE_CASE::{…}` | respective use cases |
| `MODULE.TUTORIAL.USE_CASE.LIST.ALL` | `MODULE::TUTORIAL::USE_CASE::LIST::ALL` | `ListAllTutotialsUseCase` |
| `MODULE.TUTORIAL.USE_CASE.FILTER.BY.{AUTHOR,TITLE,KEYWORD}` | `MODULE::TUTORIAL::USE_CASE::FILTER::BY::{…}` | respective use cases |
| *(string token)* `'RABBITMQ_SERVICE'` | hardcoded in `TutorialService` | RMQ `ClientProxy` |
| *(token)* `CACHE_MANAGER` | `@nestjs/cache-manager` | Redis cache |

### 5.3 Assessment

**Strengths**

- Contract-driven wiring (dependency inversion): consumers depend on `domain/` interfaces, never on concrete implementations.
- Test doubles are trivial: a spec can override a token with a `useValue` fake.
- Single source of truth for token names — when the tree is kept consistent, `@Inject(MODULE.X.Y)` compiles against the exact same constant the module binds.

**Weaknesses**

- Tokens are **strings**: a typo fails at bootstrap (runtime), not at compile time. Evidence of drift already exists — see §5.2 rows where use-case tokens carry a `POLICY` segment (`…::POLICY::USER::SIGNUP`) or a password-validation policy is keyed as `…::HASH_PASSWORD`.
- Tracing one binding requires traversing four files: consumer → module → registry file → `app.registry.ts`.
- `exports` blocks re-declare providers with `useClass` (`tutorial.module.ts:103-105`, `auth.module.ts:38-42`) — if a module ever binds a different implementation internally, the exported instance can diverge.
- Filename/identifier typos have been committed into the registry itself (`auth.regsitry.ts`, `ENCRYTION_REGISTRY`, `alredy_exists` tokens).

**Recommendation (medium priority):** keep the `domain/` interfaces and drop the string ceremony for the common path (class tokens or `useExisting`), or at minimum add an ArchUnit-style spec that iterates `MODULE` and asserts every token resolves in the container. One such spec would have caught every drifted token above.

---

## 6. Prisma schema & migrations

### 6.1 Schema (`tutorialls/prisma/schema.prisma`)

```mermaid
erDiagram
    User {
        String id PK "uuid (default)"
        String email UK "unique"
        String password "bcrypt hash"
        String authToken "optional — never written"
        DateTime createdAt "default now()"
        DateTime updatedAt "@updatedAt"
    }

    Tutorial {
        String id PK "uuid (default)"
        String title
        String content
        String author "plain string — no FK to User"
        DateTime createdAt "default now()"
        DateTime updatedAt "@updatedAt"
    }
```

- Two models, **no relations** between them. `Tutorial.author` is a free-text string, not a reference to `User.id`.
- `User.authToken` is declared but **never written** by any code path — the app returns the JWT in the HTTP body; the column stays `NULL`. Dead schema field.
- Column naming is **camelCase** (`createdAt`/`updatedAt`) while the domain entity uses snake_case (`created_at`/`updated_at`); the entity `toDTO()` maps Prisma output one-way and the dates never round-trip.

### 6.2 Migration history

| Migration | Content |
| --- | --- |
| `20240826135206_create_user_model` | `CREATE TABLE "User"` — `id SERIAL`, `email TEXT UNIQUE`, `password TEXT`, `token TEXT` |
| `20240827001936_update_user_model` | Destructive rewrite: drops pkey, drops `email`/`token` columns, adds `authToken`, flips `id` → UUID |
| `20240827002229_update_user_model` | Re-adds `email TEXT NOT NULL` + unique index (`User_email_key`) |
| `20240829234150_create_tutorial_model` | Adds `createdAt`/`updatedAt` to User; `CREATE TABLE "Tutorial"` (UUID pk) |
| `20240829234233_sync` | empty |
| `20240830150936_sync_prod` | empty |
| `20240830151049_sync` | empty |

Migration discipline: versioned and applied in order; the three `sync*` migrations are empty placeholders.

---

## 7. Request lifecycle

### 7.1 Auth flows (`/user/signup`, `/user/login`)

```mermaid
sequenceDiagram
    participant C as Client
    participant Ctrl as UsersController
    participant P as Pipes (DecryptUserPipe → ZodValidationPipe)
    participant S as UserService
    participant UC as Use cases / policies
    participant R as PrismaUserRepository
    participant DB as PostgreSQL
    participant A as JwtAuthService
    participant JWT as JwtGenerateAuthTokenUseCase

    Note over C: POST /user/signup — body may be { ciphertext } or plain JSON
    C->>Ctrl: { email, password } | { ciphertext }
    Ctrl->>P: DecryptUserPipe (passes through if no ciphertext)
    P->>P: ZodValidationPipe (SignupSchema: email, password ≥ 8)
    P-->>Ctrl: validated { email, password }
    Ctrl->>S: UserService.signup(user)
    S->>UC: UserShouldNotAlreadyExistsToSignupPolicy (@Inject policy)
    UC->>R: findByEmail
    R->>DB: prisma.user.findUnique
    DB-->>UC: existing? 
    UC-->>S: exists → throw UserAlredyExistsError (409)
    S->>UC: BcryptHashPasswordUseCase (HASH_ROUNDS rounds)
    S->>UC: RepositorySignupUserUseCase
    UC->>R: signup(user)
    R->>DB: prisma.user.create
    DB-->>R: row (authToken stays NULL)
    R-->>UC: User entity → toDTO
    UC-->>S: done
    S-->>Ctrl: 201 (empty body)

    Note over C: POST /user/login — same pipe chain
    C->>Ctrl: { email, password } | { ciphertext }
    Ctrl->>P: decrypt → Zod (LoginSchema)
    P-->>Ctrl: validated { email, password }
    Ctrl->>S: UserService.login(user)
    S->>UC: UserShouldExistsToAuthPolicy → findByEmail
    UC-->>S: UserNotFoundError (404) if absent
    S->>UC: BcryptPasswordShouldBeValidToLoginPolicy (bcrypt.compare)
    UC-->>S: InvalidCredentials (401) if mismatch
    S->>A: JwtAuthService.authenticate({ id, email, password })
    A->>JWT: jwt.signAsync(user)
    JWT-->>A: JWT string
    A-->>S: token
    S-->>Ctrl: { token }
```

> ⚠️ Note the two pinned deficiencies: the signed JWT embeds the **plaintext password**, and the `JwtStrategy.validate` reads `payload.sub`/`payload.username` which are never set (the payload carries `id`, `email`, `password`). Both are tracked in [docs/security.md](security.md).

### 7.2 Tutorial flows (guarded CRUD + filters + public list)

```mermaid
sequenceDiagram
    participant C as Client
    participant G as JwtAuthGuard (6/7 routes)
    participant Ctrl as TutorialController
    participant S as TutorialService
    participant UC as Use cases
    participant R as PrismaTutorialRepository
    participant DB as PostgreSQL
    participant RD as Redis (CACHE_MANAGER)
    participant RMQ as RabbitMQ ClientProxy

    C->>G: Authorization: Bearer <token>
    G->>G: JwtStrategy.validate(payload) → { userId, username }
    G-->>C: 401 if invalid/expired

    Note over C: GET /tutorial is public (no guard)
    C->>Ctrl: GET /tutorial?page=1&limit=10
    Ctrl->>S: listAll({ pagination })
    S->>UC: ListAllTutotialsUseCase.execute
    UC->>R: listAll — skip/take + count
    R->>DB: prisma.tutorial.findMany + count
    DB-->>R: rows
    R-->>UC: items + total
    UC-->>S: result
    S->>RD: cache.get('tutorial:listAll:1:10')
    RD-->>S: miss
    S->>RD: cache.set(key, result)
    S-->>Ctrl: { items, total, limit, page }

    Note over C: POST /tutorial — guarded
    C->>Ctrl: POST /tutorial (JWT) { title, content, author }
    Ctrl->>S: TutorialService.create
    S->>UC: CreateTutorialUseCase → repository → DB
    S->>RMQ: emit('tutorials_queue', dto)
    S-->>Ctrl: tutorial entity (201)

    Note over C: PATCH /tutorial/:id and DELETE /tutorial/:id follow the same
    Note over C: pattern: use case → DB → emit event → return.
    Note over C: Filters (title/author/content) are guarded and cache-aside.
```

> ⚠️ Cache caveat: `TutorialService` executes the use case **before** checking Redis on every read path, so caching currently saves no DB work; there is no invalidation on create/update/delete; and cached payloads serialize the entity's private `autor` field, so cache-hit responses differ in shape from cache-miss responses. Tracked in [docs/security.md](security.md#a8) and the [roadmap](../README.md#roadmap).

---

## 8. Exception handling flow

```mermaid
flowchart TB
    REQ["Request"] --> CTRL["Controller / pipe / service"]
    CTRL -->|"business rule violated"| ERR["Domain error thrown<br/>UserAlredyExistsError (409)<br/>UserNotFoundError (404)<br/>InvalidCredentials (401)<br/>InvalidDataError (400)"]
    CTRL -->|"unexpected failure"| ANY["Any other exception"]

    ERR --> FILTER["Global ExceptionFilter<br/>(BaseExceptionFilter subclass)"]
    ANY --> FILTER

    FILTER --> DECIDE{"exception instanceof AppError?"}
    DECIDE -->|yes| JSON1["response.status(err.status).json(err.toStruct())"]
    DECIDE -->|no| JSON2["response.status(500).json({ name, status, message, error })"]

    JSON1 --> BUG["super.catch() runs again → second response write<br/>(ERR_HTTP_HEADERS_SENT risk)"]
    JSON2 --> BUG
    BUG --> CLIENT["Client receives double response / error"]
```

Behavior today:

1. `ExceptionFilter` catches everything (`@Catch()`).
2. `AppError` instances map to their declared status (`toStruct()` drops the `url` hint).
3. Non-`AppError` exceptions return `exception.message` verbatim with status 500 — an information-disclosure risk (Prisma internals, Zod serialized messages).
4. The filter writes a response **and then calls `super.catch(exception, host)`**, which attempts a second write — every exception risks `ERR_HTTP_HEADERS_SENT`.
5. `Logger.error` logs the full exception and full response body on every failure.

The desired end state is a single-write filter that logs details server-side and returns a generic 500 with a correlation id.

---

## 9. Caching & events

### 9.1 Redis cache (cache-aside, deferred)

- Wired globally via `CacheModule.register` in `TutorialModule` (`redisStore`, host/port/TTL from `EnvService`).
- Keys: `tutorial:{op}:{limit}:{page}` (e.g. `tutorial:listAll:10:1`).
- Read paths: `listAll`, `filterByTitle`, `filterByAuthor`, `filterByKeywordInContent`.
- Current behavior and defects are described in §7.2; the TTL reads `CACHE_TTL` while env files define `REDIS_TTL` (`env.service.ts:29` vs `tutorialls/.env.example:22`), so the configured TTL is `undefined` in practice (cache-manager default applies).

### 9.2 RabbitMQ events (outbound only)

- `TutorialService.emit()` publishes `ITutorialUpdatedEvent` to the hardcoded queue name `'tutorials_queue'` (`tutorial.service.ts:31`) — the env-configured `RABBITMQ_QUEUE` value is ignored in the emit path.
- Create and update emit the full tutorial DTO; delete emits an empty payload.
- Lifecycle: `onModuleInit` → `client.connect()`, `onModuleDestroy` → `client.close()` (if RabbitMQ is unreachable at boot, the app fails to start).
- **No consumer exists** — `app.startAllMicroservices()` registers zero microservice servers; events are fire-and-forget. This is the natural extension point for the roadmap (event-driven consumers, e.g. search index or audit log).

---

## 10. Implementation vs. domain naming drift

The codebase uses **two naming dialects** — the domain concept (English, intentional design) and the implementation artifacts (misspelled identifiers that compiled because they are used consistently):

| Drift | Location | Note |
| --- | --- | --- |
| `auth.regsitry.ts` (missing *e*) | `src/application/auth/` | Filename typo; imported by `app.registry.ts` |
| `ENCRYTION_REGISTRY` (missing *p*) | `src/application/encryption/encryption.registry.ts:3` | Export typo, used consistently by `app.registry.ts` |
| `tutorial.repositiry.ts` (repositir*y*) | `src/application/tutorial/repository/prisma/` | Class name correct (`PrismaTutorialRepository`); `strictMode` is off so casing-safe imports compile |
| `alredy_exists` ×6+ | policy, error, DTO, registry files | `UserAlredyExistsError`, `signup_alredy_exists.policy.ts`, … — token strings included, so renaming must be coordinated |
| `ListAllTutotialsUseCase` | `src/application/tutorial/use_case/list/all.use_case.ts:8` | "Tutotials" |
| `autor` field | `src/domain/entity/tutorial.entity.ts:21` | Entity field (PT) mapped to `author` (EN) in `toDTO()` — source of the cache-shape bug |
| `intgration` | `test/application/users/users.controller.intgration.e2e-spec.ts` | e2e filename |
| Registry token drift | `use_case.registry.ts`, `policy.registry.ts` | Use-case tokens prefixed `POLICY`; password-validation token named `HASH_PASSWORD`; repository token uses an `APPLICATION` segment no other token has |
| Swagger version `'1,0'` | `src/main.ts:26` | Comma instead of dot |
| `CACHE_TTL` vs `REDIS_TTL` | `env.service.ts:29` vs `.env.example:22` | Config contract drift — cache TTL silently `undefined` |

A coordinated rename pass (with a container-resolution test to prove token consistency) is tracked on the [roadmap](../README.md#roadmap).

---

## Appendix — key file index

| Concern | Path |
| --- | --- |
| Bootstrap | `tutorialls/src/main.ts` |
| Root module | `tutorialls/src/app.module.ts` |
| Registry hub | `tutorialls/src/app.registry.ts` |
| Global exception filter | `tutorialls/src/exception.filter.ts` |
| Prisma service / module | `tutorialls/src/infra/engine/database/prisma/{prisma.service,prisma.module}.ts` |
| Env service / module | `tutorialls/src/infra/config/{config.module.ts, env/env.service.ts}` |
| Prisma schema + migrations | `tutorialls/prisma/schema.prisma`, `tutorialls/prisma/migrations/` |
| Compose / Dockerfile | `tutorialls/docker-compose.yaml`, `tutorialls/Dockerfile` |
| CI | `.github/workflows/docker-publish.yml` |
| Env template | `tutorialls/.env.example` (local `.env` is untracked) |

*Source of record: this document was compiled against the actual source tree on 2026-08-17. Raw analysis appendices: [`docs/_drafts/01-architecture-map.md`](_drafts/01-architecture-map.md) and [`docs/_drafts/02-code-analysis.md`](_drafts/02-code-analysis.md).*
