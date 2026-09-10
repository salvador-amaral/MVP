-- ============================================================================
-- Email delivery status.
--
-- Until now a failed send only produced a console.error: the office saw an
-- error (or nothing) and there was no way to tell whether a client had been
-- emailed. These columns make delivery observable and retryable.
--
--   requests.invite_sent_at    — last time the invite actually reached Resend
--   requests.last_email_error  — most recent delivery failure for this request
--
--   reminders.status           — did this reminder attempt succeed?
--   reminders.error            — Resend's message when it did not
--
-- Existing reminder rows default to 'sent', which preserves the worker's
-- "already reminded" semantics: the worker only counts successful rows when
-- deciding whether a rule has already fired, so a failed reminder is retried
-- on the next run instead of being silently skipped forever.
-- ============================================================================

alter table public.requests
  add column if not exists invite_sent_at timestamptz,
  add column if not exists last_email_error text not null default '';

alter table public.reminders
  add column if not exists status text not null default 'sent',
  add column if not exists error text not null default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'reminders_status_check'
  ) then
    alter table public.reminders
      add constraint reminders_status_check check (status in ('sent', 'failed'));
  end if;
end $$;

comment on column public.requests.last_email_error is
  'Most recent email delivery failure for this request. Empty when the last send succeeded.';
comment on column public.reminders.status is
  'sent | failed. Only "sent" rows count as a delivered reminder when the worker dedupes rules.';