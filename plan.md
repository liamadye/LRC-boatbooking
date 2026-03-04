# LRC Boat Booking Portal - Implementation Plan

## 1. Data Model (extracted from XLS + Boat Usage Policy PDF)

### Resource Categories
From the spreadsheet, there are **5 bookable resource types**:

| Category | Count | Examples |
|----------|-------|---------|
| **Club Boats** | ~61 | Premiers 2024, Iron Cove, Mercury |
| **Oar Sets** | 6 | Sets A-F |
| **Private/Syndicate Boats** | ~35 | Owner-specific boats + bay 5 singles |
| **Tinnies (Coach Boats)** | 5 | 1 (8hp), 2-5 (15hp) |
| **Ergs/Bikes/Gym** | 18 | 10 ergs, 4 bikes, 4 gym spots |

### Boat Classes (from club reference image)

**Scull Boats** (each rower has 2 oars):
| Code | Name | Rowers | Avg Length | Min Weight |
|------|------|--------|-----------|------------|
| 1x | Single Scull | 1 | 8.2m (27ft) | 14kg |
| 2x | Double Scull | 2 | 10.4m (34ft) | 27kg |
| 4x | Quadruple Scull | 4 | 13.4m (44ft) | 52kg |

**Sweep Boats** (each rower has 1 oar):
| Code | Name | Rowers | Avg Length | Min Weight |
|------|------|--------|-----------|------------|
| 2- | Pair | 2 | 10.4m (34ft) | 27kg |
| 2+ | Coxed Pair | 2 + cox | 10.4m (34ft) | 32kg |
| 4- | Four | 4 | 13.4m (44ft) | 50kg |
| 4+ | Coxed Four | 4 + cox | 13.7m (45ft) | 51kg |
| 8+ | Eight | 8 + cox | 19.9m (62ft) | 96kg |

### Boat Access Classification (from Boat Usage Policy)

The club uses a **Black/Green dot system** on physical boats:

