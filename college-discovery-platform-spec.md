# 🎓 College Discovery Platform — Complete Build Specification

## Project Overview

Build **"Track B"** — a production-grade college discovery and decision-making platform. The goal is to help students discover, research, and compare colleges to make informed admission decisions. This is an MVP, not a marketplace. Focus on **4 core features executed exceptionally well**: College Discovery, College Details, Side-by-Side Comparison, and User Authentication with Saved Items.

**Reference UX Patterns:** careers360.com (search/filter density), collegedunia.com (comparison tables, detail depth).

---

## Mandatory Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18+, TypeScript, TailwindCSS, shadcn/ui (or Radix primitives) |
| **Backend** | Node.js, TypeScript, Next.js 14+ (App Router + API Routes) |
| **Database** | PostgreSQL (via Prisma ORM) |
| **Auth** | NextAuth.js v5 (Auth.js) with Credentials + Google OAuth |
| **State Management** | TanStack Query (React Query) for server state, Zustand for client state |
| **Search** | PostgreSQL Full-Text Search (tsvector/tsquery) — no external search engine required |
| **Deployment** | Vercel (frontend + API), Render or Supabase (PostgreSQL) |

---

## Feature 1: College Listing + Advanced Search

### Objective
Build a high-performance, filter-rich discovery page that feels instant and responsive.

### Frontend Requirements
- **Layout:** Hero search bar + filter sidebar (desktop) / filter drawer (mobile) + responsive grid/list toggle
- **Search Bar:** Real-time debounced search (300ms) across college name, location, and courses offered. Show search suggestions dropdown.
- **Filters (Multi-select, collapsible sections):**
  - Location: State, City (cascading dropdown)
  - Course/Stream: Engineering, Medical, Management, Arts, Science, etc.
  - Fee Range: Min-Max slider (INR 50K — 20L+ per year)
  - Rating: 1-5 stars filter
  - Ownership: Government / Private / Deemed
  - Accreditation: NAAC Grade (A++, A+, A, B++, etc.)
  - Exam Accepted: JEE Main, NEET, CAT, etc.
- **Sort Options:** Relevance, Rating (High-Low), Fees (Low-High), Placement (High-Low)
- **Pagination:** Cursor-based infinite scroll (Intersection Observer) with "Load More" fallback. Show skeleton loaders during fetch.
- **College Card Component:**
  - College name (truncated with tooltip if long)
  - Location badge (City, State)
  - Ownership badge (color-coded: green government, blue private)
  - Rating with star visual + review count
  - Annual fee range
  - Top 3 courses as small pills
  - "Compare" checkbox (adds to comparison bucket)
  - "Save" heart icon (requires auth, shows login modal if guest)
  - Click navigates to College Detail Page

### Backend Requirements
- **GET `/api/colleges`**
  - Query params: `search`, `states[]`, `cities[]`, `streams[]`, `minFee`, `maxFee`, `minRating`, `ownership[]`, `accreditation[]`, `exams[]`, `sortBy`, `cursor`, `limit` (default 12)
  - Returns: `{ colleges: [], nextCursor: string | null, totalCount: number }`
  - Use Prisma + PostgreSQL. Implement full-text search using `tsvector` on `name` and `courses` fields.
  - All filters must be composable (AND logic). Optimize with proper indexes.
  - Response time target: <200ms for first page, <100ms for subsequent pages.

### Database Schema (Prisma)

