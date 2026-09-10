import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { sendReminders, requestSentHook } from "@/inngest/reminders";

// https://www.inngest.com/docs/sdk/serve
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [sendReminders, requestSentHook],
});
