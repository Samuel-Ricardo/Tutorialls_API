# Tutorialls API — Complete Architecture Map

> Evidence-based exploration of `C:\Users\Desktop\Desktop\Projects\js\nestjs\tutorialls\Tutorialls_API`
> The actual NestJS application lives in the nested **`tutorialls/`** folder. The repo root only holds git/Docker plumbing (`LICENSE`, `README.md`, `.github/`, `.husky/`) plus the nested app.
> Analysis date: 2026-08-17. All paths below are relative to the repo root unless stated otherwise.

---

## 1. TL;DR

- **Stack:** NestJS 10 (Express), Prisma 5 + PostgreSQL, JWT (passport-jwt), bcrypt, Zod 3, Node `crypto` AES-256-CTR, Redis cache (`cache-manager-redis-store`), RabbitMQ (Nest microservices `ClientProxy`), Swagger, Docker Compose, GHCR CI via GitHub Actions.
- **Style:** Clean/Hexagonal layering — `application/` (controllers, services, use cases, policies, repositories) → `domain/` (pure interfaces, entities, DTOs) → `infra/` (Prisma engine, hashing engine, config) → `internal/` (error types).
- **Signature pattern:** a custom **DI token registry system** (`.registry.ts` files) replaces class tokens everywhere: providers are registered in modules with string tokens like `'MODULE::USER::SERVICE::AUTH'` and injected via `@Inject(MODULE.X.Y)` plus interface contracts from `domain/`.
- **Modules:** `AppModule`, `UsersModule`, `AuthModule`, `EncryptionModule`, `TutorialModule`, `PrismaModule`, `ConfigModule` (7 total).
- **Endpoints:** `GET /`, `POST /user/signup`, `POST /user/login`, `POST|GET|PATCH|DELETE /tutorial` (+ 3 protected filters).
- **Notable:** many typos (`auth.regsitry.ts`, `tutorial.repositiry.ts`, `ENCRYTION_REGISTRY`, `alredy_exists` ×4, `intgration`, `ListAllTutotialsUseCase`), a committed PostgreSQL data directory (~1,281 files), dead code (`LocalAuthGuard`, `SecurityMiddleware`), security weaknesses (password inside JWT, reused AES IV, bcrypt cost 1, hardcoded RabbitMQ creds).

---

## 2. Repository layout (top level)

```
Tutorialls_API/
├── .github/workflows/docker-publish.yml   # GHCR build+push+cosign
├── .gitignore                             # root-level ignore (node_modules, .env, ...)
├── .husky/_/…                             # husky v9 shell hooks (root)
├── LICENSE
├── README.md                              # project readme (author styled)
├── docs/_drafts/                          # (empty) — this doc lives here
└── tutorialls/                            # ★ THE NESTJS APP
    ├── .docker/data/db/                   # ★ COMMITTED PostgreSQL data files (1,281 files in git!)
    ├── .env                               # local only, gitignored (16 vars, see §8)
    ├── .env.example                       # tracked template
    ├── .eslintrc.js / .prettierrc / .lintstagedrc.json
    ├── .husky/pre-commit                  # npx lint-staged
    ├── a.js                               # ★ stray scratch file (untracked) — dead code
    ├── docker-compose.yaml                # app, postgres, redis, rabbitmq, pgadmin
    ├── Dockerfile                         # multi-stage node:20-slim build
    ├── nest-cli.json / tsconfig.json / tsconfig.build.json
    ├── package.json                       # name: "tutorialls" v0.0.1
    ├── prisma/                            # schema + 7 migrations
    ├── src/                               # ★ application source (see tree §3)
    └── test/                              # e2e specs (jest-e2e.json)
```

`git ls-files` totals: **1,434 tracked files**, of which **1,281** are `tutorialls/.docker/data/db/*` PostgreSQL data files (committed intentionally in commit `ee12b16` "create: databse dump") and **122** are `tutorialls/src` files. `.env` is properly gitignored and has never been committed.

---

## 3. Full `src/` directory tree

