import Link from "next/link";
import { format } from "date-fns";
import { ChevronRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/data";
import { isExpired } from "@/lib/security/tokens";
import { REQUEST_STATUS_LABELS } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RequestStatusBadge } from "@/components/shared/status-badges";
import { cn, embed } from "@/lib/utils";
import type { RequestStatus } from "@/types/database";

const STATUSES: RequestStatus[] = [
  "draft",
  "sent",
  "in_progress",
  "completed",
  "expired",
];

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const raw = status ?? "";
  const activeStatus = (STATUSES as string[]).includes(raw)
    ? (raw as RequestStatus)
    : null;
  const openFilter = raw === "open";

  await requireUser();
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("requests")
    .select(
      "id, status, due_date, expires_at, updated_at, client: clients(name), template: templates(name)"
    )
    .order("updated_at", { ascending: false });

  const rows = (requests ?? []).map((r) => ({
    ...r,
    client: embed<{ name: string }>(r.client),
    template: embed<{ name: string }>(r.template),
  }));

  // treat sent/in_progress requests whose link expired as "expired" for display
  const normalized = rows.map((r) => {
    if (
      (r.status === "sent" || r.status === "in_progress") &&
      isExpired(r.expires_at)
    ) {
      return { ...r, status: "expired" as RequestStatus };
    }
    return r;
  });

  const counts = Object.fromEntries(
    STATUSES.map((s) => [s, normalized.filter((r) => r.status === s).length])
  ) as Record<RequestStatus, number>;

  const filtered = activeStatus
    ? normalized.filter((r) => r.status === activeStatus)
    : openFilter
      ? normalized.filter((r) => r.status === "sent" || r.status === "in_progress")
      : normalized;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        description="Acompanhe o estado de cada pedido de documentação."
        actions={
          <Button asChild>
            <Link href="/requests/new">
              <Plus /> Novo pedido
            </Link>
          </Button>
        }
      />

      {/* status filter chips */}
      <div className="flex flex-wrap gap-2">
        <FilterChip href="/requests" active={!activeStatus && !openFilter} label="Todos" count={normalized.length} />
        <FilterChip
          href="/requests?status=open"
          active={openFilter}
          label="A decorrer"
          count={counts.sent + counts.in_progress}
          dotClass="bg-blue-500"
        />
        {STATUSES.map((s) => (
          <FilterChip
            key={s}
            href={`/requests?status=${s}`}
            active={activeStatus === s}
            label={REQUEST_STATUS_LABELS[s]}
            count={counts[s]}
            dotClass={DOT_CLASSES[s]}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={activeStatus || openFilter ? "Sem pedidos neste estado" : "Ainda não há pedidos"}
          description={
            activeStatus || openFilter
              ? "Quando houver pedidos neste estado, aparecem aqui."
              : "Crie um pedido a partir de um cliente e de um modelo para começar."
          }
          action={
            !activeStatus && !openFilter ? (
              <Button asChild>
                <Link href="/requests/new">
                  <Plus /> Criar o primeiro pedido
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <ul className="divide-y">
            {filtered.map((request) => (
              <li key={request.id}>
                <Link
                  href={`/requests/${request.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {request.client?.name ?? "Cliente removido"}
                      </span>
                      {request.template ? (
                        <span className="truncate rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {request.template.name}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {request.due_date
                        ? `Prazo: ${format(new Date(request.due_date + "T00:00:00"), "dd/MM/yyyy")}`
                        : "Sem prazo"}
                      {" · "}
                      atualizado em{" "}
                      {format(new Date(request.updated_at), "dd/MM/yyyy HH:mm")}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <RequestStatusBadge status={request.status} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

const DOT_CLASSES: Record<RequestStatus, string> = {
  draft: "bg-slate-400",
  sent: "bg-blue-500",
  in_progress: "bg-amber-500",
  completed: "bg-emerald-500",
  expired: "bg-red-500",
};

function FilterChip({
  href,
  active,
  label,
  count,
  dotClass,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  dotClass?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground hover:bg-accent"
      )}
    >
      {dotClass ? <span className={cn("h-2 w-2 rounded-full", dotClass)} /> : null}
      {label}
      <span className="text-xs opacity-70">{count}</span>
    </Link>
  );
}
