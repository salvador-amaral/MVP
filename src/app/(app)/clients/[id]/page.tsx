import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Mail, Phone, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser, isAdmin } from "@/server/data";
import { embed } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { RequestStatusBadge } from "@/components/shared/status-badges";
import { ClientForm } from "@/components/clients/client-form";
import {
  deleteClientAction,
  updateClientAction,
} from "@/server/actions/clients";
import type { RequestStatus } from "@/types/database";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!client) notFound();

  const { data: requests } = await supabase
    .from("requests")
    .select("id, status, due_date, created_at, template: templates(name)")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={client.name}
        description={`Cliente desde ${format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}`}
        actions={
          <>
            {isAdmin(user) ? (
              <ConfirmButton
                action={deleteClientAction.bind(null, client.id)}
                confirmText={`Eliminar o cliente "${client.name}"? Esta ação não pode ser anulada.`}
                variant="ghost"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 /> Eliminar
              </ConfirmButton>
            ) : null}
            <Button asChild>
              <Link href={`/requests/new?clientId=${client.id}`}>
                <Plus /> Novo pedido
              </Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a
              href={`mailto:${client.email}`}
              className="text-primary hover:underline"
            >
              {client.email}
            </a>
          </div>
          {client.phone ? (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${client.phone}`}>{client.phone}</a>
            </div>
          ) : null}
          {client.notes ? (
            <p className="text-sm text-muted-foreground sm:col-span-2">
              {client.notes}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pedidos de documentos</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {!requests || requests.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Este cliente ainda não tem pedidos.
            </p>
          ) : (
            <ul className="divide-y">
              {requests.map((r) => {
                const templateName =
                  embed<{ name?: string }>(r.template)?.name ?? "Sem modelo";
                return (
                  <li key={r.id}>
                    <Link
                      href={`/requests/${r.id}`}
                      className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <div className="font-medium">{templateName}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.due_date
                            ? `Prazo: ${format(new Date(r.due_date + "T00:00:00"), "dd/MM/yyyy")}`
                            : "Sem prazo"}
                        </div>
                      </div>
                      <RequestStatusBadge status={r.status as RequestStatus} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Editar cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm
            action={updateClientAction.bind(null, client.id)}
            defaultValues={{
              name: client.name,
              email: client.email,
              phone: client.phone,
              notes: client.notes,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
