# CLAUDE.md — LRC Boat Booking Portal

Guidelines for AI coding assistants (Claude, Codex, Copilot) working on this project.

## Project Overview

Boat booking portal for Leichhardt Rowing Club (LRC). Members book club boats, private boats, equipment (ergs/bikes/gym), oar sets, and coach tinnies across 9 daily time slots. Invite-only access with role-based permissions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui (Radix primitives) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 5 |
| Auth | Supabase Auth (email/password, invite-only) |
| Hosting | Vercel |
| Tests | Vitest (unit), Playwright (E2E) |

## Project Structure

```
├── prisma/
│   └── schema.prisma          # Database schema (source of truth for models)
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (app)/             # Authenticated route group
│   │   │   ├── admin/         # Admin panel
│   │   │   ├── bookings/      # Main booking grid
│   │   │   ├── my-bookings/   # User's bookings
│   │   │   └── profile/       # User profile
│   │   ├── api/               # API route handlers
│   │   │   ├── admin/         # Admin-only endpoints
│   │   │   ├── bookings/      # Booking CRUD
│   │   │   └── ...
│   │   ├── login/             # Login page
│   │   └── register/          # Invite-based registration
│   ├── components/
│   │   ├── admin/             # Admin panel components
│   │   ├── ui/                # shadcn/ui primitives
│   │   ├── booking-grid.tsx   # Main booking grid (desktop)
│   │   ├── mobile-booking-view.tsx  # Mobile booking view
│   │   ├── booking-modal.tsx  # Create/view booking dialog
│   │   └── ...
│   ├── lib/
│   │   ├── supabase/          # Supabase client (browser, server, middleware, admin)
│   │   ├── auth.ts            # Auth helpers (getUser, requireAdmin)
│   │   ├── constants.ts       # Boat types, max crew, time slots
│   │   ├── permissions.ts     # Role-based permission checks
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── types.ts           # Shared TypeScript types
│   │   └── validation.ts      # Booking validation rules
│   ├── hooks/                 # React hooks
│   └── middleware.ts          # Supabase auth middleware
├── e2e/                       # Playwright E2E tests
├── scripts/                   # Utility scripts (smoke tests)
└── docs/                      # Documentation
```

## Key Conventions

### Paths & Imports
- Source root is `src/`. Path alias: `@/*` maps to `./src/*`
- Next.js App Router lives at `src/app/`, NOT a root-level `app/` folder
- Vercel builds from the project root with `prisma generate && next build`

### Database
- Prisma schema is the source of truth — all models use `@map()` for snake_case table/column names
- Use `camelCase` in TypeScript, `snake_case` in SQL
- Key enums: `UserRole`, `MemberType`, `BoatClassification`, `BoatCategory`, `BoatStatus`
- Booking uniqueness enforced by composite unique constraints on `[date, boatId, startSlot]` etc.

### Auth & Permissions
- Supabase handles authentication; Prisma `User` record synced on login
- Roles: `admin`, `captain`, `vice_captain`, `squad_captain`, `member`
- Member types: `senior_competitive`, `student`, `recreational` (affects time slot access)
- Use `src/lib/permissions.ts` for all permission checks
- Use `src/lib/auth.ts` helpers: `getUser()`, `requireAdmin()`
- Registration is invite-only via admin panel

### Booking Rules (Business Logic)
These are defined in `src/lib/validation.ts`:
- Black boats require `hasBlackBoatEligibility` on the user
- Recreational members: green boats only, restricted early morning slots on weekdays
- Private boats: owner or users with `PrivateBoatAccess` entry
- No double-booking: one resource per slot per day
- Consecutive day warnings (override with race-specific flag)
- Crew count auto-derived from boat type (see `MAX_CREW` in constants.ts)
- 9 time slots per day, defined in `TIME_SLOTS` constant

### Components
- shadcn/ui components in `src/components/ui/` — do not modify these directly
- Desktop grid: `booking-grid.tsx`, Mobile: `mobile-booking-view.tsx`
- State management via React hooks + URL search params (no Redux/Zustand)

### Testing
- Unit tests: `src/__tests__/` using Vitest
- E2E tests: `e2e/` using Playwright
- Run: `npm test` (unit), `npm run test:e2e` (E2E)
- Smoke tests: `npm run smoke` or `bash scripts/smoke.sh <url>`

## Environment Variables

Required in `.env` (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `DATABASE_URL` — Pooled Prisma connection string
- `DIRECT_URL` — Direct Prisma connection string (for migrations)

## Common Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production (includes prisma generate)
npm run lint         # ESLint
npm test             # Run unit tests
npm run test:e2e     # Run Playwright E2E tests
npm run smoke        # Smoke tests against localhost:3000
```

## Documentation

See `docs/` for detailed documentation:
- `docs/plan.md` — Original implementation plan with full data model and business rules
- `docs/CHANGELOG.md` — Version history
- `docs/roadmap.md` — Future improvement suggestions
- `docs/architecture.md` — Architecture decisions and patterns
- `docs/reference/` — Source materials (spreadsheet, policy PDF, boat classes image)
- `docs/supabase-emails/` — Branded email templates for Supabase Auth
