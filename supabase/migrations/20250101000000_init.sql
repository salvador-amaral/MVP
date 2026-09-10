-- ============================================================================
-- Appointment Preparation System — initial schema
-- Multi-tenant: every business-data table is scoped by organization_id.
-- RLS is enabled on every table; the app talks to Postgres as the signed-in
-- staff user (anon-key client) so RLS enforces tenant isolation.
-- ============================================================================

-- make sure we can generate uuids
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Multi-tenancy helpers (used by RLS policies)
-- ---------------------------------------------------------------------------

-- Organization id of the currently authenticated user, or null.
create or replace function public.current_org_id()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  select u.organization_id into v_org
  from public.users u
  where u.id = auth.uid();
  return v_org;
end;
$$;

-- Role of the current user within their organization, or null.
create or replace function public.current_user_role()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select u.role into v_role
  from public.users u
  where u.id = auth.uid();
  return v_role;
end;
$$;

create or replace function public.is_owner_or_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return public.current_user_role() in ('owner', 'admin');
end;
$$;

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  reminder_settings jsonb not null default '{"enabled":false,"daysBefore":[3,1],"everyDaysAfter":2}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- users (staff members — mirrors auth.users)
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index users_organization_id_idx on public.users(organization_id);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- clients
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_organization_id_idx on public.clients(organization_id);

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- templates + template_items
-- ---------------------------------------------------------------------------
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index templates_organization_id_idx on public.templates(organization_id);

create trigger templates_set_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();

create table public.template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.templates(id) on delete cascade,
  title text not null,
  description text not null default '',
  type text not null default 'file' check (type in ('file', 'text', 'number', 'checkbox')),
  is_required boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index template_items_template_id_idx on public.template_items(template_id);

-- ---------------------------------------------------------------------------
-- requests (a request sent to a client for a template)
-- ---------------------------------------------------------------------------
create table public.requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  template_id uuid not null references public.templates(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'sent', 'in_progress', 'completed', 'expired')),
  due_date date,
  magic_token text not null unique,
  custom_message text not null default '',
  expires_at timestamptz,
  reminders_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index requests_organization_id_idx on public.requests(organization_id);
create index requests_client_id_idx on public.requests(client_id);
create index requests_status_idx on public.requests(status);
create index requests_due_date_idx on public.requests(due_date);

create trigger requests_set_updated_at
  before update on public.requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- request_items (snapshot of template items for a given request)
-- ---------------------------------------------------------------------------
create table public.request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  template_item_id uuid references public.template_items(id) on delete set null,
  title text not null default '',
  description text not null default '',
  type text not null default 'file' check (type in ('file', 'text', 'number', 'checkbox')),
  is_required boolean not null default true,
  status text not null default 'pending' check (status in ('pending', 'uploaded', 'accepted', 'rejected')),
  value text,                      -- text/number/checkbox answer
  rejection_reason text,
  position integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index request_items_request_id_idx on public.request_items(request_id);
create index request_items_template_item_id_idx on public.request_items(template_item_id);

create trigger request_items_set_updated_at
  before update on public.request_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- files (one or more files per uploaded request_item)
-- ---------------------------------------------------------------------------
create table public.files (
  id uuid primary key default gen_random_uuid(),
  request_item_id uuid not null references public.request_items(id) on delete cascade,
  file_name text not null,
  file_size bigint not null default 0,
  mime_type text not null default 'application/octet-stream',
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);

create index files_request_item_id_idx on public.files(request_item_id);

-- ---------------------------------------------------------------------------
-- reminders (audit of automatic + manual reminders)
-- ---------------------------------------------------------------------------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  type text not null check (type in ('automatic', 'manual')),
  channel text not null default 'email' check (channel = 'email'),
  sent_at timestamptz not null default now(),
  note text not null default ''
);

create index reminders_request_id_idx on public.reminders(request_id);

