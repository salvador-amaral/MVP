import { NextRequest, NextResponse } from "next/server";
import { processDueReminders } from "@/server/reminders";

/**
 * Alternative trigger for the automatic reminder worker when you do not want
 * to run Inngest (e.g. Vercel Cron). Protect with a secret:
 *   GET /api/cron/reminders  with header `x-cron-secret`.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    // Accept our own header or Vercel Cron's `Authorization: Bearer <secret>`.
    const provided = request.headers.get("x-cron-secret");
    const auth = request.headers.get("authorization");
    const authorized = provided === secret || auth === `Bearer ${secret}`;
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await processDueReminders();
    return NextResponse.json(result);
  } catch (error) {
    console.error("reminder scan failed", error);
    return NextResponse.json({ error: "Reminder scan failed" }, { status: 500 });
  }
}