```
tutorialls/src/
├── main.ts                          # bootstrap: CORS, global ExceptionFilter, ValidationPipe, Swagger /api/docs, startAllMicroservices()
├── app.module.ts                    # root module — imports all 6 feature modules + @nestjs/config
├── app.controller.ts                # GET / → 'Hello World!'
├── app.service.ts
├── app.registry.ts                  # ★ MODULE hub: aggregates USER/AUTH/ENCRYPTION/TUTORIAL registries
├── exception.filter.ts              # global catch-all → AppError-aware JSON + super.catch() (double-response bug, see §9)
├── @types/
│   └── internal/lib/error.type.ts   # IError interface
├── application/
│   ├── auth/
│   │   ├── auth.module.ts           # PassportModule + JwtModule + ConfigModule
│   │   ├── auth.service.ts          # JwtAuthService (orchestrates token use cases)
│   │   ├── auth.regsitry.ts         # ★ TYPO: "regsitry" (missing 'e'); exported as AUTH_REGISTRY
│   │   ├── auth.service.spec.ts     # unit test (stale header comment "// src/auth/…")
│   │   ├── guards/
│   │   │   ├── local.guard.ts       # LocalAuthGuard — ★ DEAD CODE (never used by any route)
│   │   │   └── jwt.guard.ts         # JwtAuthGuard — used by TutorialController (6 routes)
│   │   ├── strategy/
│   │   │   ├── local/local.strategy.ts   # passport-local → returns JWT string as "user" (type confusion, dead)
│   │   │   └── jwt/jwt.strategy.ts       # bearer token, ignoreExpiration:false
│   │   └── use_case/
│   │       ├── auth.registry.ts     # AUTH_USE_CASE_REGISTRY (GENERATE/VALIDATE tokens)
│   │       ├── generate_token.use_case.ts  # jwt.signAsync(user) — password lands in token (§9)
│   │       └── validate_token.use_case.ts  # jwt.verifyAsync as T
│   ├── encryption/
│   │   ├── encryption.module.ts     # ConfigModule; service + user encrypt/decrypt use cases
│   │   ├── encryption.registry.ts   # ★ TYPO: ENCRYTION_REGISTRY (missing 'p')
│   │   ├── encryption.service.ts    # NodeEncryptionService
│   │   ├── encryption.service.spec.ts
│   │   └── use_case/user/
│   │       ├── encryption.registry.ts
│   │       ├── encrypt.use_case.ts  # aes-*-ctr, createCipheriv — ★ static reused IV (see §9)
│   │       └── decrypt.use_case.ts  # split on ENCRYPT_BREAKPOINT, createDecipheriv
│   ├── tutorial/
│   │   ├── tutorial.module.ts       # Prisma + Redis CacheModule + 2× ClientsModule (RMQ) — ★ duplicate 'RABBITMQ_SERVICE'
│   │   ├── tutorial.controller.ts   # 7 routes, 6 protected with JwtAuthGuard
│   │   ├── tutorial.service.ts      # TutorialService: cache + rabbitmq.emit() + use cases
│   │   ├── tutorial.registry.ts
│   │   ├── tutorial.controller.spec.ts
│   │   ├── tutorial.service.spec.ts
│   │   ├── repository/prisma/
│   │   │   └── tutorial.repositiry.ts   # ★ TYPO: "repositiry" (PrismaTutorialRepository)
│   │   └── use_case/
│   │       ├── create.use_case.ts / update.use_case.ts / delete.use_case.ts
│   │       ├── filter/by/author.use_case.ts / title.use_case.ts / keyword.use_case.ts
│   │       └── list/all.use_case.ts     # class ListAllTutotialsUseCase — ★ TYPO "Tutotials"
│   └── users/
│       ├── users.module.ts          # PrismaModule + AuthModule + EncryptionModule + ConfigModule
│       ├── users.controller.ts      # POST /user/signup, POST /user/login
│       ├── users.controller.unit.spec.ts
│       ├── user.service.ts          # login/signup orchestration (policies + use cases + auth)
│       ├── user.service.spec.ts
│       ├── user.registry.ts         # aggregates policy/repository/use_case registries
│       ├── middleware/security/
│       │   ├── security.middleware.ts    # ★ DEAD CODE — never registered via configure()
│       │   └── security.middleware.spec.ts
│       ├── pipe/
│       │   ├── encryption/encryption.pipe.ts   # DecryptUserPipe (pass-through if no ciphertext)
│       │   └── validation/zod/zod.pipe.ts      # ZodValidationPipe → InvalidDataError
│       │       └── zod.pipe.spec.ts
│       ├── policy/
│       │   ├── policy.registry.ts   # ★ token IS_VALID_PASSWORD = '…HASH_PASSWORD' (mislabeled)
│       │   ├── alredy_exists.policy.ts            # ★ TYPO "alredy"
│       │   ├── should_exists.policy.ts
│       │   └── password_should_be_valid.policy.ts
│       ├── repository/
│       │   ├── repository.registry.ts
│       │   └── prisma/user.repository.ts   # PrismaUserRepository (findById not implemented!)
│       ├── use_case/
│       │   ├── use_case.registry.ts  # ★ tokens prefixed 'MODULE::APPLICATION::POLICY::…' (mislabeled)
│       │   ├── signup.use_case.ts    # RepositorySignupUserUseCase
│       │   └── hash_password.use_case.ts  # bcrypt.hash, rounds from EnvService.ENV.HASH.ROUNDS
│       └── validation/zod/user/
│           ├── signup.schema.ts   # email + password min 8
│           └── login.schema.ts    # email + password min 8
├── domain/                         # ★ interface/contract layer (no Nest decorators, pure TS)
│   ├── DTO/                        # ~30 data-transfer interfaces (see §7)
│   │   ├── auth/jwt/payload.dto.ts, auth/token/{generate,validate}.dto.ts
│   │   ├── error/app.dto.ts
│   │   ├── output/user/login.dto.ts
│   │   ├── pagination.dto.ts, pagination/output.dto.ts
│   │   ├── security/user/{encrypt,decrypt}.dto.ts
│   │   ├── tutorial/{create,update,delete,tutorial}.dto.ts + filter/by/* + list/all
│   │   └── user/{login,register,user}.dto.ts, find/by/*, hash/password.dto.ts, policy/*
│   ├── entity/
│   │   ├── user.entity.ts        # class-validator decorated, toDTO/fromDTO (mutable interface, private fields)
│   │   └── tutorial.entity.ts    # ★ typo field `autor` mapped to `author` in toDTO
│   ├── event/tutorial/updated.event.ts   # ITutorialUpdatedEvent (published to RMQ)
│   ├── policy/user/*.policy.ts           # 3 policy contracts
│   ├── repository/{user,tutorial}/*.repository.ts  # repository contracts
│   ├── service/{auth,security,tutorial,user}/*.service.ts  # service contracts
│   └── use_case/                          # 13 use-case contracts
│       ├── auth/{generate_token,validate_token}.use_case.ts
│       ├── tutorials/* (create, update, delete, filter/by/*, list/all)
│       └── user/{signup,security/{hash_password,encrypt,decrypt}}.use_case.ts
├── infra/
│   ├── config/
│   │   ├── config.module.ts       # providers/exports EnvService
│   │   └── env/env.service.ts     # instance getters + static ENV getter (ConfigService)
│   └── engine/
│       ├── database/prisma/
│       │   ├── prisma.module.ts   # providers/exports PrismaService
│       │   └── prisma.service.ts  # PrismaClient extends, $connect/$disconnect
│       └── hashing/bcrypt.engine.ts  # re-export `bcrypt`
└── internal/
    └── lib/error/
        ├── app.error.ts           # AppError base (status, toStruct, http.cat url)
        ├── data/invalid.error.ts  # 400
        └── user/
            ├── alredy_exists.error.ts      # 409 (★ typo Alredy)
            ├── invalid_password.error.ts   # 401 InvalidCredentials
            └── not_found.error.ts          # 404
```

