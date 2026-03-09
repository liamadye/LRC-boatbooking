# Architecture & Design Decisions

## Why `src/` directory?

Next.js supports both root-level `app/` and `src/app/`. This project uses `src/app/` because:

1. **Separation of concerns** — config files (`tsconfig.json`, `tailwind.config.ts`, `next.config.mjs`) stay at the root, source code lives in `src/`
2. **Cleaner imports** — `@/*` alias maps cleanly to `./src/*`
3. **Standard convention** — recommended by Next.js docs for larger projects
4. **Vercel compatibility** — Vercel auto-detects `src/app/` with no extra config; build command runs from root

## Route Groups

The `(app)` route group in `src/app/(app)/` wraps authenticated pages with a shared layout that includes navigation, auth checks, and the user context. Pages outside this group (login, register, reset-password) are public.

## Data Flow

```
Browser → Supabase Auth (JWT) → Next.js Middleware (session refresh)
                                        ↓
                              API Route Handler
                                        ↓
                              src/lib/auth.ts (getUser — validates JWT, fetches Prisma User)
                                        ↓
                              src/lib/permissions.ts (role check)
                                        ↓
                              src/lib/validation.ts (business rules)
                                        ↓
                              Prisma → PostgreSQL
```

## Authentication Architecture

- **Supabase Auth** manages sessions, JWTs, password hashing, and email flows
- **Prisma `User` model** stores app-specific data (role, member type, squad, weight, black boat eligibility)
- Users are linked by email — Supabase auth email must match Prisma user email
- Registration is invite-only: admin creates invitation → user receives email → user registers → Prisma user record created from invitation data
- `src/middleware.ts` refreshes Supabase sessions on every request

## Booking Grid Architecture

The booking grid is the core UI, mirroring the club's physical Excel spreadsheet:

- **Server component** (`src/app/(app)/bookings/page.tsx`) fetches boats, bookings, and user data
- **Client component** (`src/components/bookings-client.tsx`) manages state: selected day, filters, modals
- **Desktop**: HTML table grid (`booking-grid.tsx`) with boats as rows, time slots as columns
- **Mobile**: Card-based list view (`mobile-booking-view.tsx`) grouped by time slot
- **Day navigation**: Client-side within a week (instant), server fetch only when changing weeks

## Key Design Patterns

### Validation
All booking validation rules are centralised in `src/lib/validation.ts`. Both the API routes and the UI consume these rules for consistent enforcement.

### Permission Checks
Centralised in `src/lib/permissions.ts` with a `can(user, action)` pattern. API routes call these helpers rather than implementing ad-hoc checks.

### Audit Logging
Admin actions (role changes, boat status changes, booking cancellations) are recorded in the `AuditLog` table via `src/lib/audit.ts`.

### Rate Limiting
In-memory rate limiting via `src/lib/rate-limit.ts` on auth and booking endpoints.

## Database Considerations

- **Connection pooling**: `DATABASE_URL` uses Supabase's PgBouncer pooler; `DIRECT_URL` bypasses it for migrations
- **Prisma naming**: Models use `camelCase` in TypeScript, `@map()` to `snake_case` in PostgreSQL
- **No RLS yet**: Security is application-layer only (see roadmap for planned RLS)
- **Indexes**: Bookings indexed on `[date]`, `[userId]`, `[boatId, date]`, `[squadId]` for query performance
