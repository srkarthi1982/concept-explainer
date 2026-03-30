# App Spec: concept-explainer

## 1) App Overview
- **App Name:** Concept Explainer
- **Category:** Education / Knowledge
- **Version:** V1
- **App Type:** DB-backed
- **Purpose:** Let an authenticated user create and maintain a personal library of concept explanations with search, importance, and archive controls.
- **Primary User:** A signed-in single account user managing their own concept records.

## 2) User Stories
- As a user, I want to save concept explanations, so that I can build a reusable personal reference library.
- As a user, I want to mark concepts as important, so that I can surface high-value items quickly.
- As a user, I want to archive and restore concepts safely, so that I can hide old items without deleting them.

## 3) Core Workflow
1. User signs in and opens `/app`.
2. User creates a concept entry from the workspace form.
3. App stores the concept in the user-scoped database and shows it in the list.
4. User opens `/app/concepts/:id` to review or edit the concept, toggle importance, or archive/restore it.
5. User uses search or filters to narrow visible concepts in the workspace.

## 4) Functional Behavior
- All concept records are user-scoped in the app database and must belong to the authenticated user.
- The app supports create, update, important toggle, archive, and restore; delete is not part of V1.
- `/app` is protected; unauthenticated access redirects to the parent login flow.
- Invalid or unauthorized detail routes redirect safely back to `/app?section=concepts` instead of returning `500`.

## 5) Data & Storage
- **Storage type:** Astro DB on the app’s isolated Turso database
- **Main entities:** Concepts
- **Persistence expectations:** Records persist per user and remain available after refresh and new sessions.
- **User model:** Multi-user shared infrastructure with per-user isolation

## 6) Special Logic (Optional)
- Important/favorite state is a first-class concept flag and affects how users review entries.
- Search and section-based list views separate active and archived concepts without deleting data.

## 7) Edge Cases & Error Handling
- Invalid IDs/routes: Non-numeric concept IDs redirect safely to `/app?section=concepts`.
- Empty input: Invalid or incomplete concept creation/update should be rejected by the app action layer.
- Unauthorized access: `/app` redirects to the parent login flow.
- Missing records: Missing or non-owned concepts redirect back to the workspace safely.
- Invalid payload/state: Action failures surface without crashing the workspace or detail page.

## 8) Tester Verification Guide
### Core flow tests
- [ ] Create a concept, open its detail page, edit it, and verify the update persists.
- [ ] Toggle important, archive the concept, restore it, and confirm the state changes are reflected in the workspace.

### Safety tests
- [ ] Visit `/app/concepts/not-a-number` and confirm the app redirects safely instead of crashing.
- [ ] Visit a missing concept ID and confirm the user lands back in the workspace safely.
- [ ] Attempt access as another signed-in user and confirm cross-user detail access is blocked.

### Negative tests
- [ ] Confirm there is no hard delete flow in V1.
- [ ] Confirm invalid detail inputs do not produce a `500` or console/runtime crash.

## 9) Out of Scope (V1)
- AI-generated explanations
- Public sharing or collaboration
- Permanent delete or bulk-management tools

## 10) Freeze Notes
- V1 release freeze: this document reflects the verified authenticated concept library behavior.
- Freeze Level 1 verification confirmed create, detail open, update, important toggle, archive/restore, search/filter, refresh persistence, and invalid-route safety.
- During freeze, only verification fixes and cleanup are allowed; no undocumented feature expansion.
