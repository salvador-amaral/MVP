-- ============================================================================
-- Per-organization Reply-To address for client-facing emails.
--
-- The "From" address always stays the platform's verified domain (SPF/DKIM are
-- not affected by this). Replies from the final client are simply routed to the
-- office inbox instead of bouncing off a no-reply address.
--
-- Empty string means "use the platform default" (no Reply-To header), which is
-- the behaviour every existing organization keeps after this migration.
-- ============================================================================

alter table public.organizations
  add column if not exists reply_to_email text not null default '';

comment on column public.organizations.reply_to_email is
  'Optional Reply-To address used on client emails (invites, reminders, rejections). Empty = platform default.';
