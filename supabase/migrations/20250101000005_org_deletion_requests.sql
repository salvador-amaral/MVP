-- ============================================================================
-- Two-step organization deletion.
--
-- Deleting an organization is irreversible, so the owner's typed-name
-- confirmation is now only the *first* step: it queues a request and emails a
-- single-use link to the owner's address. Nothing is destroyed until that link
-- is opened, which means a hijacked session alone cannot delete a tenant —
-- the attacker would also need access to the owner's inbox.
--
-- The row is short-lived: one live request per organization (a new request
-- replaces the previous one) and the token expires after an hour.
-- ============================================================================

create table public.organization_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index organization_deletion_requests_org_idx
  on public.organization_deletion_requests(organization_id);

-- Deliberately service-role only: RLS enabled with NO policies means the anon
-- and authenticated roles can neither read nor write. The request and confirm
-- flows both run on the service-role client, and the emailed token must not be
-- reachable through PostgREST.
alter table public.organization_deletion_requests enable row level security;

comment on column public.organization_deletion_requests.consumed_at is
  'Set when the link is used. A consumed token can never delete twice.';