| Classification | Access | Description |
|---------------|--------|-------------|
| **Black** | Restricted | Premium/racing boats. Must apply in writing to Captain/Committee for eligibility. Requires: regatta results, erg times, training regime, racing targets, equipment care record. |
| **Green** | Open | Training boats. All active members may use. |
| **Private** | Owner only | Exclusive to owner. Includes named boats (Aurora, Prestissimo, Da'va, Rick Turner, Doppio) + all singles in bay 5 (Haberfield side). |
| **Syndicate** | By permission | Express permission of the syndicate required, or regatta allocation by Captain/Vice-Captains. |
| **Not In Use** | Blocked | "Not In Use" sign = absolutely no one can use it. Admin-toggled. |

The XLS uses text tags that map to this system:
- `(INVITE ONLY)` → **Black** boat (restricted access)
- `(OUTSIDE)` → Boat stored outside shed (not counted in shed total)
- `(experienced scullers only)` → **Black** or skill-gated
- No tag → **Green** boat (open access)

### Crew Weight Restrictions
Each boat has an "Ave Kg" (ideal average crew weight).
**Rule**: Crew average weight must be **within ±10%** of the noted Boat Weight.
> Example: A 70kg boat requires crew average of 63kg–77kg.

### Time Slots (9 per day, from XLS)
| Slot | Time | Notes |
|------|------|-------|
| 1 | 5:00am ON | Senior competitive / students only (weekdays) |
| 2 | 5:30am ON | |
| 3 | 6:00am ON | Recreationals can start from 5:45am (weekdays) |
| 4 | 6:30am ON | |
| 5 | 7:00am ON | Senior competitive must return by 7am (weekdays) |
| 6 | 7:30am ON | Recreationals must return by 7:30am (weekdays) |
| 7 | 8:00am - 4:30pm | Daytime (write specific times) |
| 8 | 4:30pm - 6:00pm | Afternoon |
| 9 | 6:15pm onward | Evening |

**Weekend times**: Everyone collects by 6am, returns by 8am.

### Booking Protocol (from Boat Usage Policy)

1. **Booking window**: Opens on Thursdays for the following Mon→Sun week
2. **First come first served**, with priority rules:
   - Race-specific bookings get priority over general bookings
   - LRC-only crews get priority over composite crews
   - No consecutive-day bookings for same boat, UNLESS targeting specific regattas (must provide: training days, target regattas)
3. **10-Minute Rule**: A booked boat not taken from rack 10 min after start time (with no sign of the booker) becomes available to any eligible member
4. **Ergs**: One timeslot only per person
5. **Tinnies**: Coach included in total shed count

### Member Types (from Policy)
| Type | Weekday Access | Weekend Access | Boat Access |
|------|---------------|----------------|-------------|
| **Senior Competitive** | Collect by 5am, return by 7am | Collect by 6am, return by 8am | Green + Black (if approved) |
| **Student** | Same as Senior Competitive | Same as Senior Competitive | Green + Black (if approved) |
| **Recreational** | Collect AFTER 5:45am, return by 7:30am | Collect by 6am, return by 8am | **Green boats only** |

### Squads (from XLS "Responsible Squad" column)
HARPOONS, AVIANS, TRIDENTS, F TROOP, BULLSHARKS, HELLS BELLES, GOLDIES, ROWMANTICS, REXES, MEN'S SCULLERS, JUNIORS, S JAQUES SCULLERS, plus individual coaches/captains.

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | **Next.js 14 (App Router)** + TypeScript | SSR, API routes, great DX |
| UI | **Tailwind CSS** + **shadcn/ui** | Fast, consistent, accessible components |
| Database | **PostgreSQL** (via Supabase) | Relational data, row-level security |
| ORM | **Prisma** | Type-safe queries, migrations |
| Auth | **Supabase Auth** | Google/email login, role-based |
| Hosting | **Vercel** | Zero-config Next.js deployment |

---

## 3. Database Schema

```sql
-- Member types matching the Boat Usage Policy
CREATE TYPE member_type AS ENUM ('senior_competitive', 'student', 'recreational');
CREATE TYPE user_role AS ENUM ('admin', 'captain', 'vice_captain', 'squad_captain', 'member');
CREATE TYPE boat_classification AS ENUM ('black', 'green');
CREATE TYPE boat_status AS ENUM ('available', 'not_in_use');
CREATE TYPE boat_category AS ENUM ('club', 'private', 'syndicate', 'tinny');
CREATE TYPE equipment_type AS ENUM ('erg', 'bike', 'gym');
CREATE TYPE resource_type AS ENUM ('boat', 'equipment', 'oar_set');

-- Squads
CREATE TABLE squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,                   -- e.g. "HARPOONS"
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users / Members
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'member',
  member_type member_type DEFAULT 'recreational',
  squad_id UUID REFERENCES squads(id),
  weight_kg DECIMAL(5,1),                      -- for crew weight validation
  has_black_boat_eligibility BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Users can belong to multiple squads
CREATE TABLE user_squads (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, squad_id)
);

-- Boats (club, private, syndicate)
CREATE TABLE boats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                           -- e.g. "Iron Cove", "Mercury"
  boat_type TEXT NOT NULL,                      -- e.g. "8+", "4x/4-", "1x"
  category boat_category NOT NULL DEFAULT 'club',
  classification boat_classification NOT NULL DEFAULT 'green',
  status boat_status NOT NULL DEFAULT 'available',
  avg_weight_kg DECIMAL(5,1),                  -- ideal avg crew weight
  is_outside BOOLEAN DEFAULT FALSE,            -- stored outside shed
  responsible_squad_id UUID REFERENCES squads(id),
  responsible_person TEXT,                      -- e.g. "JEN ZONGOR" (when not a squad)
  owner_user_id UUID REFERENCES users(id),     -- for private boats
  display_order INT NOT NULL DEFAULT 0,
  notes TEXT,                                   -- e.g. "NOT ROWABLE AS SWEEP - OK AS QUAD"
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Equipment (ergs, bikes, gym)
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type equipment_type NOT NULL,
  number INT NOT NULL,                          -- e.g. Erg 1, Bike 11
  UNIQUE(type, number)
);

-- Oar Sets
CREATE TABLE oar_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL                     -- "Set A" through "Set F"
);

-- Time Slots (configurable per day type)
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_number INT NOT NULL,                     -- 1-9
  label TEXT NOT NULL,                          -- e.g. "5:00am ON"
  start_time TIME,
  end_time TIME,
  is_weekend BOOLEAN DEFAULT FALSE,
  UNIQUE(slot_number, is_weekend)
);

-- Bookings
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  resource_type resource_type NOT NULL,
  boat_id UUID REFERENCES boats(id),
  equipment_id UUID REFERENCES equipment(id),
  oar_set_id UUID REFERENCES oar_sets(id),
  user_id UUID REFERENCES users(id) NOT NULL,  -- who made the booking
  booker_name TEXT NOT NULL,                    -- displayed name (can book for others)
  crew_count INT NOT NULL DEFAULT 1,
  start_slot INT NOT NULL,                      -- 1-9
  end_slot INT NOT NULL,                        -- 1-9 (for multi-slot X marks)
  is_race_specific BOOLEAN DEFAULT FALSE,       -- gets booking priority
  race_details TEXT,                            -- target regattas if race-specific
  notes TEXT,                                   -- e.g. specific time within 8am-4:30pm slot
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure only one resource FK is set
  CHECK (
    (boat_id IS NOT NULL)::int +
    (equipment_id IS NOT NULL)::int +
    (oar_set_id IS NOT NULL)::int = 1
  ),
  -- No double-booking: one resource per slot per day
  UNIQUE(date, boat_id, start_slot),
  UNIQUE(date, equipment_id, start_slot),
  UNIQUE(date, oar_set_id, start_slot)
);

-- Booking week configuration (controls when bookings open)
CREATE TABLE booking_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,              -- Monday of the booking week
  opens_at TIMESTAMPTZ NOT NULL,                -- Thursday when bookings open
  closes_at TIMESTAMPTZ,                        -- optional close time
  pymble_notes TEXT,                            -- per-week Pymble timing notes
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Black boat eligibility applications (audit trail)
CREATE TABLE black_boat_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  status TEXT DEFAULT 'pending',                -- pending, approved, denied
  regatta_results TEXT,
  erg_times TEXT,
  training_regime TEXT,
  racing_targets TEXT,
  equipment_care_notes TEXT,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. Application Pages & Features

### 4.1 Landing / Login Page (`/`)
- Club branding (Leichhardt Rowing Club logo + colors)
- Google OAuth + email/password login via Supabase Auth
- New member registration (pending admin approval)

### 4.2 Weekly Booking Grid (`/bookings` — main view)
This is the digital equivalent of the XLS spreadsheet:

- **Week selector**: Shows Mon→Sun, matches booking week cycle
- **Day tabs** across top (like the XLS sheet tabs)
- **Sticky header row**: Time slot labels (5:00am, 5:30am, ... 6:15pm+)
- **Live totals bar** (pinned): "TOTAL IN SHED" + "TOTAL ROWING" per slot, auto-calculated
- **PYMBLE rules banner**: Day-specific timing notes (e.g. "PYMBLE BOATING 5:15AM / LANDING 6:45AM")

**Collapsible sections** (matching XLS layout):

| Section | Color | Content |
|---------|-------|---------|
| **Eights (8+)** | Grey | 14 boats, grouped first |
| **Fours (4x/4-/4+)** | Grey | 14 boats |
| **Pairs/Doubles (2-/x, 2x)** | Grey | 15 boats |
| **Singles (1x)** | Grey/Green | 20 boats |
| **Oar Sets** | Pink | Sets A-F |
| **Private Boats** | Blue | ~35 owner-specific boats |
| **Tinnies** | Neutral | 5 coach boats |
| **Ergs / Bikes / Gym** | Yellow | 10 + 4 + 4 |

**Grid columns**: Boat Name | Type | Avg Wt | Squad | [9 time slot columns]

**Each cell shows**: Booker name + crew count (e.g. "Harpoons (9)"), with "X" continuation marks

**Click a cell** → opens booking modal

**Visual indicators**:
- Black dot icon on restricted (Black) boats
- Green dot icon on open (Green) boats
- Lock icon on private/syndicate boats
- "NOT IN USE" banner on disabled boats
- Greyed-out slots that violate member type time rules

### 4.3 Booking Modal
- Pre-filled: boat name, date, selected time slot
- **Fields**:
  - Name (pre-filled from profile, editable for booking on behalf of others)
  - Number in crew
  - Multi-slot toggle (select additional slots for X-mark continuations)
  - Race-specific checkbox (if yes → text field for regatta/target details)
  - Notes (for daytime slot specific times)
- **Validation rules enforced**:
  1. **Classification check**: Black boat → user must have `has_black_boat_eligibility`
  2. **Weight check**: Crew avg weight within ±10% of boat's avg_weight_kg
  3. **Member type time check**: Recreationals can't book before 5:45am weekdays, green boats only
  4. **Crew count check**: Can't exceed max crew for boat type
  5. **Private boat check**: Must be owner
  6. **Erg limit**: One timeslot only
  7. **Consecutive day check**: Warn if same boat booked on consecutive days (allow with race justification)
  8. **Booking window check**: Only bookable if current time is within the Thursday→Sunday open window

### 4.4 My Bookings (`/my-bookings`)
- List of upcoming bookings grouped by week
- Cancel / edit capabilities
- History of past bookings

### 4.5 Admin Panel (`/admin`)
- **Dashboard**: Overview of this week's bookings, utilization stats
- **Manage Boats**: Add/edit boats, toggle Black/Green, set Not In Use, assign squads
- **Manage Squads**: Create/edit squads, assign captains
- **Manage Members**: Approve new members, change roles/member types, grant Black boat eligibility
- **Black Boat Applications**: Review incoming eligibility requests
- **Booking Weeks**: Configure weekly booking windows (opens Thursday), set Pymble notes
- **Import from XLS**: One-time seed from existing spreadsheet
- **Override bookings**: Full edit/delete power on any booking

### 4.6 Black Boat Application (`/apply/black-boat`)
- Form for members to apply for Black boat eligibility
- Fields: regatta results, erg times, training regime, racing targets, equipment care record
- Status tracker (pending / approved / denied)

---

## 5. Business Logic Summary

| Rule | Source | Implementation |
|------|--------|---------------|
| Black/Green classification | Policy PDF | `boats.classification` + `users.has_black_boat_eligibility` |
| Weight ±10% | Policy PDF | Server-side validation on booking creation |
| Booking opens Thursdays | Policy PDF | `booking_weeks.opens_at` checked before allowing bookings |
| No consecutive days (unless racing) | Policy PDF | Query check + `bookings.is_race_specific` override |
| LRC-only crews priority | Policy PDF | Sort/priority flag in booking queue |
| 10-minute rule | Policy PDF | UI indicator after slot start + 10 min for unclaimed bookings |
| Recreational time restrictions | Policy PDF | Time slot filtering based on `users.member_type` |
| Rec = green boats only | Policy PDF | Classification filter on booking validation |
| Private boats = owner only | Policy PDF + XLS | `boats.owner_user_id` check |
| Syndicate boats by permission | Policy PDF | Admin-managed access list |
| Not In Use = blocked | Policy PDF | `boats.status = 'not_in_use'` prevents all bookings |
| Ergs = 1 slot only | XLS | `equipment.max_slots = 1` for erg type |
| Tinnies count in shed total | XLS | Include tinny bookings in TOTAL IN SHED calc |
| PYMBLE timing rules | XLS | Display-only banner per day |
| TOTAL IN SHED / TOTAL ROWING | XLS | Real-time calculation from bookings |

---

## 6. Implementation Phases

### Phase 1: Project Scaffolding & Database (Steps 1-3)
1. Initialize Next.js 14 + TypeScript + Tailwind + shadcn/ui
2. Set up Prisma schema with all tables above + Supabase PostgreSQL
3. Write seed script to import boats, squads, equipment from the XLS file

### Phase 2: Auth & Member Profiles (Steps 4-5)
4. Supabase Auth (Google + email/password) with role-based middleware
5. Member profile page (name, weight, member type, squad affiliations)

### Phase 3: Booking Grid UI (Steps 6-7)
6. Build the weekly booking grid (read-only) with day tabs, collapsible sections, color coding
7. Add sticky totals bar (TOTAL IN SHED / TOTAL ROWING), Pymble banner, Black/Green dot indicators

### Phase 4: Booking CRUD + Validation (Steps 8-10)
8. Booking modal with all form fields
9. API routes for create/read/update/delete bookings
10. Implement all validation rules (classification, weight, time restrictions, consecutive days, etc.)

### Phase 5: Admin & Applications (Steps 11-13)
11. Admin panel — boat/squad/member management, booking week config
12. Black Boat eligibility application flow + admin review
13. My Bookings page with cancel/edit

### Phase 6: Testing (Steps 14-16)
14. **Unit tests** (Vitest): Booking validation logic (weight ±10%, classification checks, time restrictions, consecutive day rules, erg single-slot limit)
15. **Integration tests** (Vitest + Prisma): API route tests for booking CRUD, auth middleware, admin operations, booking window enforcement
16. **E2E tests** (Playwright): Full booking flow (login → grid → book → confirm → my bookings → cancel), admin flow (manage boats, approve Black boat applications), member type restrictions in UI

**Test structure:**
```
__tests__/
├── unit/
│   ├── validation/
│   │   ├── weight-check.test.ts        — crew avg within ±10% of boat weight
│   │   ├── classification-check.test.ts — Black boat eligibility enforcement
│   │   ├── time-restriction.test.ts     — member type vs time slot rules
│   │   ├── consecutive-day.test.ts      — same-boat consecutive day detection
│   │   └── erg-limit.test.ts            — one timeslot only for ergs
│   └── utils/
│       └── totals-calculation.test.ts   — TOTAL IN SHED / TOTAL ROWING logic
├── integration/
│   ├── api/
│   │   ├── bookings.test.ts             — CRUD + validation + conflicts
│   │   ├── boats.test.ts                — admin boat management
│   │   └── auth.test.ts                 — role-based access control
│   └── seed/
│       └── xls-import.test.ts           — verify XLS import produces correct data
└── e2e/
    ├── booking-flow.spec.ts             — full booking lifecycle
    ├── admin-flow.spec.ts               — admin panel operations
    └── access-control.spec.ts           — member type restrictions in grid UI
```

### Phase 7: Deploy to Vercel (Steps 17-18)
17. **Vercel project setup**: Connect GitHub repo, configure environment variables (Supabase URL, anon key, service role key, database URL), set up preview deployments for PRs
18. **Production deployment**: Custom domain (if available), Vercel Edge middleware for auth, Supabase connection pooling via Prisma, CI pipeline (GitHub Actions: lint → type-check → unit tests → integration tests → build → deploy)

**Vercel configuration:**
```
vercel.json:
- Framework: Next.js (auto-detected)
- Build command: prisma generate && next build
- Environment variables:
  - NEXT_PUBLIC_SUPABASE_URL
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - DATABASE_URL (Supabase pooled connection string)

GitHub Actions CI (.github/workflows/ci.yml):
- On push/PR to main:
  1. npm ci
  2. npx prisma generate
  3. npm run lint
  4. npm run type-check
  5. npm run test:unit
  6. npm run test:integration (uses test DB)
  7. npm run build
  8. Vercel auto-deploys on merge to main
```