---

## 4. Modules — imports / providers / exports / controllers

### 4.1 `AppModule` — `tutorialls/src/app.module.ts`

| imports | providers | controllers | exports |
|---|---|---|---|
| `ConfigModule.forRoot({isGlobal:true})`, `PrismaModule`, `UsersModule`, `AuthModule`, `EncryptionModule`, `AppConfigModule` (infra), `TutorialModule` | `AppService` | `AppController` | — |

### 4.2 `PrismaModule` — `src/infra/engine/database/prisma/prisma.module.ts`

| imports | providers | controllers | exports |
|---|---|---|---|
| — | `PrismaService` (class token) | — | `PrismaService` |

### 4.3 `ConfigModule` — `src/infra/config/config.module.ts`

| imports | providers | controllers | exports |
|---|---|---|---|
| — | `EnvService` (class token) | — | `EnvService` |

`EnvService` wraps `ConfigService` with typed getters and a **static `ENV` getter** that constructs a fresh `new ConfigService()` per access (timing hazard, see §9.3).

### 4.4 `AuthModule` — `src/application/auth/auth.module.ts`

| imports | providers | controllers | exports |
|---|---|---|---|
| `PassportModule`, `ConfigModule`, `JwtModule.register({secret: EnvService.ENV.JWT.SECRET, expiresIn})` | `JwtStrategy`, `LocalStrategy`, `AUTH.SERVICE.JWT → JwtAuthService`, `AUTH.USE_CASE.TOKEN.GENERATE → JwtGenerateAuthTokenUseCase`, `AUTH.USE_CASE.TOKEN.VALIDATE → JwtValidateAuthTokenUseCase` | — | `AUTH.SERVICE.JWT → JwtAuthService` |

Notes:
- Strategies are provided (not exported) — `JwtAuthGuard` in `TutorialModule` works only because `AuthModule` is instantiated app-wide via `AppModule` (implicit/global passport registration). Fragile coupling.
- `JwtModule.register` reads the secret through the static getter at **decorator evaluation time** — see finding §9.2.

### 4.5 `EncryptionModule` — `src/application/encryption/encryption.module.ts`

| imports | providers | controllers | exports |
|---|---|---|---|
| `ConfigModule` | `ENCRYPTION.SERVICE.NODE → NodeEncryptionService`, `ENCRYPTION.USE_CASE.USER.ENCRYPT → NodeEncryptUserUseCase`, `ENCRYPTION.USE_CASE.USER.DECRYPT → NodeDecryptUserUseCase` | — | `ENCRYPTION.SERVICE.NODE → NodeEncryptionService` |

### 4.6 `UsersModule` — `src/application/users/users.module.ts`

| imports | providers | controllers | exports |
|---|---|---|---|
| `PrismaModule`, `AuthModule`, `EncryptionModule`, `ConfigModule` | `DecryptUserPipe` (class token), then **7 registry-keyed providers** (see table §5): `USER.POLICY.ALREDY_EXISTS`, `USER.POLICY.SHOULD_EXISTS`, `USER.POLICY.IS_VALID_PASSWORD`, `USER.USE_CASE.HASH.PASSWORD`, `USER.USE_CASE.SIGNUP`, `USER.REPOSITORY.PRISMA`, `USER.SERVICE.AUTH` | `UsersController` | `USER.SERVICE.AUTH → UserService` |

**`UsersController` routes** (`@Controller('user')`):
| Method/Path | Pipes | Handler |
|---|---|---|
| `POST /user/signup` | `@Body(DecryptUserPipe, new ZodValidationPipe(SignupSchema))` | `service.signup(user)` → 201/void |
| `POST /user/login` | `@Body(DecryptUserPipe, new ZodValidationPipe(LoginSchema))` | `service.login(user)` → `{ token }` |

Login flow (`UserService.login`): `SHOULD_EXISTS` policy → `findByEmail` → `IS_VALID_PASSWORD` policy (`bcrypt.compare`) → `AUTH.SERVICE.JWT.authenticate({id, email, password})` → JWT string. **The plaintext password is embedded in the signed JWT payload** (§9.1).

Signup flow: `ALREDY_EXISTS` policy (returns boolean, inverted semantics) → `HASH.PASSWORD` use case → `SIGNUP` use case → `PrismaUserRepository.signup`.

### 4.7 `TutorialModule` — `src/application/tutorial/tutorial.module.ts`

| imports | providers | controllers | exports |
|---|---|---|---|
| `PrismaModule`, `CacheModule.register({redisStore, host/port/ttl from EnvService})`, `ClientsModule.register([RABBITMQ_SERVICE])` ★ + `ClientsModule.registerAsync([RABBITMQ_SERVICE])` ★ duplicate token | `TUTORIAL.SERVICE.MAIN → TutorialService`, `TUTORIAL.REPOSITORY.PRISMA → PrismaTutorialRepository`, 7 use cases (CREATE, UPDATE, DELETE, LIST.ALL, FILTER.BY.{AUTHOR,TITLE,KEYWORD}) | `TutorialController` | `TUTORIAL.SERVICE.MAIN → TutorialService` |

**`TutorialController` routes** — `tutorial.controller.ts`:
| Method/Path | Guard | Handler |
|---|---|---|
| `POST /tutorial` | ✅ `JwtAuthGuard` | create |
| `GET /tutorial` | ❌ public | listAll (paginated) |
| `GET /tutorial/title` | ✅ | filterByTitle |
| `GET /tutorial/author` | ✅ | filterByAuthor |
| `GET /tutorial/content` | ✅ | filterByKeywordInContent |
| `PATCH /tutorial/:id` | ✅ | update |
| `DELETE /tutorial/:id` | ✅ | remove |

