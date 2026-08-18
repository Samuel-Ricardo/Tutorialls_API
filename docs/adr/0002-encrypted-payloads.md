# ADR-0002 — Encrypted request payloads (AES-256-CTR)

- **Status:** accepted, **under review** — security analysis found critical defects (see [docs/security.md §1.2](../security.md#12-encryption-weakest-area))
- **Date:** 2024-08-20 (inferred from git history) · documented 2026-08-17

## Context

The product stores and transports user credentials between client and API. The project wanted an extra protection layer on the wire so that `POST /user/signup` and `POST /user/login` bodies can arrive encrypted (client pre-encrypts; the API decrypts inside `DecryptUserPipe` before Zod validation).

## Decision

- Symmetric cipher **AES-256-CTR** (Node `node:crypto`) — chosen over TLS-term repos because "transport security" was treated as a client-side capability.
- Payload envelope: `iv-hex + ENCRYPT_BREAKPOINT + ciphertext-hex` (e.g. `9f2c…:8a1e…`).
- One shared `ENCRYPT_KEY` (env) known to the server and, by contract, to every client.
- Unused encrypt-direction middleware (`SecurityMiddleware`) was scaffolded but never registered.

## Consequences

**Negative (critical findings, see [docs/security.md](security.md#e1))**

- The IV is generated **once per process** and reused for every message — keystream-reuse weakness in stream mode.
- The server key is shared with every client — any client can decrypt any other client's payload; zero confidentiality boundary.
- CTR mode is unauthenticated (malleable ciphertext); the example key value is not a valid 256-bit key; parse failures surface as 500s.

**Implications**

- The scheme does **not** provide transport security — that is TLS's job.
- It **does** provide a demo of symmetric crypto in Node and a pipe-based decryption flow, which has educational value for the project's portfolio purpose.

**Decision review**

Two coherent paths:

1. **Drop client-side crypto** — rely on TLS; keep the pipe as a pass-through for compatibility (remove ciphertext contract from docs) — recommended for any real deployment.
2. **Make it sound** — per-message random IV, `aes-256-gcm` (AEAD), key derivation/validation at startup, structured envelope, tamper tests — acceptable only if a genuine use case (e.g. pre-TLS demo environments) justifies it.

The roadmap tracks this under "encryption rework" (Sprint 1 in [docs/security.md §4](../security.md#4-remediation-roadmap)).
