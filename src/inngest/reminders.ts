import { inngest } from "@/inngest/client";
import { processDueReminders } from "@/server/reminders";

/**
 * Automatic reminders + link expiry, triggered on a schedule.
 *
 * Runs every 15 minutes: processes due reminders (3/1 days before the due
 * date, every 2 days after) and expires magic links older than 30 days.
 *
 * Local dev:  npx inngest-cli dev
 * Deploy:     npx inngest-cli deploy   (see README)
 */
export const sendReminders = inngest.createFunction(
  { id: "send-reminders", retries: 0 },
  { cron: "*/15 * * * *" },
  async ({ step }) => {
    const result = await step.run("process-due-reminders", async () => {
      return processDueReminders();
    });
    return result;
  }
);

/** Optional: re-check a specific request soon after it is sent. */
export const requestSentHook = inngest.createFunction(
  { id: "request-sent-hook" },
  { event: "prep/request.sent" },
  async ({ step, event }) => {
    await step.sleep("wait-1h", "1h");
    await step.run("early-reminder-scan", async () => processDueReminders());
    return { requestId: event.data.requestId };
  }
);