`TutorialService` extras: `onModuleInit/onModuleDestroy` connects/closes the RMQ client; every create/update/delete **emits** `ITutorialUpdatedEvent` to queue `tutorials_queue`; every read path is **cache-aside** against Redis (key `tutorial:{key}:{limit}:{page}`); `CACHE_MANAGER` and `'RABBITMQ_SERVICE'` injected by **string token** (not registry).

---

## 5. DI registry pattern — `*.registry.ts`

### 5.1 How it works

1. Each feature folder ships a `*.registry.ts` exporting a **plain object tree of string tokens** (constants), e.g. `auth.registry.ts`:
   ```ts
   export const AUTH_REGISTRY = {
     SERVICE: { JWT: 'MODULE::AUTH::SERVICE::JWT' },
     USE_CASE: AUTH_USE_CASE_REGISTRY,   // { TOKEN: { GENERATE: 'MODULE::AUTH::USE_CASE::TOKEN::GENERATE', ... } }
   };
   ```
2. `src/app.registry.ts` (the **`MODULE` hub**) aggregates them:
   ```ts
   export const MODULE = { USER: USER_REGISTRY, AUTH: AUTH_REGISTRY, ENCRYPTION: ENCRYTION_REGISTRY, TUTORIAL: TUTORIAL_REGISTRY };
   ```
3. Modules bind implementations to tokens with **`{ provide: MODULE.X.Y, useClass: Impl }`** instead of class tokens — so **classes become interchangeable** and `useValue` mocking in tests is trivial.
4. Consumers (services/policies/pipes) inject via **`@Inject(MODULE.X.Y)`** into constructor params typed with the **domain interface** (e.g. `IUserRepository`, `IAuthService`), never the concrete class.
5. The token string encodes the nesting path: `'MODULE::AUTH::USE_CASE::TOKEN::GENERATE'`.

This gives: contract-driven (DIP) wiring, easy test doubles, and a single source of truth for token names — at the cost of runtime-only safety (typos in tokens fail at bootstrap, not compile time, though the paths in this repo are internally consistent).

### 5.2 Complete token inventory (17 tokens + 2 string tokens)

| Registry path | Token string (exact value) | Bound class |
|---|---|---|
| `MODULE.USER.SERVICE.AUTH` | `MODULE::USER::SERVICE::AUTH` | `UserService` |
| `MODULE.USER.POLICY.ALREDY_EXISTS` | `MODULE::APPLICATION::POLICY::USER::ALREDY_EXISTS` | `UserShouldNotAlreadyExistsToSignupPolicy` |
| `MODULE.USER.POLICY.SHOULD_EXISTS` | `MODULE::APPLICATION::POLICY::USER::SHOULD_EXISTS` | `UserShouldExistsToAuthPolicy` |
| `MODULE.USER.POLICY.IS_VALID_PASSWORD` | `MODULE::APPLICATION::POLICY::USER::HASH_PASSWORD` ★ mislabeled | `BcryptPasswordShouldBeValidToLoginPolicy` |
| `MODULE.USER.USE_CASE.HASH.PASSWORD` | `MODULE::APPLICATION::POLICY::USER::HASH::PASSWORD` ★ says POLICY | `BcryptHashPasswordUseCase` |
| `MODULE.USER.USE_CASE.SIGNUP` | `MODULE::APPLICATION::POLICY::USER::SIGNUP` ★ says POLICY | `RepositorySignupUserUseCase` |
| `MODULE.USER.REPOSITORY.PRISMA` | `MODULE::APPLICATION::REPOSITORY::USER::PRISMA` ★ different prefix scheme | `PrismaUserRepository` |
| `MODULE.AUTH.SERVICE.JWT` | `MODULE::AUTH::SERVICE::JWT` | `JwtAuthService` |
| `MODULE.AUTH.USE_CASE.TOKEN.GENERATE` | `MODULE::AUTH::USE_CASE::TOKEN::GENERATE` | `JwtGenerateAuthTokenUseCase` |
| `MODULE.AUTH.USE_CASE.TOKEN.VALIDATE` | `MODULE::AUTH::USE_CASE::TOKEN::VALIDATE` | `JwtValidateAuthTokenUseCase` |
| `MODULE.ENCRYPTION.SERVICE.NODE` | `MODULE::ENCRYPTION::SERVICE::NODE` | `NodeEncryptionService` |
| `MODULE.ENCRYPTION.USE_CASE.USER.ENCRYPT` | `MODULE::ENCRYPTION::USER::ENCRYPT` ★ no USE_CASE segment | `NodeEncryptUserUseCase` |
| `MODULE.ENCRYPTION.USE_CASE.USER.DECRYPT` | `MODULE::ENCRYPTION::USER::DECRYPT` ★ no USE_CASE segment | `NodeDecryptUserUseCase` |
| `MODULE.TUTORIAL.SERVICE.MAIN` | `MODULE::TUTORIAL::SERVICE::MAIN` | `TutorialService` |
| `MODULE.TUTORIAL.REPOSITORY.PRISMA` | `MODULE::TUTORIAL::REPOSITORY::PRISMA` | `PrismaTutorialRepository` |
| `MODULE.TUTORIAL.USE_CASE.{CREATE,UPDATE,DELETE}` | `MODULE::TUTORIAL::USE_CASE::{…}` | respective use cases |
| `MODULE.TUTORIAL.USE_CASE.LIST.ALL` | `MODULE::TUTORIAL::USE_CASE::LIST::ALL` | `ListAllTutotialsUseCase` |
| `MODULE.TUTORIAL.USE_CASE.FILTER.BY.{AUTHOR,TITLE,KEYWORD}` | `MODULE::TUTORIAL::USE_CASE::FILTER::BY::{…}` | respective use cases |
| *(string)* `'RABBITMQ_SERVICE'` | hardcoded in `TutorialService` | RMQ `ClientProxy` |
| *(token)* `CACHE_MANAGER` | `@nestjs/cache-manager` | Redis cache |

