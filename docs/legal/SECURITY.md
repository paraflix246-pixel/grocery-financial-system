# Penny Pantry — Security & Privacy Architecture

Last updated: June 30, 2026

This document describes implemented security controls and known limitations. It is intended for engineering and compliance review — not as a public legal document.

## Transport security

- **TLS/HTTPS**: All API routes, Supabase auth, Stripe checkout, and OCR/receipt parsing endpoints are accessed over HTTPS in production.
- **Certificate pinning**: Not implemented in the mobile client today.

## Authentication & authorization

- **User auth**: Supabase Auth (email/password, Google OAuth). Session tokens stored locally via AsyncStorage keys cleared on sign-out and account deletion.
- **Personal receipt scoping**: SQLite `receipts.owner_user_id` and `personalReceiptScope` logic restrict personal receipt CRUD to the signed-in user.
- **Family workspace**: Workspace receipts use separate Supabase-backed storage with membership checks in `workspaceReceiptService`.
- **Admin RBAC**: Admin routes verify profile role via `admin.server.ts` (`resolveProfileRole`). Admin emails are configured server-side; non-admins cannot access `/api/admin/*` endpoints.

## Data at rest

| Store | Encryption | Notes |
|-------|------------|-------|
| Local SQLite (native) | OS-level device encryption | No app-level encryption layer |
| AsyncStorage / web fallback | Browser/OS sandbox | Used when SQLite unavailable on web |
| Supabase Postgres | Provider at-rest encryption | Auth users, subscriptions, community prices, workspace data |
| Receipt images (local) | Same as SQLite/filesystem | Optional — user can choose data-only storage |

**Limitation**: Client-side receipt databases are not independently encrypted with app-managed keys. Protection relies on device passcode/biometrics and OS sandboxing.

## Community price database

- **Opt-in**: `AppSettings.communityPriceSharing` must be enabled (default: off).
- **PII stripping**: `communityPricePiiStripper.ts` removes customer identifiers before insert.
- **No receipt images**: Images never enter the community database.
- **Anonymous contributor ID**: Random device-scoped UUID for deduplication — not linked to Supabase auth UID.
- **Aggregation only**: Read APIs return store-level price summaries, not individual user receipts.

## Audit logging

- **Admin platform**: `admin_audit_events` table (migration 009) records admin actions such as user bans and deletions.
- **Receipt operations**: Not centrally audit-logged today; deletion is local-only.

## Account & data deletion

- **Individual receipts**: `deleteReceipt` / bulk delete from receipts tab.
- **All receipts**: `deleteAllReceipts()` in Settings → Privacy & Data.
- **Account deletion**: `deleteAccount()` calls `/api/account/delete` then `wipeAllLocalData()`.

## OCR processing

- Receipt images are transmitted to DeepRead/OCR providers for parsing.
- Server-side retention of images after processing is not intentional; see Data Retention Policy.

## Recommendations (not yet implemented)

- Optional app-level SQLCipher or encrypted AsyncStorage for receipt DB on rooted/jailbroken device mitigation.
- Central audit log for privacy-sensitive user actions (export, delete-all, opt-out).
- Certificate pinning for production mobile builds.

## Contact

Security reports: privacy@pennypantry.xyz
