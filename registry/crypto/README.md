# crypto

SHA-256/512 hashing, HMAC-SHA256 with timing-safe verification, CSPRNG random utilities, and base encoding helpers. Every function is backed by the native Web Crypto API and `TextEncoder`/`TextDecoder`. There are no runtime dependencies — the package runs unmodified in Node 20+, Vercel/Cloudflare Edge Functions, and modern browsers without polyfills, `node:crypto`, or `Buffer`.

**What this package does not cover:** password hashing (Argon2, bcrypt), asymmetric cryptography (RSA, ECDSA, EdDSA), key exchange (ECDH, X25519), symmetric encryption (AES, ChaCha20), JWT/JOSE, TOTP/HOTP, WebAuthn, or X.509. Those APIs either require server-only runtimes or belong in a separate package.

```ts
import { hmacSha256, randomToken, sha256 } from "{{scope}}/crypto";

const token = randomToken();                           // 64-char hex, 256-bit entropy
const hash  = await sha256("hello");                   // lowercase hex digest
const sig   = await hmacSha256("secret", "payload");  // constant-time verified hex
```
