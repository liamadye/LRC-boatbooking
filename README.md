# LRC Boat Booking Portal

Boat booking system for Leichhardt Rowing Club. Built with Next.js 14, Supabase, Prisma, and Tailwind CSS.

Members can book club boats, private boats, oar sets, coach tinnies, and equipment (ergs, bikes, gym) across 9 daily time slots — replacing the club's existing Excel spreadsheet.

## Quick Start

```bash
cp .env.example .env   # Add your Supabase + database credentials
npm ci
npm run dev
```

## Prerequisites

- Node.js 20+
- Supabase project (URL + anon key)
- PostgreSQL database (via Supabase)

## Environment Variables

Create `.env` from `.env.example`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `DATABASE_URL` | Prisma connection string (pooled) |
| `DIRECT_URL` | Prisma direct connection (for migrations) |

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build (includes `prisma generate`) |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright) |
| `npm run smoke` | Smoke tests against localhost:3000 |

## Deployment

Hosted on Vercel. Builds from the project root — Next.js auto-detects `src/app/`.

```bash
vercel deploy --prod --yes
bash scripts/smoke.sh https://your-production-domain.vercel.app
```

## Documentation

| Document | Description |
|----------|-------------|
| [`CLAUDE.md`](CLAUDE.md) | AI assistant reference (project structure, conventions, key files) |
| [`docs/architecture.md`](docs/architecture.md) | Architecture decisions and patterns |
| [`docs/plan.md`](docs/plan.md) | Original implementation plan and data model |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) | Version history |
| [`docs/roadmap.md`](docs/roadmap.md) | Future improvement suggestions |
| [`docs/supabase-emails/`](docs/supabase-emails/) | Branded email templates |
| [`docs/reference/`](docs/reference/) | Source materials (spreadsheet, policy PDF) |
