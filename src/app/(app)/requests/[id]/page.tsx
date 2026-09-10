import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Hash,
  Mail,
  MessageSquare,
  Send,
  SquareCheck,
  Trash2,
  Type,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser, isAdmin } from "@/server/data";
import { isExpired } from "@/lib/security/tokens";
import { requestPortalUrl } from "@/lib/portal-url";
import { formatBytes } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActionButton } from "@/components/shared/action-button";
import { CopyButton } from "@/components/shared/copy-button";
import { ConfirmButton } from "@/components/shared/confirm-button";
import { ReviewPanel } from "@/components/requests/review-panel";
import {
  RequestItemStatusBadge,
  RequestStatusBadge,
} from "@/components/shared/status-badges";
import {
  deleteRequestAction,
  resendInviteAction,
  sendManualReminderAction,
  sendRequestAction,
} from "@/server/actions/requests";
import { cn } from "@/lib/utils";
import type { RequestItemStatus, RequestStatus, TemplateItemType } from "@/types/database";

interface ItemFile {
  id: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
}
interface ItemRow {
  id: string;
  title: string;
  description: string;
  type: TemplateItemType;
  is_required: boolean;
  status: RequestItemStatus;
  value: string | null;
  rejection_reason: string | null;
  files: ItemFile[] | null;
}

