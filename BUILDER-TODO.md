# Builder — Durum Raporu & TODO

> Son güncelleme: 2026-03-19

---

## Tamamlanan ✅

| Alan | Detay |
|------|-------|
| 6 kategori | Basics, Database, API, Auth, Styling, Integrations |
| Apps CRUD | Ekle, sil, type (7 tip), port, i18n, CMS, consumes |
| Packages CRUD | Ekle, sil, type, producesCSS |
| **Package exports editörü** | Subpath ekleme/silme (./client, ./server, ./types) — chip UI |
| **Duplicate isim validasyonu** | Reducer'da kontrol var, aynı isimde app/package oluşturulamıyor |
| Discriminated unions | Database strategy → drizzle driver, API strategy → hono mode |
| File tree preview | Server action ile gerçek zamanlı, Shiki syntax highlighting |
| File tree reaktif | Preset değişiminde otomatik güncelleniyor |
| Diff tracking | NEW badge, yeşil highlight, 8 saniye sonra temizleniyor |
| Preset URL paylaşım | lz-string compression, "v1:" format, otomatik URL sync |
| Preset JSON export/import | Download + file picker |
| Preset localStorage | Auto-save (500ms debounce), load on mount |
| Undo/redo | Max 50 history, U / Shift+U kısayolları |
| Keyboard shortcuts | U, Shift+U, 1/2, S, F, C, ? |
| Sidebar | Progress minimap, complexity badge, CLI command, stack summary, validation |
| Built-in presets | Minimal, SaaS Starter, API Only |
| Mobile responsive | Tab-based navigation |
| Event bus | Analytics-ready, tüm olaylar emit ediliyor |
| Configure ↔ Preview nav | scrollToSection + flash highlight (section düzeyinde) |
| Presets gallery | Tag filtering, "Open in Builder", "Copy CLI command" |
| Context menu | apps/ ve packages/ klasörlerinde sağ-tık menü |
| Code viewer | Shiki lazy-load, dark/light theme, kopyalama, line numbers |

---

## Yapılacak — v1.0 için

### P0 — Gerekli

| # | Özellik | Zorluk | Açıklama |
|---|---------|--------|----------|
| 1 | **Preset metadata editörü** | Kolay | Sidebar'da name, description, author alanları. Schema'da var ama UI'da yok. |
| 2 | **"Copy as CLI command" (preset URL ile)** | Kolay | Sidebar'da `npx create-turbo-stack --preset <share-url>` kopyalama butonu. Şu an sadece proje adı gösteriyor. |
| 3 | **Durum toast'ları** | Kolay | "Loaded from URL", "Loaded from browser", "Saved to browser" bilgi mesajları. Event bus emit ediyor ama UI göstermiyor. |
| 4 | **File tree sort memoization** | Kolay | `useMemo` ile sort sonucunu cache'le. Her render'da yeniden sıralama oluyor. |

### P1 — Önemli

| # | Özellik | Zorluk | Açıklama |
|---|---------|--------|----------|
| 5 | **Dosya içeriği arama** | Orta | Preview'da sadece dosya adı aranıyor, içerik araması yok. File tree node'larının content'inde grep. |
| 6 | **Navigate to specific app/package** | Kolay | Preview'dan Configure'a geçince section'a scroll ediyor ama spesifik app/package kartına değil. |
| 7 | **Web Share API** | Kolay | `navigator.share()` destekleniyorsa native share dialog aç. URL copy yanına ekle. |
| 8 | **QR code export** | Kolay | Share URL'den QR code üret. `qrcode` veya `qr-code-styling` kütüphanesi. Modal'da göster. |
| 9 | **Unsaved changes indicator** | Kolay | Tab başlığında veya sidebar'da "modified" dot'u. |

### P2 — Nice-to-have

