import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { embed } from "@/lib/utils";
import type { Organization, StaffUser } from "@/types/database";

/** True for owners and admins (organization managers). */
export function isAdmin(user: Pick<StaffUser, "role">): boolean {
  return user.role === "owner" || user.role === "admin";
}

interface SessionData {
  user: StaffUser;
  organization: Organization | null;
}

/**
 * Single source of truth for the current session, memoized per request.
 * Performs ONE auth round-trip + ONE query (user row joined with its
 * organization), so the layout guard and any page/action guards share it
 * instead of each doing their own getUser() + users + organizations calls.
 */
const loadSession = cache(async (): Promise<SessionData | null> => {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const { data } = await supabase
    .from("users")
    .select("*, organization: organizations(*)")
    .eq("id", authUser.id)
    .maybeSingle();
  if (!data) return null;

  return {
    user: data as StaffUser,
    organization: embed<Organization>(data.organization),
  };
});

/** Staff profile of the current session, or null. */
export async function getSessionUser(): Promise<StaffUser | null> {
  return (await loadSession())?.user ?? null;
}

/** Guards a page/action: redirects to /login when there is no session. */
export async function requireUser(): Promise<StaffUser> {
  const session = await loadSession();
  if (!session) redirect("/login");
  return session.user;
}

/**
 * Organization of a user. When it is the current session (the common case in
 * actions) it is served from the already-loaded session with no extra query.
 */
export async function getCurrentOrganization(
  userId: string
): Promise<Organization | null> {
  const session = await loadSession();
  if (session?.user.id === userId) return session.organization;

  // Fallback for a different user (rare): query directly.
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", data.organization_id)
    .maybeSingle();
  return (org as Organization) ?? null;
}

/** Convenience guard used by authenticated server components. */
export async function requireOrg(): Promise<{
  user: StaffUser;
  organization: Organization;
}> {
  const session = await loadSession();
  if (!session) redirect("/login");
  if (!session.organization) redirect("/login");
  return { user: session.user, organization: session.organization };
}