```prisma
model College {
  id            String   @id @default(cuid())
  name          String
  slug          String   @unique
  location      String
  city          String
  state         String
  ownership     OwnershipType
  accreditation String?
  rating        Float    @default(0)
  reviewCount   Int      @default(0)
  feesMin       Int
  feesMax       Int
  description   String?  @db.Text
  website       String?
  established   Int?
  logoUrl       String?
  images        String[]
  courses       Course[]
  placements    Placement?
  reviews       Review[]
  savedBy       SavedCollege[]
  searchVector  Unsupported("tsvector")?
  @@index([searchVector])
  @@index([state, city])
  @@index([rating])
  @@index([feesMin, feesMax])
}

model Course {
  id          String @id @default(cuid())
  name        String
  stream      String
  duration    String
  fees        Int
  eligibility String
  collegeId   String
  college     College @relation(fields: [collegeId], references: [id], onDelete: Cascade)
  @@index([stream])
}

model Placement {
  id              String @id @default(cuid())
  highestPackage    Int
  averagePackage    Int
  medianPackage     Int
  placementRate     Float
  topRecruiters     String[]
  collegeId         String @unique
  college           College @relation(fields: [collegeId], references: [id], onDelete: Cascade)
}

model Review {
  id        String   @id @default(cuid())
  rating    Int
  content   String   @db.Text
  author    String
  createdAt DateTime @default(now())
  collegeId String
  college   College  @relation(fields: [collegeId], references: [id], onDelete: Cascade)
}

enum OwnershipType {
  GOVERNMENT
  PRIVATE
  DEEMED
  AUTONOMOUS
}

model SavedCollege {
  id        String   @id @default(cuid())
  userId    String
  collegeId String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  college   College  @relation(fields: [collegeId], references: [id], onDelete: Cascade)
  @@unique([userId, collegeId])
}
```

---

## Feature 2: College Detail Page

### Objective
A comprehensive, scannable detail page that answers every question a prospective student has.

### Frontend Requirements
- **URL:** `/college/[slug]` — static generation for top 100 colleges, ISR for others (revalidate 1 hour)
- **Sticky Navigation:** Overview | Courses | Placements | Reviews — smooth scroll to sections
- **Hero Section:** College name, location, ownership badge, rating (large), save button, compare button, established year, website link
- **Overview Tab:**
  - Description (expandable/collapsible if >300 chars)
  - Key stats grid: Total Courses, Avg Package, Placement Rate, Campus Area
  - Accreditation badges
  - Gallery carousel (3-5 images)
- **Courses Tab:**
  - Search within courses
  - Table: Course Name | Stream | Duration | Annual Fees | Eligibility
  - Expandable rows for course description
- **Placements Tab:**
  - Stats cards: Highest Package, Average Package, Median Package, Placement Rate %
  - Bar chart visualization (use Recharts or similar): Package distribution (0-5L, 5-10L, 10-15L, 15L+)
  - Top recruiters marquee/grid
- **Reviews Tab:**
  - Average rating breakdown (5-star distribution bar chart)
  - Review cards: Rating stars, author, date, content
  - Sort: Most Recent, Highest Rated, Lowest Rated
  - Pagination (10 per page)

### Backend Requirements
- **GET `/api/colleges/[slug]`**
  - Returns full college object with nested courses, placement, and paginated reviews (first 10)
  - Include `isSaved` boolean if authenticated user has saved this college
- **GET `/api/colleges/[slug]/reviews`**
  - Query: `page`, `sortBy`
  - Returns paginated reviews

---

## Feature 3: Compare Colleges (Side-by-Side)

### Objective
A sticky, accessible comparison experience that makes trade-offs visually obvious.

### Frontend Requirements
- **Comparison Bucket:** Floating action button (FAB) at bottom of screen when 1+ colleges selected. Shows count badge. "Compare Now" button enabled when 2-3 colleges selected. Max 3 colleges.
- **Comparison Page:** `/compare?colleges=slug1,slug2,slug3`
- **Layout:** Fixed first column (attribute names), scrollable college columns. Sticky header with college name + logo + remove button.
- **Comparison Sections:**
  - **Basic Info:** Name, Location, Ownership, Established, Accreditation, Rating
  - **Fees:** Min-Max range, visual bar comparison
  - **Courses:** List with stream badges. Highlight common courses.
  - **Placements:** Highest/Average/Median packages side-by-side. Placement rate % with progress bars.
  - **Reviews:** Average rating + total count
- **Highlighting:** Best value in each row gets a subtle green tint. Worst gets subtle red tint (for numeric comparisons only).
- **Share Comparison:** Copy link button with toast notification.
- **Save Comparison:** Authenticated users can save comparison sets to profile.

