# Ultralight — Pack Weight Calculator

A clean, modern backpacking gear weight calculator. Track base weight, worn weight, and consumables across multiple trips and a personal gear library.

---

## Tech Stack

- **Next.js 16.2** — App Router, Turbopack
- **Supabase** — Postgres database, Auth, Storage
- **Vercel** — Hosting
- **Tailwind CSS** — Styling
- **shadcn/ui** — UI primitives

---

## Setup

### 1. Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In **SQL Editor**, run the contents of `supabase/schema.sql`
3. In **Storage**, create a new bucket:
   - Name: `gear-images`
   - Public: **Yes**
4. In **SQL Editor**, run `supabase/storage.sql`
5. Create your two user accounts:
   - Go to **Authentication → Users → Add user**
   - Add User 1 (yourself)
   - Add User 2
   - Note: Public signup is disabled — only these two accounts can log in

### 2. Local development

```bash
# Clone the repo
git clone <your-repo>
cd ultralight

# Install dependencies
npm install

# Copy env file
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Find these in Supabase: **Settings → API → Project URL** and **anon public key**

```bash
# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect your GitHub repo in the [Vercel dashboard](https://vercel.com) for automatic deployments.

**Add environment variables in Vercel:**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Features

- **Gear Library** — Add all your gear with name, brand, category, type (fixed list + custom), weight (oz or g), photo, and notes
- **Trips** — Create trips from scratch, duplicate existing trips, or use templates
- **Weight calculator** — Live base weight, worn weight, consumables, and total pack weight with visual bar
- **Include/exclude toggle** — Grey out items without removing them
- **Per-item quantity** — Shows unit weight and total weight
- **Category groups** — Collapsible sections with subtotals
- **Export** — PDF report and CSV spreadsheet
- **Settings** — Default weight unit (oz/g), password change
- **Unit toggle** — Switch oz ↔ g from the sidebar at any time

---

## Weight Definitions

| Type            | Meaning                                           |
| --------------- | ------------------------------------------------- |
| **Base weight** | Everything in your pack, not consumed             |
| **Worn**        | Clothing and gear worn on your body (not in pack) |
| **Consumables** | Food, water, fuel — things you use up             |
| **Total pack**  | Base + consumables (what you carry)               |

---

## File Structure

```
app/
  (app)/
    dashboard/        — Trip overview
    trips/
      new/            — Create trip (blank, template, duplicate)
      [id]/           — Trip detail with gear list
      [id]/export/    — PDF and CSV export
    library/          — Gear library with filters
    settings/         — Unit preferences, password
  auth/
    callback/         — Supabase auth callback
    signout/          — Sign out handler
  login/              — Login page
  page.tsx            — Landing page

components/
  gear/               — GearItemCard, GearItemRow, AddEditGearModal, GearLibraryClient
  trips/              — TripCard, TripDetailClient, NewTripClient, WeightSummaryBar, AddItemToTripModal, ExportClient
  layout/             — AppSidebar
  providers/          — UnitProvider
  settings/           — SettingsClient

lib/
  supabase/
    client.ts         — Browser Supabase client
    server.ts         — Server Supabase client
  calculations.ts     — Weight math and formatting
  utils.ts            — cn(), constants, helpers

types/
  index.ts            — All TypeScript types

supabase/
  schema.sql          — Full DB schema — run this first
  storage.sql         — Storage bucket policies
```

---

## Disable Public Signup (Important)

After creating your two users in Supabase, disable public signups:

1. Supabase Dashboard → **Authentication → Providers → Email**
2. Toggle **"Enable email confirmations"** off (optional, for simplicity)
3. Supabase Dashboard → **Authentication → Settings**
4. Set **"Enable sign ups"** to **OFF**

This ensures only the two accounts you created can ever log in.
