# LRC Boat Booking Portal

Next.js + Supabase + Prisma app for Leichhardt Rowing Club booking management.

## Prerequisites

- Node.js 20+
- npm
- Supabase project (URL + anon key)
- PostgreSQL database compatible with Prisma (`DATABASE_URL`, `DIRECT_URL`)

## Environment Variables

Create `.env` with:

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

## Real Email Budget

Invite/recovery end-to-end tests can send real emails. Any future test code on this branch should reserve email budget before sending them.

Default policy:

- real email budget: `5`
- going above `5` requires explicit approval via `REAL_EMAIL_BUDGET_APPROVED=1`
- non-routable test domains such as `example.com` do not count against the budget

Reset the run budget:

```bash
npm run email-budget -- --reset
```

Reserve budget for planned sends:

```bash
npm run email-budget -- person1@example.com
npm run email-budget -- liam+signup-123@liamdye.com
```

The second command above will count against the budget because it targets a real inbox domain. If a test run genuinely needs more than five real emails, require explicit approval first and then run with:

```bash
REAL_EMAIL_BUDGET_APPROVED=1 npm run email-budget -- liam+signup-123@liamdye.com
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
