# create-turbo-stack — Yapılabilir / Yapılamaz

Audit tarihi: 2026-04-27. Bu liste gerçek koddan üretildi — schema, templates, resolvers, diff engine, generated project çıktısı.

`[x]` = mevcut, çalışıyor. `[ ]` = eksik / bozuk / yapılacak.

---

## 1. Çekirdek altyapı

- [x] Monorepo iskelet üretimi (turbo.json, root package.json, catalog deps)
- [x] TypeScript config chain (typescript-config auto-package)
- [x] Biome config + biome.json scaffold
- [x] CSS @source auto-wiring (Tailwind 4)
- [x] Catalog dependency dedup
- [x] Workspace refs (consumes wiring — yalnızca yeni app'ler için)
- [x] Env chain (env package + apps inheritance)
- [x] Exports map (package.json exports auto-generation)
- [x] `.turbo-stack.json` config tracking
- [x] Browser-safe core (0 Node.js import — web builder için)
- [x] Eta template engine (88 template, 28 kategori, build script)
- [x] Diff engine — `create` + `update` + `unchanged` mutation
- [x] JSON Schema generation Zod 4'ten (`apps/web/public/schema/*.json`)
- [x] Lint pipeline yeşil
- [x] Type-check yeşil (6/6 paket)
- [x] 1013 test geçiyor (core 674 + analyzer 321 + schema 18)

---

## 2. CLI komutları

- [x] `create` — interactive prompts → resolveFileTree → disk write → git init → install
- [x] `add app` — yeni app ekle
- [x] `add package` — yeni package ekle
- [x] `add integration` — analytics/email/sentry/upstash/ai
- [x] `analyze` — mevcut Turborepo'yu okur, preset.json üretir
- [x] `analyze --open-builder` — builder URL açar
- [x] `analyze --diff` — field-level karşılaştırma
- [x] `preset save` / `preset validate`
- [x] `mcp` — MCP server entry
- [ ] **`add dependency <pkg> --to=<workspace>`** — yok
- [ ] **`remove app <name>`** — yok, diff engine `delete` mutation tipini bilmiyor
- [ ] **`remove package <name>`** — yok
- [ ] **`remove integration <category>`** — yok
- [ ] **`switch db <new>` / `switch auth <new>`** — yok (sadece üzerine ekler, eskileri silmez)
- [ ] **`upgrade`** — preset versionları arası migration yok
- [ ] **CLI `--dry-run` flag** — non-interactive scripted mode yok
- [ ] **`add` komutları için non-interactive flags** (CI'da kullanılamıyor)

---

## 3. Schema yalanları (CLI seçtirir, üretim broken)

Kullanıcı şu seçenekleri prompt'tan seçebilir, validation geçer, ama **çıktı boş veya yanlış**. Her biri ya **implement edilmeli** ya **schema'dan silinmeli**:

- [x] **App `expo` / `vite-vue` / `tauri`** — silent fail yerine `UnsupportedAppTypeError` fırlatıyor, CLI yakalayıp anlamlı mesaj gösteriyor; `add app` prompt'u `SUPPORTED_APP_TYPES` ile filtreleniyor
- [ ] **App `i18n: true` flag** — next-intl dep ekler ama middleware/locale config/messages yok
- [ ] **App `cms: sanity`** — schema enum'da, resolver'da hiç kullanılmıyor (dead)
- [ ] **App `cms: keystatic`** — aynı, dead
- [ ] **Linter `eslint-prettier`** — prompt kabul eder, biome scaffold üretir, eslintrc/prettierrc yok
- [ ] **CSS `tailwind3`** — sadece catalog dep, template tailwind4 ile aynı
- [ ] **CSS `vanilla`** — aynı, fake
- [ ] **CSS `css-modules`** — aynı, fake
- [ ] **UI `shadcn`** — dep eklenir, `components.json` ve sample component yok
- [ ] **UI `radix-raw`** — sadece dep, 0 component
- [ ] **API `hono.mode`** — `standalone-app` vs `nextjs-route` ayrımı resolver'da yok, ikisi de aynı template
- [ ] **Drizzle 6 driver variant** — schema'da var, template tek (driver'a göre query example farklılaşmıyor)
- [ ] **Package manager (4'ü de)** — sadece lockfile farkı, bun.toml/yarnrc/pnpm-workspace özel config yok

---

## 4. `add` / `remove` komutu sınırları

- [x] **`delete` mutation** — `TreeDiff.delete: string[]` + `diffTree(existing, desired, { previousNodes })`
- [x] **`remove app/package/integration` komutları** — `cli/src/commands/remove.ts`
- [x] **Eski provider dosyalarını silme** — `applyDiff` artık `oldPreset` → `newPreset` farkından stale dosyaları siler ve boş klasörleri prune eder
- [x] **`package.json` script update** — `computeJsonMutations` recursive deep-merge: leaf-level mutation, kullanıcının eklediği custom script'ler korunur, sadece değişen leaf güncellenir
- [x] **Conflict resolution** — `TreeDiff.conflict[]` listesi, kullanıcı manuel edit ettiği dosyalar tespit edilir; CLI prompt: keep-mine / overwrite / abort
- [x] **Drift detection** — yukarıdaki conflict mantığı tüm dosyaları kapsar (turbo.json dahil); manuel edit fark edilir, uyarısız ezme yok
- [ ] **Mevcut app'leri yeni package'a wire etme** — yalnızca yeni app'lere `consumes` yazılır
- [ ] **Atomic transaction / rollback** — partial failure'da kısmi yazılmış disk kalır
- [ ] **`add integration` idempotency** — tekrar çağrı sessizce overwrite eder, uyarı yok

---

## 5. Üretilen projede eksikler (day-2 burden)

### 5.1 Local development
- [x] `.env.example` — tüm env var'lar listelenir
- [x] `package.json` scripts (dev, build, lint, type-check)
- [ ] **README.md** — root ve per-app, generate edilmiyor
- [ ] **docker-compose.yml** — local postgres/redis için
- [ ] **Seed script** — `db:seed` task ve `seed.ts`
- [ ] **Setup walkthrough** — "run X then Y" yönergesi

### 5.2 CI/CD
- [ ] **GitHub Actions workflow** — `.github/workflows/ci.yml` template
- [x] **Vercel deploy config** — `vercel.json` her Next.js app'e generate ediliyor (turbo monorepo aware)
- [ ] **Railway/Fly/Docker** — `railway.toml` / `fly.toml` / `Dockerfile`
- [ ] **Pre-commit hooks** — husky / lefthook / lint-staged

### 5.3 Test
- [ ] **Vitest config** — apps + packages için
- [ ] **Sample test files** — bir tane örnek test
- [ ] **Playwright E2E config** — `playwright.config.ts` + `e2e/` klasörü
- [ ] **Storybook** — opsiyonel, ama yok

### 5.4 Database lifecycle
- [x] Drizzle/Prisma config dosyası
- [x] `db:generate` / `db:migrate` turbo tasks
- [ ] **Migration runner dev hook** — `dev` task'ı db:migrate çağırmıyor
- [ ] **Seed runner** — yok
- [ ] **Production migration strategy** — deploy hook yok

### 5.5 Auth — half-baked
- [x] `packages/auth/server.ts` — provider-specific stub
- [x] `packages/auth/middleware.ts` — session fetch
- [ ] **Better Auth + Drizzle adapter wiring** — adapter takılı değil (en kritik)
- [ ] **Better Auth + Prisma adapter wiring**
- [x] **OAuth provider env keys** — Better Auth, NextAuth provider'larında Google/GitHub placeholders eklendi (env-chain.ts)
- [ ] **Sign-in / sign-up / forgot-password sayfaları**
- [ ] **Public/protected route config** — middleware'de public route listesi yok
- [ ] **Next.js root middleware.ts** — generate edilmiyor

### 5.6 Routing & layouts
- [x] `app/layout.tsx` (basic shell)
- [x] `app/page.tsx` (hello world)
- [x] **`app/error.tsx`**
- [x] **`app/not-found.tsx`**
- [x] **`app/loading.tsx`**
- [ ] **Route groups** — `(marketing)`, `(auth)`, `(dashboard)` örneği
- [ ] **i18n routing** — `[locale]/layout.tsx`, messages/, request.ts

### 5.7 UI library
- [ ] **shadcn `components.json`** — yok, `npx shadcn add` çalışmaz
- [ ] **Sample component** (Button, Card, Form) — `packages/ui/src/components/` boş
- [ ] **Tailwind `globals.css` theme variables** — sadece import var, theme yok
- [ ] **Dark mode toggle** — yok

### 5.8 Observability
- [x] Sentry config dosyaları (client, server, edge)
- [x] **Sentry `instrumentation.ts`** — Next.js app'lere koşullu (errorTracking=sentry) generate ediliyor; `@sentry/nextjs` deps'e otomatik ekleniyor
- [ ] **Sentry import in layout/middleware** — wire edilmemiş
- [x] PostHog provider component
- [ ] **PostHog provider layout.tsx'e enjekte edilmemiş**
- [ ] **Sample event capture** — örnek yok

### 5.9 Email
- [x] React Email + Resend client
- [x] Sample welcome.tsx template
- [ ] **Email preview script** — yok
- [ ] **Sign-up flow ile entegrasyon** — yok

### 5.10 tRPC
- [x] Router + server + client factory
- [ ] **Web app'te QueryClientProvider** — wire edilmemiş
- [ ] **Sample mutation** — sadece `hello` query stub
- [ ] **Sample server action** — yok

### 5.11 Form / validation
- [x] `@t3-oss/env-nextjs` env validator
- [ ] **React Hook Form + Zod sample form** — yok
- [ ] **Sample server action with validation** — yok

### 5.12 SEO / meta
- [ ] **`robots.txt` / `sitemap.xml` / `manifest.json`**
- [ ] **`favicon.ico` / `og-image.png`**
- [ ] **Metadata API kullanımı** — sample yok

---

## 6. Mimari sınırlar (kasıtlı tasarım)

Bunlar "yapılmadı" değil, "şu an mimari izin vermiyor". Değiştirilmesi büyük iş.

- [x] **App framework plugin architecture** — `defineAppType()` ile yeni framework eklemek 1 dosya (`packages/core/src/resolve/app-types/<name>.ts`). Switch-case kayboldu.
- [x] **Integration plugin architecture** — `defineIntegration()` ile yeni provider eklemek tek bir entry (`packages/core/src/integrations/<category>.ts`). env-chain ve catalog hardcoded if-cascade yok artık.
- [x] **Schema-registry sync guardrail** — `registry-sync.test.ts`: schema enum ↔ registry tutarsızlığını CI'da yakalar (drift ya implement et ya allowlist'e ekle).
- [x] **`create-turbo-stack.json` user config** — `defaults` (prompt pre-fill), `policy` (allow/forbid/require), `plugins` (npm package'lardan dynamic import + register). CLI cwd'den yukarı yürür, bulduğu config'i uygular.
- [ ] **Template plugin architecture** — kullanıcı kendi template kategorisini ekleyemiyor (post-v1.0 roadmap)
- [ ] **Versioned preset compat** — eski preset.json'lar yeni schema ile patlar
- [ ] **Multi-user collaboration on builder** — localStorage tek kullanıcı
- [ ] **Live template editing** — Eta build-time, hot reload yok
- [ ] **Sadece JS/TS ekosistemi** — Python/Go/Rust workspace desteği yok (browser-safe core kuralı zaten engelliyor)
- [ ] **Sadece Turborepo** — Nx/Lerna/standalone pnpm workspace yok

---

## 7. Web (apps/web) — kullanıcı dışladı, dokunulmuyor

- [ ] BUILDER-TODO.md P0 4 maddesi (preset metadata editor, copy CLI command, status toasts, sort memoization)
- [ ] BUILDER-TODO.md P1 5 maddesi
- [ ] Builder dark mode bug'ları
- [ ] A11y eksikleri

---

## 8. Test eksikleri

- [x] core (674) + analyzer (321) + schema (18) unit testleri
- [ ] **CLI unit testleri** — 0 test
- [ ] **E2E preset testleri** — her built-in preset için create → install → build → type-check
- [ ] **Her app type E2E** — nextjs / hono-standalone / vite-react / sveltekit / astro / remix
- [ ] **Template snapshot testleri**
- [ ] **MCP server smoke test**

---

## 9. Bu audit'te giderilen kritik bulgular

- [x] `apps/web/public/schema/*.json` boş kabuktan gerçek JSON Schema'ya (Zod 4 native API)
- [x] `bun run lint` exit 1'den exit 0'a (templates-map.ts ignore)
- [x] Tüm sürümler `1.0.0`'a hizalı
- [x] CI workflow var (`.github/workflows/ci.yml`)

---

# Yapılacaklar — öncelik sırası

**Stratejisi:** logic önce, docs sonra (kullanıcı dedi). Eğitim hedefli — küçük ama kapsamlı işler.

## P0 — schema yalanlarını temizle (kullanıcıyı yanıltma)

1. [x] **App tipleri** (`expo` / `vite-vue` / `tauri`) — explicit error, prompt filtresi
2. [ ] **CMS field** (`sanity` / `keystatic`) — resolver hiç okumuyor, ya dead code'u uyar ya impl
3. [ ] **Linter `eslint-prettier`** — prompt kabul, biome scaffold üretiyor (bug)
4. [ ] **CSS varyantları** (`tailwind3 / vanilla / css-modules`) — hepsi tailwind4 template'i alıyor
5. [ ] **UI `shadcn / radix-raw`** — dep eklenir, component yok

## P1 — `add` komutunun gerçek mutation engine olması

4. [ ] Diff engine'e `delete` mutation tipi ekle
5. [ ] `remove app/package/integration` komutları
6. [ ] Provider switch'te eski dosyaları temizle (Clerk → Better Auth)
7. [ ] JSON merge'de mevcut key value update desteği
8. [ ] Mevcut app'leri yeni package'a auto-wire (workspace refs incremental)
9. [ ] Conflict detection — manuel edit edilmiş dosyaya uyarı

## P2 — half-baked integration'ları tamamla

10. [ ] **Better Auth + Drizzle/Prisma adapter wiring** (en kritik UX)
11. [ ] PostHog provider'ı `app/layout.tsx`'e enjekte et
12. [ ] Sentry `instrumentation.ts` generate et
13. [ ] tRPC `QueryClientProvider`'ı web app layout'a takıl
14. [ ] shadcn `components.json` + sample Button/Card

## P3 — Next.js scaffold genişlet

15. [ ] `app/error.tsx` + `not-found.tsx` + `loading.tsx`
16. [ ] OAuth env placeholders + sign-in/sign-up sayfaları
17. [ ] Sample mutation + server action
18. [ ] Tailwind globals.css theme variables + dark mode

## P4 — i18n gerçekten çalışsın

19. [ ] next-intl middleware + `[locale]/layout.tsx` + messages/
20. [ ] i18n config template

## P5 — Test & CI

21. [ ] CLI unit testleri (en azından command parsing)
22. [ ] Built-in preset E2E (minimal) → create → install → build
23. [ ] MCP smoke test

---

İlk adım: **P0 madde 1** — schema yalanlarını sil.
