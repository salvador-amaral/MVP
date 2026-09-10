"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  CloudUpload,
  FileText,
  Hash,
  Lock,
  MessageSquare,
  SquareCheck,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmUploadAction,
  createUploadUrlAction,
  submitAnswerAction,
} from "@/server/actions/portal";
import { cn, formatBytes } from "@/lib/utils";
import { initialActionState } from "@/lib/action-state";
import type { RequestItemStatus, TemplateItemType } from "@/types/database";

export interface PortalItemInput {
  id: string;
  title: string;
  description: string;
  type: TemplateItemType;
  is_required: boolean;
  status: RequestItemStatus;
  value: string | null;
  rejection_reason: string | null;
  files: { id: string; file_name: string; file_size: number; uploaded_at: string }[];
}

interface PortalAppProps {
  token: string;
  clientName: string;
  orgName: string;
  dueDate: string | null;
  customMessage: string;
  completed: boolean;
  readOnly?: boolean;
  items: PortalItemInput[];
}

const TYPE_ICONS: Record<TemplateItemType, React.ComponentType<{ className?: string }>> = {
  file: FileText,
  text: Type,
  number: Hash,
  checkbox: SquareCheck,
};

export function PortalApp({
  token,
  clientName,
  orgName,
  dueDate,
  customMessage,
  completed,
  readOnly = false,
  items,
}: PortalAppProps) {
  const answered = items.filter((i) =>
    ["uploaded", "accepted"].includes(i.status)
  ).length;
  const percent = items.length ? Math.round((answered / items.length) * 100) : 0;
  const isFullyDone = completed || (items.length > 0 && answered === items.length);

  return (
    <div className="space-y-6">
      {/* hero */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Olá, {clientName.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {orgName} preparou uma lista de documentos para si. Envie tudo a partir
          do telemóvel — não precisa de conta.
        </p>
      </div>

      {readOnly ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Pré-visualização — modo leitura.</strong> Está a ver o portal
            tal como o cliente o vê. Só o cliente pode carregar documentos ou
            responder.
          </span>
        </div>
      ) : null}

      {isFullyDone ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          <h2 className="text-xl font-bold text-emerald-800">Lista concluída! 🎉</h2>
          <p className="max-w-md text-sm text-emerald-700">
            Recebemos tudo o que precisávamos. A nossa equipa vai agora rever os
            documentos. Obrigado!
          </p>
        </div>
      ) : null}

      {/* progress */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">A sua lista de documentos</span>
          <span className="text-muted-foreground">
            {answered} de {items.length}
          </span>
        </div>
        <Progress value={percent} />
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {dueDate ? (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Prazo: {format(new Date(dueDate + "T00:00:00"), "dd/MM/yyyy")}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <Lock className="h-3.5 w-3.5" />
            Envio seguro e privado
          </span>
        </div>
      </div>

      {customMessage ? (
        <div className="flex items-start gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground shadow-sm">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="italic">“{customMessage}”</span>
        </div>
      ) : null}

      {/* items */}
      <div className="space-y-4">
        {items.map((item, index) => (
          <PortalItem
            key={item.id}
            token={token}
            item={item}
            index={index}
            readOnly={readOnly}
          />
        ))}
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Esta lista ainda não tem itens.
          </div>
        ) : null}
      </div>

      <p className="pt-2 text-center text-xs text-muted-foreground">
        Dúvidas? Contacte o seu contabilista — os dados são tratados com
        confidencialidade e de acordo com o RGPD.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function PortalItem({
  token,
  item,
  index,
  readOnly,
}: {
  token: string;
  item: PortalItemInput;
  index: number;
  readOnly: boolean;
}) {
  const Icon = TYPE_ICONS[item.type] ?? FileText;
  const editable = item.status !== "accepted";
  const answeredNow = ["uploaded", "accepted"].includes(item.status);

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-4 shadow-sm",
        item.status === "rejected" && "border-red-200",
        answeredNow && item.status !== "rejected" && "border-emerald-200"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
          {answeredNow && item.status !== "rejected" ? <Check className="h-4 w-4 text-emerald-600" /> : index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold leading-snug">{item.title}</h3>
                {!item.is_required ? (
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Opcional
                  </span>
                ) : null}
              </div>
              {item.description ? (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
            </div>
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>

          {item.rejection_reason ? (
            <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <p>
                <strong>Foi pedida uma correção:</strong> {item.rejection_reason}
              </p>
              <p className="mt-1 text-xs">
                {item.is_required
                  ? "Envie novamente a sua resposta abaixo para concluir a lista."
                  : "Este item é opcional — só precisa de o reenviar se pretender."}
              </p>
            </div>
          ) : null}

          {!editable ? (
            <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              <Lock className="h-3 w-3" /> Aceite pela equipa
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 border-t pt-3">
        {item.type === "file" ? (
          <FileAnswer
            token={token}
            item={item}
            disabled={!editable}
            readOnly={readOnly}
          />
        ) : item.type === "checkbox" ? (
          <CheckboxAnswer
            token={token}
            item={item}
            disabled={!editable}
            readOnly={readOnly}
          />
        ) : (
          <TextNumberAnswer
            token={token}
            item={item}
            disabled={!editable}
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  );
}

// --- file --------------------------------------------------------------

function FileAnswer({
  token,
  item,
  disabled,
  readOnly,
}: {
  token: string;
  item: PortalItemInput;
  disabled: boolean;
  readOnly: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error("O ficheiro deve ter até 25 MB.");
      return;
    }
    setUploading(file.name);
    try {
      const fd = new FormData();
      fd.set("token", token);
      fd.set("requestItemId", item.id);
      fd.set("fileName", file.name);
      fd.set("contentType", file.type || "application/octet-stream");
      fd.set("size", String(file.size));

      const signed = await createUploadUrlAction(initialActionState, fd);
      if (signed.error || !signed.data) {
        toast.error(signed.error ?? "Não foi possível iniciar o envio.");
        return;
      }
      const { url, path } = signed.data as { url: string; path: string };

      const response = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!response.ok) {
        toast.error("Falha no envio para o armazenamento. Tente novamente.");
        return;
      }

      const fd2 = new FormData();
      fd2.set("token", token);
      fd2.set("requestItemId", item.id);
      fd2.set("path", path);
      fd2.set("fileName", file.name);
      fd2.set("contentType", file.type || "application/octet-stream");
      fd2.set("size", String(file.size));

      const confirm = await confirmUploadAction(initialActionState, fd2);
      if (confirm.error) {
        toast.error(confirm.error);
        return;
      }
      toast.success("Documento enviado com sucesso ✓");
      router.refresh();
    } catch {
      toast.error("Ocorreu um erro no envio. Tente novamente.");
    } finally {
      setUploading(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {item.files.length > 0 ? (
        <ul className="space-y-1">
          {item.files.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{file.file_name}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatBytes(file.file_size)}
              </span>
            </li>
          ))}
        </ul>
      ) : readOnly ? (
        <p className="text-sm text-muted-foreground">Nenhum documento carregado.</p>
      ) : null}

      {readOnly ? null : (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.txt,.zip"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={disabled || uploading !== null}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <CloudUpload className="h-4 w-4 animate-pulse" />
            ) : (
              <CloudUpload className="h-4 w-4" />
            )}
            {uploading
              ? `A enviar “${uploading}”…`
              : item.files.length > 0
                ? "Adicionar outro documento"
                : "Escolher documento"}
          </Button>
          <p className="text-xs text-muted-foreground">
            PDF, imagem, Word, Excel ou ZIP · até 25 MB
          </p>
        </>
      )}
    </div>
  );
}

// --- checkbox -----------------------------------------------------------

function CheckboxAnswer({
  token,
  item,
  disabled,
  readOnly,
}: {
  token: string;
  item: PortalItemInput;
  disabled: boolean;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const isTrue = item.value === "true";

  if (readOnly) {
    return (
      <div>
        {isTrue ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            <Check className="h-4 w-4" /> Confirmado
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">
            {item.value === "false" ? "Não marcado" : "Ainda não respondido"}
          </span>
        )}
      </div>
    );
  }

  async function setValue(value: boolean) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("token", token);
      fd.set("requestItemId", item.id);
      fd.set("value", value ? "true" : "false");
      const result = await submitAnswerAction(initialActionState, fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success(value ? "Confirmado ✓" : "Confirmação removida");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant={isTrue ? "default" : "outline"}
        className={cn("w-full", isTrue && "bg-emerald-600 hover:bg-emerald-700")}
        disabled={disabled || busy}
        onClick={() => setValue(!isTrue)}
      >
        <SquareCheck className="h-4 w-4" />
        {isTrue ? "Confirmado" : "Confirmar"}
      </Button>
    </div>
  );
}

// --- text / number -------------------------------------------------------

function TextNumberAnswer({
  token,
  item,
  disabled,
  readOnly,
}: {
  token: string;
  item: PortalItemInput;
  disabled: boolean;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(item.value ?? "");
  const [busy, setBusy] = useState(false);

  if (readOnly) {
    return (
      <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
        {item.value ? (
          item.value
        ) : (
          <span className="text-muted-foreground">Ainda não respondido</span>
        )}
      </div>
    );
  }

  async function save() {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("token", token);
      fd.set("requestItemId", item.id);
      fd.set("value", value);
      const result = await submitAnswerAction(initialActionState, fd);
      if (result.error) toast.error(result.error);
      else {
        toast.success("Resposta guardada ✓");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {item.type === "number" ? (
        <input
          type="number"
          inputMode="decimal"
          value={value}
          disabled={disabled || busy}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Escreva o valor…"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base disabled:opacity-60 md:text-sm"
        />
      ) : (
        <Textarea
          value={value}
          disabled={disabled || busy}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Escreva aqui a sua resposta…"
          rows={2}
        />
      )}
      <Button
        type="button"
        size="sm"
        disabled={disabled || busy || value.trim() === ""}
        onClick={save}
      >
        Guardar resposta
      </Button>
    </div>
  );
}
