# session

Three functions: generate a cryptographically secure session ID, hash it for at-rest storage, and verify an incoming token against its stored hash. All randomness and hashing is delegated to the `crypto` package (CSPRNG via `getRandomValues`, SHA-256 via `subtle.digest`) — no runtime npm dependencies, runs unmodified in Node 20+, Vercel/Cloudflare Edge, and browser workers.

**This is not an auth system.** If you use better-auth, Supabase Auth, or Clerk, they manage sessions internally — you do not need this package. This is for projects that manage their own minimal token layer: custom session tables, stateless API keys, or lightweight auth flows without a provider.

The same "generate → hash and store → verify" pattern applies to email-verification tokens, password-reset links, and API keys — this package works for all of them.

**Why not nanoid or cuid?** Session secrets require maximum entropy. `randomToken` produces 256-bit CSPRNG output; nanoid targets shorter, URL-safe IDs with lower entropy; cuid is designed for sortable database IDs, not secrets.

```ts
import { createSessionId, hashSessionId, verifySessionId } from "{{scope}}/session";

// On login — store the hash, send the raw ID to the client
const sessionId = createSessionId();
const sessionHash = await hashSessionId(sessionId);
await db.sessions.insert({ userId, hash: sessionHash });
// set sessionId in a cookie or response header

// On each authenticated request — retrieve hash from DB, verify incoming token
const stored = await db.sessions.findHash(userId);
const valid = await verifySessionId(request.cookies.sessionId, stored);
if (!valid) return new Response("Unauthorized", { status: 401 });
```