### 5.3 Cross-module dependency graph

```mermaid
graph TD
    AppModule -->|imports| ConfigForRoot["@nestjs/config forRoot global"]
    AppModule --> PrismaModule
    AppModule --> UsersModule
    AppModule --> AuthModule
    AppModule --> EncryptionModule
    AppModule --> AppConfigModule
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

    subgraph "Registry token wiring"
        UserService -->|@Inject ALREDY_EXISTS| AlreadyPolicy
        UserService -->|@Inject SHOULD_EXISTS| ShouldExistsPolicy
        UserService -->|@Inject IS_VALID_PASSWORD| PasswordPolicy
        UserService -->|@Inject HASH.PASSWORD| HashUseCase
        UserService -->|@Inject SIGNUP| SignupUseCase
        UserService -->|@Inject AUTH.SERVICE.JWT| JwtAuthService
        SignupUseCase -->|@Inject REPOSITORY.PRISMA| PrismaUserRepository
        AlreadyPolicy -->|@Inject REPOSITORY.PRISMA| PrismaUserRepository
        ShouldExistsPolicy -->|@Inject REPOSITORY.PRISMA| PrismaUserRepository
        PrismaUserRepository --> PrismaService
        JwtAuthService -->|@Inject TOKEN.GENERATE| GenerateTokenUC
        JwtAuthService -->|@Inject TOKEN.VALIDATE| ValidateTokenUC
        GenerateTokenUC --> JwtService
        TutorialService -->|@Inject USE_CASE.*| TutorialUCs
        TutorialUCs -->|@Inject REPOSITORY.PRISMA| PrismaTutorialRepository
        PrismaTutorialRepository --> PrismaService
        TutorialService -->|@Inject CACHE_MANAGER| Redis
        TutorialService -->|@Inject RABBITMQ_SERVICE| RMQ
    end
```

Dependency direction note: Auth/Encryption **do not import UsersModule** (no circular imports — a deliberate design win). `UsersModule` imports `AuthModule` to consume the exported JWT service; `AuthModule`'s local-strategy path never touches the DB (dead local flow).

---

## 6. Prisma schema & migrations

### 6.1 Schema — `tutorialls/prisma/schema.prisma`

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-1.1.x"]
}
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  password  String
  authToken String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Tutorial {
  id        String   @id @default(uuid()) @db.Uuid
  title     String
  content   String
  author    String
  createdAt DateTime @default(now())
  updatedAt DateTime @default(now()) @updatedAt
}
```

- **2 models, 0 enums, no relations** between models.
- `User.authToken` exists in schema but is never written by the app (login returns the JWT in the HTTP body; `authToken` column stays NULL — dead column).
- Note the schema uses **camelCase** columns (`createdAt`/`updatedAt`) while the domain entities use snake_case (`created_at`/`updated_at`) — entity `toDTO` maps Prisma output but never round-trips the dates.

### 6.2 Migrations (`tutorialls/prisma/migrations/`)

| Migration | Content |
|---|---|
| `20240826135206_create_user_model` | `CREATE TABLE "User"` — `id SERIAL`, `email TEXT UNIQUE`, `password TEXT`, `token TEXT` |
| `20240827001936_update_user_model` | **Destructive rewrite**: drops pkey, drops `email`/`token` columns, adds `authToken`, flips `id` → UUID |
| `20240827002229_update_user_model` | Re-adds `email TEXT NOT NULL` + unique index (`User_email_key`) |
| `20240829234150_create_tutorial_model` | Adds `createdAt`/`updatedAt` to User; `CREATE TABLE "Tutorial"` (UUID pk) |
| `20240829234233_sync` | empty migration |
| `20240830150936_sync_prod` | empty migration |
| `20240830151049_sync` | empty migration |

Plus `migration_lock.toml` (provider = "postgresql").

---

## 7. Domain layer: entities, DTOs, validation

### 7.1 Entities (class-validator decorated, no Nest runtime validation applied to them)

- **`User`** (`src/domain/entity/user.entity.ts`): `@IsUUID() id`, `@IsEmail() email`, `@IsString() @MinLength(8) password`, optional `authToken`. `toDTO()`/`fromDTO()` — **plain object mapping, no `validate()` call anywhere**; the decorators are effectively documentation.
- **`Tutorial`** (`src/domain/entity/tutorial.entity.ts`): `@IsUUID() id`, `@IsString() @MinLength(3) title`, `@IsString() @IsNotEmpty() content`, **`autor`** (typo) mapped to `author` in `toDTO()`, `@IsDate() created_at/updated_at`.

### 7.2 DTOs — 30 interfaces, plain TS (no zod/class-validator in DTOs)

| Area | DTOs |
|---|---|
| auth | `IJwtPayloadDTO` (id, email, **password**, sub — password in payload!), `IGenerateAuthTokenDTO` (id?, email, password), `IValidateAuthTokenDTO` (token) |
| user | `IUserDTO`, `ISignupUserDTO` (email, password, authToken?), `ILoginUserDTO`, `IHashPasswordDTO`, `IFindUserByEmailDTO`, `IFindUserByIdDTO`, policy DTOs (`IUserAlreadyExistsPolicyDTO`, `IUserPasswordIsValidDTO`), `ILoginOutputDTO` (token) |
| security | `IEncryptUserDTO { user: IUserDTO }`, `IDecryptUserDTO { ciphertext }` |
| tutorial | `ICreateTutorialDTO`, `IUpdateTutorialDTO` (id?), `IDeleteTutorialDTO`, `ITutorialDTO`, `IListAllTutorialsDTO`, filter DTOs (`IFilterTutorialsByAuthorDTO`, `IFilterTutorialsByTitleDTO`, `IFilterTutorialsByContentDTO` — all extend `PaginationDTO`) |
| pagination | `PaginationDTO { page, limit }` + generic `IPaginationOutputDTO<T>` |
| error | `IErrorDTO` |

### 7.3 Actual runtime validation — Zod pipes

The only enforced validation is on the two user routes via **`ZodValidationPipe`** (`src/application/users/pipe/validation/zod/zod.pipe.ts`):
- `SignupSchema` / `LoginSchema` (`src/application/users/validation/zod/user/`): `{ email: z.string().email(), password: z.string().min(8) }` — identical shape for both.
- On failure → `InvalidDataError` (AppError 400).

`main.ts` also installs a global `ValidationPipe({ transform: true, whitelist: false (commented out), forbidNonWhitelisted: false (commented out) })` — class-validator on entities is **never triggered** because controllers don't use DTO classes (they use interfaces + Zod).

**Pipe chain per request:** `Body(DecryptUserPipe, ZodValidationPipe)` — decrypt (if `ciphertext` present, else pass-through) → zod validate → service.

---

## 8. Configuration & infrastructure

### 8.1 Environment variables (names only — values redacted)

From local `tutorialls/.env` (untracked; `.env.example` is the tracked template):

```
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN
ENCRYPT_KEY
ENCRYPT_ALGORITHM
ENCRYPT_BREAKPOINT
HASH_ROUNDS
REDIS_HOST
REDIS_PORT
REDIS_TTL
RABBITMQ_URL
RABBITMQ_HOST
RABBITMQ_PORT
RABBITMQ_USER
RABBITMQ_PASS
RABBITMQ_QUEUE
```

Consumed by `EnvService` (via getters and the static `ENV` map) and Prisma (`DATABASE_URL`). Example values in `.env.example`: DB `postgresql://root:root@postgres:5432/tutorialls_database`, `JWT_EXPIRES_IN=1d`, `ENCRYPT_ALGORITHM=aes-256-ctr`, `ENCRYPT_BREAKPOINT=":"`, `HASH_ROUNDS=1` (★ insecure default), `REDIS_HOST=redis`, `RABBITMQ_URL=amqp://admin:admin@rabbitmq:5672`.

