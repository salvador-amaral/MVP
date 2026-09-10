# ✦ PrepApp — Appointment Preparation System (SaaS)

Multi-tenant web application that lets accounting offices send **personalized
document checklists** to clients, collect files securely, track completion and
reduce manual follow-up.

Everything runs in the browser. Final clients **never create an account** — they
access their checklist through a secure **magic link** and complete it from a
mobile phone.

> Interface: **Portuguese** (default) · Tech: Next.js 15 + TypeScript + Tailwind
> + shadcn/ui + Supabase (Postgres/Auth/Storage) + Resend + Inngest · Hosting:
> Vercel.

---

## 1. Core flows

| Actor | Capability |
| --- | --- |
| **Accountant (auth)** | Create templates (items of type file / text / number / checkbox), manage clients, create a request (client + template), send it by email with a unique magic link, follow status (draft → sent → in_progress → completed / expired), accept or reject each submitted item with an optional reason, resend invites and trigger manual reminders, configure automatic reminders & organisation settings. |
| **Final client (public)** | Opens the magic link `/p/[token]`, sees the checklist with live progress, uploads documents / answers simple fields, gets a clear success state when done. No login. |

---

## 2. Multi-tenancy & security

- **Tenant isolation:** every business table has `organization_id`; the app talks
  to Postgres **as the signed-in user**, so **Row Level Security** enforces
  isolation on every query. Staff pages/actions never trust a client-supplied
  `organization_id` — it is always derived from the session.
- **Magic links:** cryptographically random 32-byte tokens, expire after 30 days,
  and only expose the single request they belong to (token-gated service-role
  server code). Draft links are never open.
- **Staff preview:** when an accountant opens a magic link belonging to their own
  organisation, the portal renders read-only — they see exactly what the client
  sees but can never upload or answer on their behalf. Both the page and the
  server actions enforce this. For local testing only, `PORTAL_ALLOW_STAFF_EDITS=true`
  lifts it (see `src/lib/portal-preview.ts`) — never enable it in production.
- **Files:** private Supabase Storage bucket (`client-files`) accessed **only via
  short-lived presigned URLs** (60 s download, direct-to-storage signed upload).
  No long-lived public URLs anywhere.
- **GDPR basics:** org-scoped data, delete capability for organizations/clients,
  data stays in your Supabase region (choose EU), email footer disclaimers.
  Deleting an organization is a two-step, owner-only flow (**Definições → Zona
  de perigo**): typing the organization name queues the request and emails a
  single-use confirmation link to the owner — nothing is destroyed until that
  link is opened, so a stolen session alone cannot delete a tenant. The final
  step also purges the uploaded documents from the private bucket and removes
  the team's auth accounts, which the database cascade alone would not do.
- Migration file: `supabase/migrations/20250101000000_init.sql` (schema + RLS +
  private bucket).

---

## 3. Project structure

```
.
├─ middleware.ts                 # session refresh + route protection
├─ supabase/migrations/          # schema + RLS (+ bucket)
├─ src/
│  ├─ app/
│  │  ├─ (app)/                  # authenticated area (guarded layout + shell)
│  │  │  ├─ dashboard/           # stat cards + recent requests
│  │  │  ├─ clients/…            # list / new / [id] (edit)
│  │  │  ├─ templates/…          # list / new / [id] (editor with dynamic items)
│  │  │  ├─ requests/…           # list (filters) / new / [id] (accept·reject)
│  │  │  └─ settings/            # org + reminders + profile
│  │  ├─ (auth)/                 # login / signup
│  │  ├─ p/[token]/              # PUBLIC client portal (mobile-first)
│  │  ├─ auth/callback/          # email confirmation exchange
│  │  └─ api/
│  │     ├─ files/[fileId]       # staff download (presigned redirect)
│  │     ├─ inngest/             # background jobs endpoint
│  │     └─ cron/reminders       # optional Vercel-cron trigger
│  ├─ components/                # ui/ (shadcn-style) · shared/ · app/ · …
│  │  └─ portal/                 # magic-link UI (progress + uploads)
│  ├─ lib/
│  │  ├─ supabase/{client,server,middleware,admin}.ts
│  │  ├─ emails.ts               # Portuguese email templates (Resend)
│  │  ├─ default-templates.ts    # realistic PT accounting templates
│  │  ├─ validations.ts          # zod schemas
│  │  ├─ security/tokens.ts      # magic token generation/expiry
│  │  └─ portal-url.ts
│  ├─ server/
│  │  ├─ data.ts                 # session/org guards
│  │  ├─ seed.ts                 # default templates bootstrap
│  │  ├─ reminders.ts            # due-reminder scan + expiry
│  │  ├─ portal-data.ts          # token-gated public reads
│  │  └─ actions/                # server actions (auth/clients/templates/
│  │                            #   requests/items/portal/settings)
│  ├─ inngest/{client,reminders}.ts
│  ├─ scripts/seed.ts            # demo org + user + templates
│  └─ types/database.ts
```

