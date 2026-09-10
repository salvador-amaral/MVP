-- ============================================================================
-- Restrict organization management & destructive actions to owner/admin.
-- Applies on top of 20250101000000_init.sql. Run in the Supabase SQL editor.
-- ============================================================================

-- organizations: only owners/admins may update the org row.
drop policy if exists "org update own" on public.organizations;
create policy "org update owner_admin" on public.organizations
  for update
  using (id = public.current_org_id() and public.is_owner_or_admin());

-- clients: everyone in the org can select/insert/update; only managers delete.
drop policy if exists "clients all org" on public.clients;
create policy "clients select org" on public.clients
  for select
  using (organization_id = public.current_org_id());
create policy "clients insert org" on public.clients
  for insert
  with check (organization_id = public.current_org_id());
create policy "clients update org" on public.clients
  for update
  using (organization_id = public.current_org_id())
  with check (organization_id = public.current_org_id());
create policy "clients delete owner_admin" on public.clients
  for delete
  using (
    organization_id = public.current_org_id()
    and public.is_owner_or_admin()
  );