**Mismatch:** `EnvService.getCacheTTL()` and `EnvService.ENV.REDIS.TTL` read `CACHE_TTL`, but the env files define `REDIS_TTL` — Redis cache TTL is therefore `undefined` in practice (falls back to cache-manager default). `RABBITMQ_QUEUE_DURABLE` is likewise read by `EnvService` but never defined in env files.

### 8.2 `docker-compose.yaml` — 5 services

| Service | Image | Ports | Notes |
|---|---|---|---|
| `app` | build `.` (Dockerfile) | 3000 | env_file `.env`; depends on postgres/redis/rabbitmq; `external_links: host.docker.internal` |
| `postgres` | `postgres:latest` | 5432 | `root/root`, db `tutorialls_database`, volume `./.docker/data/db` ← the committed data dir |
| `redis` | `redis` | 6379 | — |
| `rabbitmq` | `rabbitmq:3-management-alpine` | 5672 + 15672 (mgmt) | `RABBITMQ_DEFAULT_USER/PASS = admin/admin` (hardcoded creds) |
| `pgadmin` | `dpage/pgadmin4` | 5050→80 | `admin@example.com/admin` |

### 8.3 `Dockerfile` — multi-stage

- `build`: `node:20-slim`, USER node, `npm ci`, `npm run build:docker` (= prettier → eslint --fix → jest → nest build).
- `production`: `node:20-slim` + `openssl`; copies node_modules, dist, prisma; **`RUN npm uninstall bcrypt && npm i bcrypt`** (rebuild native module for the image); `CMD ["npm","run","start:docker"]` (= `prisma generate && node dist/main`).

### 8.4 CI — `.github/workflows/docker-publish.yml`

Triggers: push to `main`, tags `v*.*.*`, PRs into `main` (scheduled cron commented out). Job `build` (ubuntu-latest, permissions: packages write, id-token write):
1. `actions/checkout@v4`
2. `sigstore/cosign-installer` (skip on PR) — cosign v2.2.4
3. `docker/setup-buildx-action@v3`
4. `docker/login-action@v3` → **GHCR** (`ghcr.io/${repo}`) (skip on PR)
5. `docker/metadata-action@v5` (tags/labels)
6. `docker/build-push-action@v5` — **context: `./tutorialls`**, push only on non-PR; GH Actions cache (type=gha)
7. `cosign sign` the digest (skip on PR, ephemeral cert via OIDC `id-token`)

No unit/e2e test job in CI — tests run inside the Docker build via `npm run build:docker`.

### 8.5 Local tooling

- `jest` config in `package.json`: `rootDir: src`, `testRegex: .*\.spec\.ts$`, moduleNameMapper `^src/(.*)$`; coverage dir `../coverage`.
- e2e: `test/jest-e2e.json` (`testRegex: .e2e-spec.ts$`).
- Husky v9: root `.husky/_/` (v9 internal hooks) + `tutorialls/.husky/pre-commit` → `npx lint-staged`; `.lintstagedrc.json`: on `*.ts` → format + lint + `test:staged` (`jest --passWithNoTests --findRelatedTests --coverage`).
- `tsconfig`: ES2021/commonjs, strict mode **off** (`strictNullChecks:false`, `noImplicitAny:false`, `forceConsistentCasingInFileNames:false`).

---

## 9. Security review findings (code-security practice applied)

Auth/encryption code was reviewed first with a security mindset; secrets were redacted and never reproduced.