### Backend Requirements
- **GET `/api/compare`**
  - Query: `slugs[]` (2-3 items, validate length)
  - Returns array of college objects with all comparison-relevant data pre-loaded
  - Include `userSaved` status for each if authenticated

---

## Feature 4: Authentication + Saved Items

### Objective
Secure, frictionless auth that enables personalization without blocking discovery.

### Frontend Requirements
- **Auth Modal:** Overlay (not page redirect) for login/signup. Support email/password + Google OAuth.
  - Login: Email + Password
  - Signup: Name + Email + Password (min 8 chars, 1 uppercase, 1 number)
  - Show validation errors inline
- **User Menu (when logged in):** Avatar dropdown with "Saved Colleges", "Saved Comparisons", "Logout"
- **Saved Colleges Page (`/saved`):**
  - Grid of saved college cards (reuse College Card component)
  - Remove from saved (X button on card)
  - Empty state illustration + CTA to browse
- **Saved Comparisons Page (`/saved/comparisons`):**
  - List of saved comparison sets with college names + date saved
  - Click to view comparison again
  - Delete option
- **Guest Experience:** All discovery features work without login. Save/Compare actions trigger auth modal. After login, redirect back to previous action.

### Backend Requirements

**NextAuth.js v5 Configuration:**
- Credentials provider (email/password, bcrypt hashed)
- Google OAuth provider
- JWT strategy with refresh token rotation
- Session stored in PostgreSQL via Prisma Adapter

**User Schema:**

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String?   // For credentials provider only
  image         String?
  savedColleges SavedCollege[]
  savedComparisons SavedComparison[]
  accounts      Account[]
  sessions      Session[]
  createdAt     DateTime  @default(now())
}