-- ---------------------------------------------------------------------------
-- Request progress recomputation
-- ---------------------------------------------------------------------------
-- A request is "completed" when every item is answered (uploaded/accepted).
-- It becomes "in_progress" as soon as at least one item is answered.
create or replace function public.refresh_request_status(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_done int;
begin
  select count(*), count(*) filter (where status in ('uploaded', 'accepted'))
    into v_total, v_done
  from public.request_items
  where request_id = p_request_id;

  if v_total > 0 and v_done >= v_total then
    update public.requests
      set status = 'completed', completed_at = coalesce(completed_at, now())
    where id = p_request_id;
  elsif v_done > 0 then
    update public.requests
      set status = 'in_progress', completed_at = null
    where id = p_request_id and status <> 'expired';
  else
    update public.requests
      set status = case when status = 'draft' then 'draft' else 'sent' end,
          completed_at = null
    where id = p_request_id;
  end if;
end;
$$;

create or replace function public.request_items_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_request_status(
    coalesce(new.request_id, old.request_id)
  );
  return null;
end;
$$;

create trigger request_items_after_change
  after insert or update or delete on public.request_items
  for each row execute function public.request_items_after_change();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.organizations enable row level security;
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.templates enable row level security;
alter table public.template_items enable row level security;
alter table public.requests enable row level security;
alter table public.request_items enable row level security;
alter table public.files enable row level security;
alter table public.reminders enable row level security;

-- organizations -------------------------------------------------------------
create policy "org select own" on public.organizations
  for select using (id = public.current_org_id());
create policy "org update own" on public.organizations
  for update using (id = public.current_org_id());

-- users ---------------------------------------------------------------------
create policy "users select own" on public.users
  for select using (id = auth.uid());
create policy "users select org members" on public.users
  for select using (organization_id = public.current_org_id());
create policy "users update own" on public.users
  for update using (id = auth.uid());

-- clients -------------------------------------------------------------------
create policy "clients all org" on public.clients
  for all using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

-- templates -----------------------------------------------------------------
create policy "templates select org" on public.templates
  for select using (organization_id = public.current_org_id());
create policy "templates insert org" on public.templates
  for insert with check (organization_id = public.current_org_id());
create policy "templates update org" on public.templates
  for update using (organization_id = public.current_org_id());
create policy "templates delete owner_admin" on public.templates
  for delete using (
    organization_id = public.current_org_id()
    and public.is_owner_or_admin()
  );

-- template_items (belongs to a template) ------------------------------------
create policy "template_items select org" on public.template_items
  for select using (
    template_id in (select id from public.templates where organization_id = public.current_org_id())
  );
create policy "template_items insert org" on public.template_items
  for insert with check (
    template_id in (select id from public.templates where organization_id = public.current_org_id())
  );
create policy "template_items update org" on public.template_items
  for update using (
    template_id in (select id from public.templates where organization_id = public.current_org_id())
  );
create policy "template_items delete org" on public.template_items
  for delete using (
    template_id in (select id from public.templates where organization_id = public.current_org_id())
  );

-- requests ------------------------------------------------------------------
create policy "requests all org" on public.requests
  for all using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());

-- request_items (via their request) -----------------------------------------
create policy "request_items all org" on public.request_items
  for all using (
    request_id in (select id from public.requests where organization_id = public.current_org_id())
  ) with check (
    request_id in (select id from public.requests where organization_id = public.current_org_id())
  );

-- files (via request_item -> request) ---------------------------------------
create policy "files all org" on public.files
  for all using (
    request_item_id in (
      select ri.id from public.request_items ri
      join public.requests r on r.id = ri.request_id
      where r.organization_id = public.current_org_id()
    )
  ) with check (
    request_item_id in (
      select ri.id from public.request_items ri
      join public.requests r on r.id = ri.request_id
      where r.organization_id = public.current_org_id()
    )
  );

-- reminders -----------------------------------------------------------------
create policy "reminders all org" on public.reminders
  for all using (
    request_id in (select id from public.requests where organization_id = public.current_org_id())
  ) with check (
    request_id in (select id from public.requests where organization_id = public.current_org_id())
  );

-- ============================================================================
-- Private storage bucket for client files (signed URLs only)
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-files',
  'client-files',
  false,
  26214400, -- 25 MB
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
on conflict (id) do nothing;