| # | Severity | Finding | Location |
|---|---|---|---|
| 9.1 | **High** | **Plaintext password inside JWT.** Login calls `authService.authenticate({ id, email, password })` and `JwtGenerateAuthTokenUseCase` signs the whole object — the password is base64-visible in every token (payload decoded client-side; also `IJwtPayloadDTO` declares `password`). Anyone with a token (or a Redis/RMQ log) gets the password. | `user.service.ts:45-49`, `generate_token.use_case.ts`, `auth/token/generate.dto.ts` |
| 9.2 | **High** | **JWT secret read too early.** `JwtModule.register({ secret: EnvService.ENV.JWT.SECRET })` executes during `AuthModule` decorator evaluation — before `ConfigModule.forRoot()` loads `.env` into `process.env`. In local dev (no exported env), secret is `undefined` and `jwt.sign` fails. Works in Docker only because compose injects `.env` into the shell env. | `auth.module.ts:17-19`, `env.service.ts:8-9` |
| 9.3 | **High** | **Reused static IV.** `private readonly iv = randomBytes(16)` is initialized once per use-case instance (singleton) and reused for every encryption; AES-CTR with a fixed IV + fixed key produces a keystream reuse break. The IV should be random per message (it already rides along in the output, so generating per-call is trivial). | `encrypt.use_case.ts:11,19` |
| 9.4 | **High** | `ENCRYPT_KEY` is used directly as the raw key for `createCipheriv` — a 256-bit key requires 32 bytes; the example value `"256-bit key"` (18 chars/bytes) **throws at runtime** the first time a ciphertext is created. Key must be derived (e.g. `createHash('sha256').update(key)`). | `.env.example:13`, `encrypt.use_case.ts:14-19` |
| 9.5 | **Medium** | **bcrypt cost 1** (`HASH_ROUNDS=1` in example) — trivially brute-forceable. OWASP recommends ≥ 10 (12 typical). | `.env.example:17`, `hash_password.use_case.ts:10` |
| 9.6 | Medium | **Hardcoded RabbitMQ credentials** `amqp://admin:admin@rabbitmq:5672` in the first (dead) `ClientsModule.register`, mirrored by compose defaults. | `tutorial.module.ts:35-47`, `docker-compose.yaml:47-48` |
| 9.7 | Medium | **Global exception filter double-response.** `ExceptionFilter` writes `response.status(...).json(...)` and then calls `super.catch(exception, host)` which attempts a second write → "headers already sent" errors/undefined behavior for AppError paths. | `exception.filter.ts:11-24` |
| 9.8 | Medium | **Committed PostgreSQL data directory** (1,281 files) — repo bloat and, if the DB ever holds real users, a data-leak vector. Also `postgresql.conf`, `pg_hba.conf` (auth config) included. | `tutorialls/.docker/data/db/**` |
| 9.9 | Low | ValidationPipe hardening commented out (`whitelist`, `forbidNonWhitelisted`) — unknown body properties pass through; no helmet/rate limiting; `password` returned to clients inside `IUserDTO` in encrypted payloads. | `main.ts:18-19` |
| 9.10 | Low | `LocalStrategy.validate` returns a JWT string from `authenticate()` as the "user" (should return a user object) — type confusion; currently masked by being dead code. | `local.strategy.ts:16-18` |
| 9.11 | Info | `.env` is gitignored and never committed (verified via `git log -- tutorialls/.env` → empty). `.env.example` ships placeholder secrets — fine for a demo. Untracked local `a.js` scratch file. | git history |

---

## 10. Noteworthy: typos, dead code, WIP

### 10.1 Typo inventory (misfiled / misspelled)

