# New Chat Starter Prompt — Ultralight App

Paste the following into a new Cowork chat to get up to speed instantly:

---

I'm building a Next.js + Supabase web app called **Ultralight** — a personal backpacking gear weight calculator. It's a private, login-only app for two invited users (no sign-up flow). Here's the full context:

## Stack
- Next.js 16 (App Router, TypeScript, Turbopack)
- Tailwind CSS with class-based dark mode (`darkMode: ['class']`)
- Supabase (SSR auth via `@supabase/ssr`, Postgres with RLS, Storage for gear images)
- `sonner` for toasts, `lucide-react` for icons, `zod` for validation, `jspdf` + `jspdf-autotable` for PDF export
- Deployed on Vercel, source on GitHub

## File structure highlights
- `app/layout.tsx` — wraps everything in `<ThemeProvider>`, has inline dark mode script in `<head>` to prevent flash
- `app/globals.css` — Tailwind base + CSS variables for light/dark palette + `.btn-primary` gradient utility class
- `components/providers/ThemeProvider.tsx` — theme context with localStorage persistence, `applyTheme()` helper
- `components/providers/UnitProvider.tsx` — oz/g unit toggle
- `components/trips/TripDetailClient.tsx` — main trip screen
- `components/gear/AddEditGearModal.tsx` — gear CRUD with image upload
- `components/gear/GearItemCard.tsx` / `GearItemRow.tsx` — grid and list views
- `components/settings/SettingsClient.tsx` — appearance (dark/light toggle) + unit setting
- `lib/supabase/server.ts` — server Supabase client
- `lib/supabase/client.ts` — browser Supabase client
- `proxy.ts` — Next.js edge middleware (Supabase auth pattern, NOT middleware.ts)
- `lib/validation.ts` — zod schemas for gear items, trips, images, password
- `supabase/schema.sql` — full DB schema with RLS
- `supabase/storage.sql` — `gear-images` bucket policies

## Color palette (applied to globals.css)
Custom earthy/outdoor palette:
- `--tomato: #f06543` — primary accent (buttons, key numbers, active states)
- `--sandy-brown: #f09d51` — secondary accent (dark mode numbers, gradient start)
- `--soft-linen: #e0dfd5` — warm off-white (page backgrounds, dark mode text)
- `--gunmetal: #313638` — primary text (light mode), dark surfaces
- `--platinum: #e8e9eb` — borders, muted surfaces

Primary buttons use a sandy-brown → tomato gradient via `.btn-primary` in globals.css (not `bg-primary`).

### Light mode
- Page bg: `#F7F4EE` (soft-linen)
- Surface/card: `#FAFAF8`
- Sidebar: `#d4d3c9`
- Primary text: `#313638` (gunmetal)
- Accent/stats: `#f06543` (tomato)

### Dark mode
- Page bg: `#1c2020`
- Surface/card: `#222626`
- Sidebar: `#252929`
- Primary text: `#e0dfd5` (soft-linen)
- Accent/stats: `#f09d51` (sandy-brown)
- Buttons: still tomato gradient

## Key decisions made
- No sign-up UI anywhere — login only
- Dark mode persists via localStorage; inline `<script>` in `<head>` prevents flash on refresh
- Auth middleware lives in `proxy.ts` (not `middleware.ts` — Next.js only allows one)
- Gear images stored in Supabase `gear-images` bucket (public), displayed as `object-cover` squares — ideal upload size is 800×800px square JPEG/WebP
- All primary buttons use `.btn-primary` class (gradient), not `bg-primary text-primary-foreground`
- Trip screen Export + Add item buttons stack vertically on mobile (`flex-col sm:flex-row`)
- Mobile padding is `px-4 sm:px-8` throughout

## Supabase project
- URL: `https://bjyhathqrastyuqjviwe.supabase.co`
- `.env.local` is gitignored and set locally + in Vercel environment variables
- Free tier — two users, light usage, well within limits
- Supabase pauses after 1 week inactivity (data is preserved, just needs a wake-up ping)

## What's been fixed / done
- All npm vulnerabilities resolved (dompurify, jspdf, postcss, next)
- Full Supabase schema + storage setup complete
- Dark mode with persistence (fixed useEffect ordering bug)
- Pre-GitHub audit: accessibility aria-labels, mobile responsiveness, security headers
- Vercel build fixed (middleware conflict, TypeScript implicit-any errors, zod readonly tuple)
- Color scheme updated from generic SaaS blue to custom earthy palette above