---

## 4. Getting started

### Prerequisites
- Node.js 20+, npm, and the [Supabase CLI](https://supabase.com/docs/guides/cli)
  (or a Supabase dashboard).

### 1 · Create the database
1. Create a project at [supabase.com](https://supabase.com) (choose **EU** region
   for EU data residency). Copy the project URL, anon key and service role key.
2. Apply the migration — via CLI:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```
   or paste `supabase/migrations/20250101000000_init.sql` into the Supabase SQL
   editor. It creates the tables, RLS policies, triggers and the private
   `client-files` storage bucket.

3. (Optional but recommended) In **Auth → URL Configuration**, set the site URL.
   Email confirmation is enabled by default (users must confirm before login).

### 2 · Configure the app
```bash
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#      SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, EMAIL_FROM, APP_URL
npm install
npm run dev
```

### 3 · Try it end-to-end
```bash
# Demo org + user + PT templates (uses the service-role key)
npm run db:seed
```
1. Log in at `/login` with the seeded credentials.
2. Dashboard → *Novo pedido* (pick a client & a template), then on the request
   detail press **Enviar por email**.
3. If you have no Resend key yet, the email is **logged to the console** (the
   action still succeeds) — open the `/p/<token>` link directly from the detail
   page (*Copiar ligação*).
4. Upload a document in the portal → refresh the request in the app → the item
   turns *Carregado* → **Aceitar/Rejeitar**.

> Tip: you can also create your own account at `/signup` (auto-loads the
> Portuguese example templates).

---

## 5. Automatic reminders

Reminders are configurable per organisation (**Definições**): remind `N` days
before the due date (e.g. `3,1`) and every `X` days after it (e.g. `2`). The
worker also flips stale magic links to `expired` after 30 days.

Two supported runners (pick one):

**A · Inngest (recommended)** — `src/inngest/reminders.ts`
```bash
npm i -g inngest-cli        # or: npx inngest-cli
npx inngest-cli dev         # local dev — the route is /api/inngest
npx inngest-cli deploy      # production
```
Add `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` to your env and configure the
`/api/inngest` route in your Vercel deployment.

**B · Vercel Cron (no extra service)** — add to `vercel.json`:
```json
{ "crons": [{ "path": "/api/cron/reminders", "schedule": "*/15 * * * *" }] }
```
and set `CRON_SECRET`. Every invocation runs `processDueReminders()`.

---

## 6. Emails (Resend)

Portuguese templates in `src/lib/emails.ts`: the initial checklist invite and
automatic/manual reminders. Configure `RESEND_API_KEY` + `EMAIL_FROM` (a domain
verified in Resend). Without a key the app runs in dev mode and prints the email
that would be sent.

**Reply-To per office:** the `From` address is always the platform's verified
domain, but each organization can set an *Email de resposta* in **Definições →
Organização**. When set, client replies (invites, reminders and rejections) are
delivered to the office inbox; when left empty the platform default is used and
emails say they cannot be answered. A malformed address is ignored rather than
failing the send. Migration: `supabase/migrations/20250101000003_org_reply_to.sql`.

**Delivery status:** the email layer never throws — every send returns
`{ ok: true }` or `{ ok: false, error }`. A failed invite therefore never rolls
back the request (it is already persisted as `sent`): the reason is stored in
`requests.last_email_error`, shown as an amber banner on the request page, and
returned as a **warning** toast ("Pedido criado, mas o email não foi entregue")
with *Reenviar convite* as the retry. Reminder attempts are recorded in
`reminders` with `status = sent | failed`, and the automatic worker counts only
**successful** rows as "already reminded" — so a failed reminder is retried on
the next run instead of being silently skipped forever. All client-supplied text
(client name, office name, custom message) is HTML-escaped before it reaches a
template. Migrations: `20250101000003_org_reply_to.sql`,
`20250101000004_email_delivery_status.sql`.

---

## 7. Notes & roadmap

**Deliberately left out of the MVP** (per spec): e-signatures, WhatsApp, complex
conditional logic, white-labeling, native apps, account creation for clients.

**Next iterations:** request duplication, template variables, English locale
(copy is centralized in `src/lib/constants.ts` + email builders to make this
easy), event-driven reminders via `prep/request.sent`, refunds/plans.

**Roles today:** `owner/admin/member` are stored & enforced at the RLS level and
in the server actions. Owners/admins manage the team (Definições → Equipa →
Convidar), edit organisation settings (rename + reminder rules), and delete
clients/templates. Members use the full day-to-day flow (clients, templates,
requests, accept/reject, reminders) but do not see those management actions.
Deleting the whole organization is reserved for the **owner** alone.