const TYPE_ICONS: Record<TemplateItemType, React.ComponentType<{ className?: string }>> = {
  file: FileText,
  text: Type,
  number: Hash,
  checkbox: SquareCheck,
};

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const supabase = await createClient();
  const { data: request } = await supabase
    .from("requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!request) notFound();

  // Items, reminders and the joined rows are independent — fetch in parallel.
  const [clientRes, templateRes, itemsRes, remindersRes] = await Promise.all([
    supabase.from("clients").select("name, email").eq("id", request.client_id).maybeSingle(),
    supabase.from("templates").select("name").eq("id", request.template_id).maybeSingle(),
    supabase
      .from("request_items")
      .select("*, files: files(id, file_name, file_size, uploaded_at)")
      .eq("request_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("reminders")
      .select("type, sent_at")
      .eq("request_id", id)
      .order("sent_at", { ascending: false }),
  ]);
  const { data: items } = itemsRes;
  const { data: reminders } = remindersRes;

  const itemRows = (items ?? []) as ItemRow[];
  const answered = itemRows.filter((i) =>
    ["uploaded", "accepted"].includes(i.status)
  ).length;
  const progress =
    itemRows.length > 0 ? Math.round((answered / itemRows.length) * 100) : 0;

  const expired =
    request.status === "expired" ||
    ((request.status === "sent" || request.status === "in_progress") &&
      isExpired(request.expires_at));
  const displayStatus: RequestStatus = expired
    ? "expired"
    : (request.status as RequestStatus);

  const portalUrl = requestPortalUrl(request.magic_token);
  const clientName = clientRes.data?.name ?? "Cliente removido";
  const templateName = templateRes.data?.name ?? "Modelo removido";

  const canSend = request.status === "draft";
  const isOpen = ["sent", "in_progress"].includes(request.status) && !expired;
  const isDone = request.status === "completed";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/requests"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Pedidos
      </Link>

      <PageHeader
        title={clientName}
        description={
          <>
            {templateName}
            {request.due_date
              ? ` · prazo ${format(new Date(request.due_date + "T00:00:00"), "dd/MM/yyyy")}`
              : ""}
          </>
        }
        actions={<RequestStatusBadge status={displayStatus} />}
      />

      {/* status / actions card */}
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Itens" value={itemRows.length} />
            <Stat label="Respondidos" value={`${answered}/${itemRows.length}`} />
            <Stat label="Progresso" value={`${progress}%`} />
          </div>

          {request.custom_message ? (
            <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm">
              <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="italic text-muted-foreground">
                “{request.custom_message}”
              </span>
            </div>
          ) : null}

          {canSend ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-blue-100 bg-blue-50/60 p-3">
              <p className="text-sm text-blue-800">
                <strong>Rascunho.</strong> Ao enviar, geramos a ligação segura e
                enviamos o convite por email a {clientRes.data?.email}.
              </p>
              <ActionButton
                action={sendRequestAction.bind(null, id)}
                successMessage="Pedido enviado por email ao cliente"
                pendingText="A enviar…"
              >
                <Send /> Enviar por email
              </ActionButton>
            </div>
          ) : null}

          {isOpen || isDone ? (
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton value={portalUrl} label="Copiar ligação" />
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Abrir portal →
              </a>
              <div className="ml-auto flex flex-wrap gap-2">
                <ActionButton
                  variant="outline"
                  action={resendInviteAction.bind(null, id)}
                  successMessage="Convite reenviado"
                >
                  <Mail /> Reenviar convite
                </ActionButton>
                {!isDone ? (
                  <ActionButton
                    variant="outline"
                    action={sendManualReminderAction.bind(null, id)}
                    successMessage="Lembrete enviado ao cliente"
                  >
                    <Bell /> Enviar lembrete
                  </ActionButton>
                ) : null}
              </div>
            </div>
          ) : null}

          {expired ? (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Esta ligação expirou. Crie um novo pedido ou contacte o cliente.
            </p>
          ) : null}

          <div className="flex justify-end border-t pt-3">
            {!(displayStatus === "completed" && !isAdmin(user)) ? (
              <ConfirmButton
                action={deleteRequestAction.bind(null, id)}
                confirmText="Eliminar este pedido?"
                variant="ghost"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 /> Eliminar pedido
              </ConfirmButton>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* items */}
      {canSend ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="font-medium">A lista ainda não foi gerada</p>
                <p className="text-sm text-muted-foreground">
                  Quando enviar o pedido, os itens do modelo são copiados para
                  este pedido e o cliente recebe o acesso.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Checklist do cliente</h2>
          {itemRows.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                O modelo deste pedido não tinha itens.
              </CardContent>
            </Card>
          ) : (
            itemRows.map((item) => <ItemCard key={item.id} item={item} />)
          )}
        </div>
      )}

      {/* reminders history */}
      {reminders && reminders.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de emails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {reminders.map((reminder, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  {reminder.type === "automatic" ? "Lembrete automático" : "Lembrete manual"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(reminder.sent_at), "dd/MM/yyyy HH:mm")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-muted/40 p-3 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ItemCard({ item }: { item: ItemRow }) {
  const Icon = TYPE_ICONS[item.type] ?? FileText;
  const canReview = ["uploaded", "rejected"].includes(item.status);

  return (
    <Card className={cn(canReview && "ring-1 ring-amber-200")}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <div className="flex flex-wrap items-center gap-2 font-medium">
                {item.title}
                {!item.is_required ? (
                  <Badge variant="outline" className="text-[10px]">
                    opcional
                  </Badge>
                ) : null}
              </div>
              {item.description ? (
                <p className="text-xs text-muted-foreground">{item.description}</p>
              ) : null}
            </div>
          </div>
          <RequestItemStatusBadge status={item.status} />
        </div>

        {item.rejection_reason ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <strong>Motivo da rejeição:</strong> {item.rejection_reason}
          </p>
        ) : null}

        {/* value for simple answers */}
        {item.type !== "file" && item.value != null ? (
          <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
            <span className="text-xs text-muted-foreground">Resposta: </span>
            {item.type === "checkbox"
              ? item.value === "true"
                ? "Sim ✓"
                : "Não"
              : item.value}
          </div>
        ) : null}

        {/* files */}
        {item.files && item.files.length > 0 ? (
          <ul className="space-y-1">
            {item.files.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-2 rounded-md border px-3 py-2"
              >
                <a
                  href={`/api/files/${file.id}`}
                  title="Abrir documento"
                  className="flex min-w-0 flex-1 items-center gap-2 text-sm transition-colors hover:text-primary"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{file.file_name}</span>
                  <span className="ml-auto shrink-0 pl-2 text-xs text-muted-foreground">
                    {formatBytes(file.file_size)}
                  </span>
                </a>
                <div className="flex shrink-0 items-center gap-1">
                  <a
                    href={`/api/files/${file.id}`}
                    title="Ver"
                    aria-label="Ver documento"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                  <a
                    href={`/api/files/${file.id}?download=1`}
                    title="Descarregar"
                    aria-label="Descarregar documento"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        {canReview ? (
          <div className="flex items-center justify-between gap-2 border-t pt-3">
            <span className="text-xs text-muted-foreground">
              {item.status === "rejected"
                ? "O cliente pode reenviar o documento."
                : "Rever o que o cliente enviou."}
            </span>
            <ReviewPanel requestItemId={item.id} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
