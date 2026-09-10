import { cookies } from "next/headers";
import { getPortalContext } from "@/server/portal-data";
import { getSessionUser } from "@/server/data";
import { staffEditsAllowed } from "@/lib/portal-preview";
import { PortalApp } from "@/components/portal/portal-app";
import { PortalError } from "@/components/portal/portal-error";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export const dynamic = "force-dynamic";

/** Branded header showing the accounting office's own name. */
function PortalHeader({ orgName }: { orgName?: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-4 pt-6">
      <header className="flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">
          ✦
        </span>
        {orgName ? (
          <span className="truncate font-bold">{orgName}</span>
        ) : null}
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>
    </div>
  );
}

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getPortalContext(token);

  if (result.code !== "ok") {
    return (
      <>
        <PortalHeader />
        <main className="mx-auto max-w-2xl px-4 pb-16">
          <PortalError code={result.code} />
        </main>
      </>
    );
  }

  const { request, items } = result.context;

  // A staff member of this office sees the portal in read-only preview; the
  // real client (no office session) gets the full editing flow.
  // PORTAL_ALLOW_STAFF_EDITS=true lifts the preview for local testing only.
  const hasSessionCookie = (await cookies())
    .getAll()
    .some((c) => c.name.startsWith("sb-"));
  const staffUser = hasSessionCookie ? await getSessionUser() : null;
  const readOnly =
    !staffEditsAllowed() &&
    staffUser?.organization_id === request.organization_id;

  const signature =
    (readOnly ? "staff|" : "client|") +
    items
      .map((i) => `${i.id}:${i.status}:${i.value ?? ""}:${(i.files ?? []).length}`)
      .join("|");

  return (
    <>
      <PortalHeader orgName={request.org_name} />
      <main className="mx-auto max-w-2xl px-4 pb-16">
        <PortalApp
          key={signature}
          token={token}
          clientName={request.client_name}
          orgName={request.org_name}
          dueDate={request.due_date}
          customMessage={request.custom_message}
          completed={request.status === "completed"}
          readOnly={readOnly}
          items={items.map((item) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            type: item.type,
            is_required: item.is_required,
            status: item.status,
            value: item.value,
            rejection_reason: item.rejection_reason,
            files: (item.files ?? []).map((f) => ({
              id: f.id,
              file_name: f.file_name,
              file_size: f.file_size,
              uploaded_at: f.uploaded_at,
            })),
          }))}
        />
      </main>
    </>
  );
}
