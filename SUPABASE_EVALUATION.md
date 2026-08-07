# Architecture Decision Record (ADR): Supabase Platform Evaluation vs. Existing PostgreSQL Backend

**Status:** Proposed / Evaluated  
**Decision:** Preserve Existing PostgreSQL Backend + Custom Express API Foundation  
**Target Component:** GBK Financial CRM Integration Engine & Data Tier  
**Date:** August 2026  

---

## 1. Executive Summary
GBK Financial CRM currently operates on a custom Node.js/Express API server connected to a PostgreSQL database with an in-memory/Service Worker fallback for offline and local desktop support. This evaluation assesses whether introducing Supabase as a primary backend, hybrid auth/storage service, or realtime engine provides measurable architectural benefits without compromising data integrity, client ownership, or offline desktop execution.

**Recommendation:** Retain the current dedicated PostgreSQL schema and Express service layer. Supabase must **not** be introduced as an untracked second database or parallel source of truth.

---

## 2. Technical Comparison Matrix

| Evaluation Vector | Existing PostgreSQL + Express | Supabase Primary Backend | Supabase Hybrid (Auth/Realtime Only) |
| :--- | :--- | :--- | :--- |
| **User Identity Mapping** | Single source of truth in `users` table mapped to CRM roles/clearance. | Managed via `auth.users` with trigger sync to public schemas. | Dual-ID mapping required (`auth.uid()` vs `users.id`). |
| **Database Schema** | Pure SQL in `schema.sql` (`clients`, `tasks`, `client_notes`, `users`). | PostgreSQL with PostgREST automated REST generation. | Mixed schema management across Express and Supabase. |
| **Roster Source of Truth** | Local Express `/api/users` with RBAC clearance levels. | Supabase GoTrue Auth Service. | Desynchronization risk between Supabase Auth and CRM Roster. |
| **Client Data Ownership** | 100% self-hosted / Cloud Run / Z-Drive bridge compatible. | Cloud-hosted or self-hosted Supabase stack required. | Client data split across self-hosted DB and Supabase. |
| **File Storage** | Local Z-Drive bridge / Node Multer on storage volumes. | Supabase Storage (S3 wrapper with RLS). | Double authentication overhead for file tokens. |
| **Realtime Messages** | Server-Sent Events / SSE & WebSocket proxy. | Supabase Realtime (PostgreSQL WAL replication). | Added connection pooling and client token overhead. |
| **Row-Level Security (RLS)** | Express middleware + SQL parameterization by `user_id`. | Native PostgreSQL RLS policies via JWT claims. | Duplicate security checks in Express and RLS. |
| **Windows Desktop App (.exe)** | Bundled SQLite / local Express server (`node server.ts`). | Requires remote internet connectivity to Supabase URL. | Breaks offline-first Windows desktop workflows. |
| **Backup & Migration** | Standard `pg_dump` and `pg_restore` scripts. | Supabase CLI migrations / database dumps. | Dependent on Supabase extension version compatibility. |
| **Vendor Lock-In** | Minimal (Standard Express + pg npm package). | Moderate (PostgREST, GoTrue, Realtime libraries). | Low-Moderate. |

---

## 3. In-Depth Architectural Evaluation

### 3.1 User Identity Mapping & Roster Source of Truth
- **Current Approach:** The `users` table in PostgreSQL defines all GBK brokers, admins, and developers with custom clearance levels (1 to 6) and module permissions (`canAssignClients`, `canViewAllClients`, etc.).
- **Supabase Risk:** Migrating to Supabase Auth creates two distinct user tables (`auth.users` and `public.users`). If synchronization triggers fail or lag during offline syncs, permissions drift occurs.

### 3.2 Offline & Windows Desktop (.exe) Deployment
- **Current Approach:** The application is packaged as an offline-capable Windows `.exe` application via `esbuild` and `tsx`. The local Express bridge caches records when offline and syncs back when connectivity restores.
- **Supabase Risk:** Direct Supabase client JS calls (`supabase.from('clients').select()`) rely on direct HTTPS communication to `*.supabase.co`. In offline desktop environments, Supabase SDK throws network connection exceptions unless custom local proxies are introduced.

### 3.3 Data Ownership & Security (FINTRAC / OSFI Regulations)
- **Current Approach:** Canadian mortgage regulations (OSFI stress test compliance, FINTRAC ID verification) require strict control over client PII (SINs, tax documents, credit scores). All PII is stored encrypted on server volumes with redacted logs.
- **Supabase Risk:** Direct browser-to-Supabase PostgREST queries bypass backend request sanitization unless strict PostgreSQL Row-Level Security (RLS) is configured for every table.

---

## 4. Final Recommendation
1. **Preserve Existing Architecture:** Continue using PostgreSQL with Express API endpoints (`/api/clients`, `/api/integrations`, `/api/webhooks`, `/api/api-keys`).
2. **No Second Database:** Do not initialize or import Supabase SDKs without a formal migration mandate approved by system administrators.
3. **If Adopted Later:** Supabase must replace the entire backend through a planned, single-phase migration rather than running as a hybrid, secondary data store.
