# LRC Boat Booking Portal

Next.js + Supabase + Prisma app for Leichhardt Rowing Club booking management.

## Prerequisites

- Node.js 20+
- npm
- Supabase project (URL + anon key)
- PostgreSQL database compatible with Prisma (`DATABASE_URL`, `DIRECT_URL`)

## Environment Variables

Create `app/.env` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
DATABASE_URL=...
DIRECT_URL=...
```

## Local Development

```bash
npm ci
npm run dev
```

## Quality Checks

```bash
npm run lint
npm run build
```

## Smoke Tests

Run against local app (expects app running on `http://localhost:3000`):

```bash
npm run smoke
```

Run against any deployed URL:

```bash
bash scripts/smoke.sh https://your-deployment.vercel.app
```

## Vercel Deployment

Build command:

```bash
npm run build
```

Deploy:

```bash
vercel deploy --prod --yes
```

After deploy, run smoke tests against the production URL:

```bash
bash scripts/smoke.sh https://your-production-domain.vercel.app
```