| Finding | Path | Detail |
|---|---|---|
| `auth.regsitry.ts` (missing **e**) | `src/application/auth/auth.regsitry.ts` | Filename typo; imported by `app.registry.ts` |
| `tutorial.repositiry.ts` (repositir**y**) | `src/application/tutorial/repository/prisma/tutorial.repositiry.ts` | Class name correct (`PrismaTutorialRepository`), file name wrong |
| `ENCRYTION_REGISTRY` (missing **p**) | `src/application/encryption/encryption.registry.ts` | Exported const typo — used consistently by `app.registry.ts` (so it compiles) |
| `alredy_exists` ×6 | `policy/alredy_exists.policy.ts`, `internal/lib/error/user/alredy_exists.error.ts`, `domain/DTO/user/policy/alredy_exists.dto.ts`, registry keys | "Alredy" ≠ "Already" everywhere, incl. error class `UserAlredyExistsError` |
| `ListAllTutotialsUseCase` | `src/application/tutorial/use_case/list/all.use_case.ts` | "Tutotials" |
| `autor` field | `src/domain/entity/tutorial.entity.ts` | Mapped to `author` in `toDTO()` |
| `intgration` | `test/application/users/users.controller.intgration.e2e-spec.ts` | "intgration" |
| `alredy_exists` / `HASH_PASSWORD` mislabels | `policy.registry.ts`, `use_case.registry.ts` | Use-case tokens prefixed `POLICY`, password-validation token named `HASH_PASSWORD`, repository token uses `APPLICATION` segment that no other token has (see §5.2) |
| `'1,0'` version | `main.ts:26` | Swagger version string uses comma |
| `REDIS_TTL` vs `CACHE_TTL` | env files vs `env.service.ts` | EnvService reads `CACHE_TTL`; env defines `REDIS_TTL` (see §8.1) |
| stale spec comment | `auth.service.spec.ts:1` | `// src/auth/auth.service.spec.ts` — old path |
| root README | `README.md` | Says "Emlpoyee Dashboard" (typo), references "Tutorialls-API" as "FRONTEND" (it's the API), render URL, CloudAMQP |
| `tutorialls/README.md` | — | Stock Nest starter README, never customized |

### 10.2 Dead code / unused

- `LocalAuthGuard` + `LocalStrategy` + `PassportModule` local flow — **no route uses `@UseGuards(LocalAuthGuard)`** (login is open: pipe-only). 
- `SecurityMiddleware` (and its spec) — never registered (no `configure()` in `UsersModule`); also calls `next(user)` which Express treats as an error signal.
- First `ClientsModule.register` (hardcoded URL) — immediately overridden by `ClientsModule.registerAsync` with the **same token** `'RABBITMQ_SERVICE'` (duplicate registration; the hardcoded one loses/wins depending on registration order).
- `PrismaUserRepository.findById` — `throw new Error('Method not implemented')`.
- `User.authToken` column — never written by any code path.
- `app.startAllMicroservices()` — no microservice consumers exist.
- `domain/use_case/…` files — pure interface definitions (by design), but `domain/policy`, `domain/service`, `domain/event` are also contract-only, with app implementations duplicated per feature.
- `a.js` — untracked scratch file (price-calculator exercise).
- `bcrypt.engine.ts` — trivial re-export wrapper (`export { bcrypt }`).
- `zod.pipe.spec.ts` — only a smoke assertion.
- `IError.url` — auto-generates `https://http.cat/status/{status}` links (fun quirk).

### 10.3 WIP areas (git status 2026-08-17)

- `M tutorialls/src/domain/DTO/output/user/login.dto.ts`, `pagination.dto.ts`, `pagination/output.dto.ts` — **line-ending-only changes** (LF→CRLF normalization warnings; no content diff) — likely from an editor save on Windows.
- `?? tutorialls/a.js` — untracked scratch.
- `docs/_drafts/` — empty until this document.

### 10.4 Test inventory

| Test file | Scope | Notes |
|---|---|---|
| `src/app.controller.spec.ts` | unit | stock Hello World |
| `src/application/auth/auth.service.spec.ts` | unit | mocks use cases; stale header comment |
| `src/application/encryption/encryption.service.spec.ts` | unit | service orchestration mocked |
| `src/application/tutorial/tutorial.controller.spec.ts` | unit | mocks service; guard behavior not tested |
| `src/application/tutorial/tutorial.service.spec.ts` | unit | mocks use cases + CACHE_MANAGER |
| `src/application/users/user.service.spec.ts` | unit | login/signup flows with mocked policies |
| `src/application/users/users.controller.unit.spec.ts` | unit | mocks pipes (imports `EncryptionModule` unused) |
| `src/application/users/middleware/security/security.middleware.spec.ts` | unit | **tests dead code** |
| `src/application/users/pipe/validation/zod/zod.pipe.spec.ts` | unit | smoke only |
| `test/app.e2e-spec.ts` | e2e | stock Nest e2e template |
| `test/application/users/users.controller.e2e-spec.ts` | e2e | uses `createApplicationContext`; **asserts login → 500** (documents broken behavior); signup with password `'12345'` would violate zod `min(8)` → assertion **inconsistent with implementation** |
| `test/application/users/users.controller.intgration.e2e-spec.ts` | e2e | same inconsistencies; commented-out `ValidationPipe` |

---

## 11. Request lifecycle (end-to-end)

```mermaid
sequenceDiagram
    participant C as Client
    participant F as ExceptionFilter (global)
    participant Ctrl as UsersController / TutorialController
    participant P as Pipes (Decrypt → Zod)
    participant S as Service (User/Tutorial/Auth/Encryption)
    participant UC as Use Cases / Policies
    participant R as Repositories (Prisma)
    participant DB as PostgreSQL
    participant Redis as Redis Cache
    participant RMQ as RabbitMQ

    C->>Ctrl: POST /user/signup {ciphertext?}
    Ctrl->>P: DecryptUserPipe (if ciphertext) + ZodValidationPipe
    P-->>Ctrl: plain {email, password}
    Ctrl->>S: UserService.signup
    S->>UC: AlreadyExists policy → bcrypt hash → signup use case
    UC->>R: PrismaUserRepository.signup
    R->>DB: prisma.user.create
    DB-->>R: User row (authToken never set)
    R-->>UC: User entity → toDTO
    UC-->>S: done
    S-->>Ctrl: 201

    C->>Ctrl: POST /user/login {ciphertext?}
    Ctrl->>P: decrypt + zod
    Ctrl->>S: UserService.login
    S->>UC: ShouldExists policy → bcrypt.compare
    S->>Auth: JwtAuthService.authenticate({id, email, password})
    Auth->>UC: JwtGenerateAuthTokenUseCase → jwt.signAsync
    Auth-->>S: JWT string (password inside payload!)
    S-->>Ctrl: { token }

    C->>Ctrl: GET /tutorial (public), others JWT-guarded
    Ctrl->>S: TutorialService.<method>
    S->>Redis: cache get (listAll/filters)
    S->>UC: use case → repository
    R->>DB: prisma.tutorial.findMany
    S->>RMQ: emit ITutorialUpdatedEvent (create/update/delete)
    S-->>Ctrl: paginated result
```

---

## 12. Appendix — key file index (absolute paths)

| Concern | Absolute path |
|---|---|
| Bootstrap | `C:\Users\Desktop\Desktop\Projects\js\nestjs\tutorialls\Tutorialls_API\tutorialls\src\main.ts` |
| Root module | `…\tutorialls\src\app.module.ts` |
| Registry hub | `…\tutorialls\src\app.registry.ts` |
| Global exception filter | `…\tutorialls\src\exception.filter.ts` |
| Prisma service/module | `…\tutorialls\src\infra\engine\database\prisma\{prisma.module,prisma.service}.ts` |
| Env service/module | `…\tutorialls\src\infra\config\{config.module.ts, env\env.service.ts}` |
| Prisma schema | `…\tutorialls\prisma\schema.prisma` + `…\tutorialls\prisma\migrations\` |
| Compose / Docker / CI | `…\tutorialls\docker-compose.yaml`, `…\tutorialls\Dockerfile`, `.github\workflows\docker-publish.yml` |
| Env template | `…\tutorialls\.env.example` (local `.env` untracked) |
| Docs target | `C:\Users\Desktop\Desktop\Projects\js\nestjs\tutorialls\Tutorialls_API\docs\_drafts\01-architecture-map.md` |

---

*Compiled from full source review of all 122 tracked `src/` files, 9 unit specs, 3 e2e specs, git history (15 recent commits), schema + 7 migrations, compose/Dockerfile/CI, and env samples. Secrets never reproduced; values redacted.*