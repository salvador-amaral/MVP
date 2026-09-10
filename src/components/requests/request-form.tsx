"use client";

import { useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { initialActionState, type ActionState } from "@/lib/action-state";

export interface RequestFormOptions {
  client: { id: string; name: string };
  template: { id: string; name: string; items: number };
}

interface RequestFormProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  clients: RequestFormOptions["client"][];
  templates: RequestFormOptions["template"][];
  defaultClientId?: string;
  defaultTemplateId?: string;
  defaultDueDate?: string;
  title: string;
}

export function RequestForm({
  action,
  clients,
  templates,
  defaultClientId,
  defaultTemplateId,
  defaultDueDate,
  title,
}: RequestFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialActionState);
  const [templateId, setTemplateId] = useState(defaultTemplateId ?? "");

  useEffect(() => {
    if (state.ok) {
      const data = state.data as { id?: string } | undefined;
      router.push(data?.id ? `/requests/${data.id}` : "/requests");
    }
  }, [state, router]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId]
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="clientId">Cliente *</Label>
        <Select name="clientId" defaultValue={defaultClientId} required>
          <SelectTrigger id="clientId">
            <SelectValue placeholder="Escolher cliente…" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="templateId">Modelo *</Label>
        <Select
          name="templateId"
          value={templateId}
          onValueChange={setTemplateId}
          required
        >
          <SelectTrigger id="templateId">
            <SelectValue placeholder="Escolher modelo…" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name} ({template.items} itens)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedTemplate && selectedTemplate.items === 0 ? (
          <p className="text-xs text-amber-600">
            Este modelo não tem itens — adicione itens antes de enviar.
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dueDate">Data limite</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={defaultDueDate}
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 pb-2.5 text-sm">
            <input
              type="checkbox"
              name="remindersEnabled"
              defaultChecked
              className="h-4 w-4 rounded border-primary"
            />
            Enviar lembretes automáticos
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="customMessage">Mensagem personalizada</Label>
        <Textarea
          id="customMessage"
          name="customMessage"
          rows={4}
          placeholder="Ex.: Bom dia, no âmbito do fecho de contas de junho, precisamos que nos envie os seguintes documentos até à data indicada. Obrigado!"
        />
      </div>

      <FormMessage state={state} />

      <div className="flex justify-end">
        <SubmitButton>{title}</SubmitButton>
      </div>
    </form>
  );
}
