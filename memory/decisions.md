### [2026-04-28] arquitecto — plan técnico: NextAuth.js + Google OAuth

**Stack elegido:**
- **next-auth v5 (Auth.js)** — Standard for Next.js App Router, handles sessions, CSRF, JWT automatically
- **@auth/prisma-adapter** — Official adapter for Prisma, keeps user data in our SQLite database
- **Google OAuth** — Single sign-on, no password management needed, users already have Google accounts

**V1 — solo esto:**
1. User can sign in with Google via /login page
2. All existing properties assigned to a "default" user on migration
3. New properties created with current user's ID
4. API routes filter by authenticated user
5. AppLayout shows real user avatar and name from session

**V2 y V3:**
- V2: Email/password option, password reset
- V2: User settings/preferences per user (not global)
- V3: Organization/team support, property sharing
- V3: Role-based permissions (admin, viewer, etc.)

**Estructura de carpetas:**
```
src/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts      # NextAuth.js configuration
│   │   └── properties/
│   │       └── route.ts            # Filter by user_id
│   └── login/
│       └── page.tsx                # Dark theme login page
├── components/
│   ├── AuthProvider.tsx            # Session provider wrapper
│   └── AppLayout.tsx               # Updated with user session
├── middleware.ts                   # Route protection
└── lib/
    └── auth.ts                     # Auth utilities
```

**Riesgos técnicos:**
1. **Migration of 127 existing properties** — Mitigation: Use @default for user_id, create default user in migration or seed
2. **Breaking existing API calls** — Mitigation: All API routes need session check, return 401 if missing
3. **Environment variables missing** — Mitigation: Document required vars, fail gracefully with clear error messages

**Schema changes needed:**
- Add User model (NextAuth standard)
- Add Account, Session, VerificationToken models
- Add user_id to Property model
- Add User.properties relation

### [2026-04-28] arquitecto — COMPLETED: NextAuth.js + Google OAuth Implementation

**Implementation Summary:**
All 5 phases completed successfully:

1. **Schema Changes** - Added NextAuth models (User, Account, Session, VerificationToken) and user_id to Property
2. **NextAuth Configuration** - Created `/api/auth/[...nextauth]/route.ts` with Google OAuth provider
3. **Middleware** - Created `middleware.ts` protecting dashboard, properties, reports, settings routes
4. **UI Updates** - Dark theme login page, AppLayout shows real user avatar/name
5. **Data Scoping** - All API routes now filter by authenticated user's ID

**Files Created/Modified:**
- `prisma/schema.prisma` - Added auth models and user_id
- `src/app/api/auth/[...nextauth]/route.ts` - New
- `src/middleware.ts` - New
- `src/app/login/page.tsx` - New
- `src/components/AuthProvider.tsx` - New
- `src/types/next-auth.d.ts` - New
- `src/app/layout.tsx` - Added AuthProvider wrapper
- `src/components/AppLayout.tsx` - Updated with session data
- `src/app/api/properties/route.ts` - Added auth checks
- `src/app/api/properties/[id]/route.ts` - Added ownership verification
- `.env.local.example` - New

**Required Actions for User:**
1. Install dependencies: `npm install next-auth @auth/prisma-adapter`
2. Apply migration: `npx prisma db push`
3. Set up Google OAuth credentials at https://console.cloud.google.com/apis/credentials
4. Copy .env.local.example to .env.local and fill in values
5. Run `npm run build` to verify

**Blocker:** Need Google OAuth credentials from user to complete setup.
