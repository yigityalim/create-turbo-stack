# v1.0 Release TODO

Bu listedeki her şey tamamlanınca proje `npm publish` edilmeye hazır.

---

## 1. Ürün Doğruluğu (kritik)

- [x] **`create` komutu gerçek proje üretsin** — minimal preset → `bun install && bun run build && bun run type-check` ✅
- [x] **`add` komutları çalışsın** — add app/package/integration + diff engine ✅
- [x] **MCP server çalışsın** — `create-turbo-stack mcp` başlıyor, crash etmiyor ✅
- [x] **Builder preview doğru dosya üretsin** — server action'a taşındı, useEffect dep fix ✅
- [x] **Analyze komutu çalışsın** — doğru preset JSON üretiyor ✅

## 2. Eksik Template'ler

- [x] **Template engine refactor** — 88 `.eta` dosyası + build script + render pipeline ✅
- [x] **Generic package'lar** — inline ama çalışıyor (template'e gerek yok, dinamik exports) ✅
- [x] **Env package** — inline, çalışıyor ✅

## 3. Build Pipeline (npm publish için)

- [x] **CLI build** — tsup config, bin → `dist/bin/create-turbo-stack.js` ✅
- [x] **Core build** — tsc → `dist/` ✅
- [x] **Schema build** — tsc → `dist/` ✅
- [x] **Templates build** — `build:templates && tsc` ✅
- [x] **Analyzer build** — tsc → `dist/` ✅
- [x] **Package versions** — tüm paketler `0.1.0` ✅

## 4. npm Publish Gereksinimleri

- [x] **bin field** — `dist/bin/create-turbo-stack.js` ✅
- [x] **package.json exports** — tüm paketler `dist/` ✅
- [x] **README.md** — kapsamlı ✅
- [x] **LICENSE** — MIT ✅
- [x] **CHANGELOG.md** — v0.1.0 release notes ✅
- [x] **files field** — `["dist"]` tüm paketlerde ✅
- [x] **Dry-run publish** — 22.7kB, 4 dosya ✅

## 5. Test Kapsamı

- [x] **Unit testler** — 995 test (674 core + 321 analyzer) ✅
- [ ] **E2E testleri** — her built-in preset: create → install → build → type-check
- [ ] **Her app type E2E** — nextjs, hono-standalone, vite-react, sveltekit, astro, remix
- [ ] **Template snapshot testleri**

## 6. Nice-to-Have (v1.0 sonrası)

- [ ] `add route` / `add component` / `add action` generators
- [ ] Plugin architecture
- [ ] Expo, Tauri, Vite-Vue app type'ları
- [ ] Community preset submission flow
- [ ] CLI `--dry-run` flag
- [ ] `turbo-stack upgrade` komutu