model SavedComparison {
  id        String   @id @default(cuid())
  userId    String
  name      String   // Auto-generated: "IIT Bombay vs IIT Delhi"
  collegeSlugs String[]
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Protected API Routes:**
- `POST /api/saved/colleges` — toggle save/unsave
- `GET /api/saved/colleges` — list user's saved colleges
- `POST /api/saved/comparisons` — save a comparison set
- `GET /api/saved/comparisons` — list saved comparisons
- `DELETE /api/saved/comparisons/[id]` — delete comparison
- All protected routes return 401 if unauthenticated

---

## Data Requirements (Seeding)

**Critical:** Do NOT hardcode data in frontend. All data must flow from PostgreSQL via APIs.

- **Seed Script:** Create `prisma/seed.ts` with 50 realistic Indian colleges including:
  - IIT Bombay, IIT Delhi, IIT Madras, IIT Kanpur, IIT Kharagpur
  - NIT Trichy, NIT Surathkal, NIT Warangal
  - AIIMS Delhi, AIIMS Jodhpur
  - IIM Ahmedabad, IIM Bangalore, IIM Calcutta
  - BITS Pilani, VIT Vellore, SRM Chennai, Manipal University
  - Delhi University (Hindu College, St. Stephen's)
  - 30+ additional diverse colleges (government/private, various states, various ratings)
- **Realistic Data:** Use actual fee ranges (INR 50K - 3L), actual placement packages (6L - 30L average), real locations, 3-8 courses per college, 5-15 reviews per college with varied ratings.
- **Images:** Use placeholder image service (placehold.co or picsum) with consistent dimensions. Store URLs in DB.
- **Run seed:** `npx prisma db seed`

---

## Architecture & Performance Requirements

### API Design
- All APIs return consistent JSON: `{ success: boolean, data: T, error?: string, message?: string }`
- Input validation using Zod on every route
- Proper HTTP status codes (200, 201, 400, 401, 404, 429, 500)
- Rate limiting on search API (100 req/min per IP using `rate-limiter-flexible` or Vercel KV)

### Frontend Performance
- Route-based code splitting (Next.js dynamic imports)
- Image optimization with `next/image`
- Prefetch college detail pages on search result hover
- Debounce search input (300ms)
- Optimistic UI updates for save/unsave actions
- Skeleton screens for all loading states (no generic spinners)

### State Management
- TanStack Query for all server data with proper cache keys
- Zustand store for: comparison bucket (localStorage persisted), filter state (URL query params synced), auth modal visibility
- Filter state MUST sync with URL query params (shareable filtered URLs)

### Responsive Design
- Mobile-first approach
- Search page: filters in bottom sheet (shadcn Sheet component)
- Comparison: horizontal scroll with sticky first column
- Detail page: stacked sections, horizontal scroll for course table
- Minimum supported width: 320px

### Accessibility
- All interactive elements keyboard navigable
- Proper ARIA labels for filters, sort, compare checkboxes
- Focus trapping in modals
- Color contrast WCAG AA compliant

---

## UI/UX Specifications

### Design System
Use TailwindCSS with a cohesive color palette:
- Primary: `#2563EB` (blue-600)
- Success: `#16A34A` (green-600) — for best values, saved states
- Danger: `#DC2626` (red-600) — for worst values, remove actions
- Background: `#F8FAFC` (slate-50)
- Card: `#FFFFFF`
- Text Primary: `#0F172A` (slate-900)
- Text Secondary: `#64748B` (slate-500)

### Typography
Inter or Geist font (Next.js built-in). Clear hierarchy:
- H1: 24px
- H2: 20px
- H3: 16px
- Body: 14px

### Spacing
Consistent 4px grid (Tailwind defaults)

### Shadows
Subtle shadows for cards (`shadow-sm`, `shadow-md` on hover)

### Animations
Minimal, purposeful only:
- Card hover: translateY(-2px) + shadow increase
- Modal: fade + scale
- Page transitions: none (keep it snappy)
- Skeleton: pulse animation

---

## Deployment Checklist

### Vercel Configuration
- Environment variables: `DATABASE_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Build command: `prisma generate && next build`
- Install command: `npm install`
- Node.js version: 20.x

### Database
- PostgreSQL on Render or Supabase
- Connection pooling recommended (PgBouncer or Supabase connection pooler)
- Run migrations: `npx prisma migrate deploy`

### Post-Deploy Verification
- Search API responds <200ms
- All 50 colleges accessible via slug
- Compare page works with 2 and 3 colleges
- Auth flow complete (signup → save college → view saved → logout)
- Mobile responsive test on 375px width

---

## Deliverables Structure

```
/college-discovery-platform
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (auth)/login/page.tsx
│   │   ├── (main)/
│   │   │   ├── page.tsx (search/home)
│   │   │   ├── college/[slug]/page.tsx
│   │   │   ├── compare/page.tsx
│   │   │   └── saved/
│   │   │       ├── page.tsx (saved colleges)
│   │   │       └── comparisons/page.tsx
│   │   ├── api/
│   │   │   ├── colleges/route.ts
│   │   │   ├── colleges/[slug]/route.ts
│   │   │   ├── colleges/[slug]/reviews/route.ts
│   │   │   ├── compare/route.ts
│   │   │   ├── saved/colleges/route.ts
│   │   │   └── saved/comparisons/route.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/ (shadcn components)
│   │   ├── college/
│   │   ├── search/
│   │   ├── compare/
│   │   ├── auth/
│   │   └── layout/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── public/
├── .env.example
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## Success Criteria

- [ ] Search with 3+ active filters returns results in <200ms
- [ ] Infinite scroll loads next page without layout shift
- [ ] Compare page renders 3 colleges with all sections visible without horizontal overflow issues
- [ ] Unauthenticated user can browse, search, filter seamlessly
- [ ] Authenticated user can save colleges, view them in /saved, and persist across sessions
- [ ] Mobile experience is fully functional (all features work on 375px width)
- [ ] No hardcoded data in frontend components — all data from DB via API
- [ ] TypeScript strict mode enabled with zero `any` types in business logic
- [ ] All forms have Zod validation with user-friendly error messages

---

> **Build this as a cohesive product where discovery flows naturally into comparison, and comparison drives users to save and return. Prioritize speed, clarity, and reliability over visual flair.**