| # | Özellik | Zorluk | Açıklama |
|---|---------|--------|----------|
| 10 | **Teknoloji ikonları** | Orta | Her option card'da Next.js, Supabase, tRPC vs. logoları. SVG icon set. |
| 11 | **Tooltip'ler** | Orta | Her teknoloji seçeneği için "Bu nedir? Neden kullanılır?" açıklamaları. |
| 12 | **Animated transitions** | Kolay | Kategori collapse/expand animasyonu. `framer-motion` veya CSS transitions. |
| 13 | **Validation debounce** | Kolay | `useDeferredValue` ile validation'ı debounce et. Her keystroke'ta çalışmasın. |
| 14 | **File tree virtualization** | Orta | Büyük file tree'ler için `@tanstack/react-virtual`. 100+ dosyalı preset'lerde gerekli. |
| 15 | **Drag & drop sıralama** | Orta | Apps ve packages listesinde sıralama. `@hello-pangea/dnd` veya `@dnd-kit`. |

---

## Yapılacak — Post-v1.0

### Gelişmiş Özellikler

| # | Özellik | Zorluk | Açıklama |
|---|---------|--------|----------|
| 16 | **Dependency graph visualizer** | Yüksek | Preview'da "Graph" tab'ı. Apps → Packages ilişkisi. `@xyflow/react` veya `d3-force`. |
| 17 | **Env variables editörü** | Orta | Seçimlere göre otomatik env var listesi. Her var için key, description, example. `.env.example` preview'da yansır. |
| 18 | **Comparison mode** | Yüksek | İki preset'i yan yana diff. Fark eden alanlar highlight. "Merge" butonu. |
| 19 | **Template preview** | Orta | Seçim yapmadan önce "bu ne üretir?" gösterimi. Mini file tree. |
| 20 | **Cost/complexity estimator** | Orta | Tahmini setup süresi, öğrenme eğrisi, aylık maliyet (free tier vs paid). |
| 21 | **Interactive tutorial** | Orta | İlk ziyarette step-by-step guided tour. `react-joyride` veya custom. |
| 22 | **Version history** | Orta | Named snapshots. "3 dk önce: Database → Supabase seçildi" timeline. IndexedDB persist. |
| 23 | **Code snippets / recipes** | Orta | Stack'e özel kullanım örnekleri. "Auth middleware nasıl yazılır?" Copy-paste ready. |
| 24 | **ZIP download** | Orta | File tree'deki tüm dosyaları .zip olarak indir. JSZip kütüphanesi. |
| 25 | **GitHub repo oluştur** | Yüksek | GitHub OAuth + API ile direkt repo oluşturma. |

### Analytics & Community

| # | Özellik | Zorluk | Açıklama |
|---|---------|--------|----------|
| 26 | **PostHog entegrasyonu** | Kolay | Event bus → PostHog. Hangi teknolojiler en çok seçiliyor? Funnel: builder → export → CLI. |
| 27 | **Social media preview** | Orta | Shared URL'ler için OG image. Stack badge'leri görsel olarak render. |
| 28 | **Community preset submission** | Yüksek | GitHub PR-based veya API-based preset submission flow. |
| 29 | **Upvote/downvote** | Yüksek | Presets gallery'de popülerlik sıralaması. Backend gerekli. |
| 30 | **User accounts** | Yüksek | GitHub OAuth. Preset kaydetme, favoriler, profil. Scope büyük — sadece gerekli olursa. |

### Accessibility

| # | Özellik | Durum |
|---|---------|-------|
| 31 | ARIA labels | ⚠️ Kısmen var |
| 32 | Focus management | ⚠️ Kısmen var |
| 33 | Screen reader test | ❌ Yapılmadı |
| 34 | Reduced motion | ❌ Yok |
| 35 | High contrast mode | ❌ Yok |
| 36 | Keyboard-only navigation | ⚠️ Kısmen var |

---

## Analyze → Builder Entegrasyonu

| Alan | Durum |
|------|-------|
| `analyze` CLI komutu | ✅ 321 test, %99 coverage |
| `--json` output | ✅ |
| `--open-builder` (URL üret + tarayıcı aç) | ✅ |
| `--diff` (field-level detay) | ✅ |
| `/builder?preset=<encoded>` loading | ✅ |
| "Analyzed from existing project" badge | ❌ |
| Confidence indicators (sarı uyarılar) | ❌ |

---

## Önerilen Uygulama Sırası

```
P0 (1-4)  →  2 saat, hemen yapılabilir
P1 (5-9)  →  4-6 saat, v1.0 launch öncesi
P2 (10-15) → Post-launch, kullanıcı feedback'ine göre
Post-v1.0 (16-36) → Community growth'a göre
```
