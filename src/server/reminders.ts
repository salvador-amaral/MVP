import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendReminderEmail } from "@/lib/emails";
import { isExpired } from "@/lib/security/tokens";
import type { Organization, ReminderSettings, Request } from "@/types/database";

interface ReminderRow {
  id: string;
  request_id: string;
  note: string;
}

/**
 * Scans every organization for requests that need an automatic reminder and
 * expires requests whose magic link has run out of time.
 *
 * Rule model (per organization.reminder_settings):
 *  - daysBefore:   e.g. [3, 1] → remind 3 days and 1 day before the due date
 *  - everyDaysAfter: e.g. 2    → remind every 2 days after the due date passed
 *
 * Each rule is tracked in the `reminders` table (type=automatic, note=ruleKey)
 * so nothing is sent twice.
 */
export async function processDueReminders(): Promise<{
  remindersSent: number;
  requestsExpired: number;
}> {
  const admin = createAdminClient();
  let remindersSent = 0;
  let requestsExpired = 0;

  // Organizations → rules
  const { data: orgs } = await admin
    .from("organizations")
    .select("id, name, reminder_settings, reply_to_email");
  const orgById = new Map<string, Organization & { reminder_settings: ReminderSettings }>();
  for (const o of orgs ?? []) orgById.set(o.id, o as Organization & { reminder_settings: ReminderSettings });

  // Open requests (sent / in progress) with reminders enabled
  const { data: requests } = await admin
    .from("requests")
    .select("*")
    .in("status", ["sent", "in_progress"])
    .eq("reminders_enabled", true);
  if (!requests || requests.length === 0) {
    return { remindersSent, requestsExpired };
  }

  const requestRows = requests as Request[];
  const clientIds = [...new Set(requestRows.map((r) => r.client_id))];
  const { data: clients } = await admin
    .from("clients")
    .select("id, name, email")
    .in("id", clientIds);
  const clientById = new Map((clients ?? []).map((c) => [c.id, c]));

  // Existing automatic reminders per request → avoid duplicates
  const requestIds = requestRows.map((r) => r.id);
  // Only successful rows count as "already reminded", so a delivery that
  // failed is retried on the next run instead of being skipped forever.
  const { data: sentRows, error: sentError } = await admin
    .from("reminders")
    .select("id, request_id, note")
    .eq("type", "automatic")
    .eq("status", "sent")
    .in("request_id", requestIds);
  if (sentError) {
    // Never guess: an unreadable dedupe ledger could mean re-emailing clients.
    console.error("reminder dedupe query failed", sentError);
    return { remindersSent, requestsExpired };
  }
  const sentByRequest = new Map<string, Set<string>>();
  for (const row of sentRows ?? []) {
    const s = sentByRequest.get((row as ReminderRow).request_id) ?? new Set();
    s.add((row as ReminderRow).note);
    sentByRequest.set((row as ReminderRow).request_id, s);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const request of requestRows) {
    // 1) Expire stale links
    if (isExpired(request.expires_at) && request.status !== "expired") {
      await admin.from("requests").update({ status: "expired" }).eq("id", request.id);
      requestsExpired += 1;
      continue;
    }
    if (request.status === "expired") continue;

    const org = orgById.get(request.organization_id);
    const settings = org?.reminder_settings;
    if (!org || !settings?.enabled) continue;

    const client = clientById.get(request.client_id);
    if (!client) continue;

    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const magicUrl = `${appUrl}/p/${request.magic_token}`;
    const sent = sentByRequest.get(request.id) ?? new Set();

    const rules: string[] = [];
    let reason = "";

    if (request.due_date) {
      const due = parseDate(request.due_date);
      const daysTo = Math.round((due.getTime() - today.getTime()) / 86400000);
      const overdueDays = Math.round((today.getTime() - due.getTime()) / 86400000);

      if (daysTo > 0 && (settings.daysBefore ?? []).includes(daysTo)) {
        rules.push(`before:${daysTo}`);
        reason = `Faltam ${daysTo} dia${daysTo > 1 ? "s" : ""} para a data limite (${formatDate(request.due_date)}).`;
      } else if (overdueDays >= 1) {
        const every = settings.everyDaysAfter ?? 2;
        if (overdueDays % every === 0) {
          rules.push(`after:${overdueDays}`);
          reason =
            overdueDays === 1
              ? "A data limite foi ultrapassada ontem."
              : `A data limite foi ultrapassada há ${overdueDays} dias.`;
        }
      }
    }

    for (const rule of rules) {
      if (sent.has(rule)) continue; // already reminded for this rule
      const delivery = await sendReminderEmail({
        to: client.email,
        orgName: org.name,
        clientName: client.name,
        magicUrl,
        reason,
        replyTo: org.reply_to_email,
      });
      await admin.from("reminders").insert({
        request_id: request.id,
        type: "automatic",
        channel: "email",
        note: rule,
        status: delivery.ok ? "sent" : "failed",
        error: delivery.ok ? "" : delivery.error,
      });
      if (delivery.ok) remindersSent += 1;
    }
  }

  return { remindersSent, requestsExpired };
}

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
