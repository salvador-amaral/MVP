import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowRight,
  CircleDashed,
  LayoutList,
  Plus,
  Send,
  UserPlus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/data";
import { isExpired } from "@/lib/security/tokens";
import { embed } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RequestStatusBadge } from "@/components/shared/status-badges";
import { cn } from "@/lib/utils";
import type { RequestStatus } from "@/types/database";

export default async function DashboardPage() {
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

  const normalized = rows.map((r) =>
    ["sent", "in_progress"].includes(r.status) && isExpired(r.expires_at)
      ? { ...r, status: "expired" as RequestStatus }
      : r
  );

  const count = (s: RequestStatus) => normalized.filter((r) => r.status === s).length;
  const open = normalized.filter((r) =>
    ["sent", "in_progress"].includes(r.status)
  ).length;
  const recent = normalized.slice(0, 6);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel"
        description="Visão geral dos pedidos de documentação."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/clients/new">
                <UserPlus /> Novo cliente
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/templates/new">
                <LayoutList /> Novo modelo
              </Link>
            </Button>
            <Button asChild>
              <Link href="/requests/new">
                <Plus /> Novo pedido
              </Link>
            </Button>
          </>
        }
      />

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <StatCard href="/requests" label="Todos" value={normalized.length} tone="slate" />
        <StatCard href="/requests?status=open" label="A decorrer" value={open} tone="blue" />
        <StatCard href="/requests?status=completed" label="Concluídos" value={count("completed")} tone="green" />
        <StatCard href="/requests?status=draft" label="Rascunhos" value={count("draft")} tone="gray" />
        <StatCard href="/requests?status=expired" label="Expirados" value={count("expired")} tone="red" />
        <StatCard href="/requests?status=in_progress" label="Em progresso" value={count("in_progress")} tone="amber" />
      </div>

      {/* recent requests */}
      <Card>
        <div className="flex items-center justify-between p-5 pb-2">
          <h2 className="font-semibold">Pedidos recentes</h2>
          <Link
            href="/requests"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Ver todos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <CircleDashed className="h-10 w-10 text-muted-foreground/30" />
            <div>
              <p className="font-medium">Sem pedidos ainda</p>
              <p className="text-sm text-muted-foreground">
                Crie um pedido para um cliente — o envio é automático por email.
              </p>
            </div>
            <Button asChild>
              <Link href="/requests/new">
                <Plus /> Criar pedido
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y">
            {recent.map((request) => (
              <li key={request.id}>
                <Link
                  href={`/requests/${request.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">
                        {request.client?.name ?? "Cliente removido"}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate pl-6 text-xs text-muted-foreground">
                      {request.template?.name ?? "Modelo removido"}
                      {request.due_date
                        ? ` · prazo ${format(new Date(request.due_date + "T00:00:00"), "dd/MM/yyyy")}`
                        : ""}
                    </div>
                  </div>
                  <RequestStatusBadge status={request.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

const TONES: Record<string, string> = {
  slate: "text-slate-700",
  blue: "text-blue-700",
  green: "text-emerald-700",
  red: "text-red-700",
  amber: "text-amber-700",
  gray: "text-slate-500",
};

function StatCard({
  href,
  label,
  value,
  tone,
}: {
  href: string;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <Link href={href}>
      <Card
        className={cn(
          "h-full p-4 transition-shadow hover:shadow-md",
          TONES[tone]
        )}
      >
        <div className="text-3xl font-bold">{value}</div>
        <div className="mt-1 text-sm text-muted-foreground">{label}</div>
      </Card>
    </Link>
  );
}
