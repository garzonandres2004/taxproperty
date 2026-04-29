# Workstream C: Authentication & Multi-User - Context

## Mission
Add user authentication with NextAuth.js and Google OAuth to transform TaxProperty from a single-user tool to a multi-user platform where properties are scoped to individual users.

## Why This Matters
- Currently single-user: all properties are shared/global
- Need data isolation between users
- Foundation for future features: teams, sharing, permissions

## Scope
### In Scope
- Google OAuth sign-in/sign-out
- User session management
- Property ownership (user_id foreign key)
- Route protection (middleware)
- Login/logout UI
- User avatar display in AppLayout

### Out of Scope (V1)
- Email/password authentication
- Role-based access control (RBAC)
- Team/organization accounts
- Property sharing between users
- Password reset flows
- Email verification

## Stakeholders
- Primary: Andres (product owner)
- Technical: Workstream C agent (this work)
- Coordination: Other agents working on schema-dependent features

## Key Constraints
- 127 real Utah County properties exist - migration must preserve them
- Schema changes affect all queries - coordinate with other workstreams
- Must work with existing dark theme UI
- Build must pass before completion

## Success Criteria
- [ ] Can log in with Google
- [ ] Properties are user-scoped (created with user_id)
- [ ] Cannot access data without login
- [ ] Build passes (`npm run build`)
- [ ] Existing properties remain accessible
