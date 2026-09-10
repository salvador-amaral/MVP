"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { initialActionState } from "@/lib/action-state";
import { updateOrganizationAction } from "@/server/actions/settings";
import type { ReminderSettings } from "@/types/database";

export function OrgSettingsForm({
  defaultName,
  defaultReplyTo,
  reminderSettings,
}: {
  defaultName: string;
  defaultReplyTo: string;
  reminderSettings: ReminderSettings;
}) {
  const [state, formAction] = useActionState(updateOrganizationAction, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do escritório</Label>
        <Input id="name" name="name" defaultValue={defaultName} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="replyToEmail">Email de resposta (opcional)</Label>
        <Input
          id="replyToEmail"
          name="replyToEmail"
          type="email"
          defaultValue={defaultReplyTo}
          placeholder="escritorio@exemplo.pt"
        />
        <p className="text-xs text-muted-foreground">
          Quando um cliente responde a um email, a resposta é entregue neste
          endereço. Deixe vazio para usar o endereço da plataforma.
        </p>
      </div>

      <div className="rounded-md border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Lembretes automáticos</h3>
            <p className="text-xs text-muted-foreground">
              O cliente recebe emails automáticos até concluir a lista.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="remindersEnabled"
              defaultChecked={reminderSettings.enabled}
              className="h-4 w-4 rounded border-primary"
            />
            Ativado
          </label>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="daysBefore">
              Dias antes do prazo (separados por vírgula)
            </Label>
            <Input
              id="daysBefore"
              name="daysBefore"
              defaultValue={(reminderSettings.daysBefore ?? [3, 1]).join(",")}
              placeholder="3,1"
              inputMode="numeric"
            />
            <p className="text-xs text-muted-foreground">
              Ex.: “3,1” envia um lembrete 3 dias antes e outro 1 dia antes.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="everyDaysAfter">De 2 em 2 dias após o prazo</Label>
            <Input
              id="everyDaysAfter"
              name="everyDaysAfter"
              type="number"
              min={1}
              defaultValue={reminderSettings.everyDaysAfter ?? 2}
            />
            <p className="text-xs text-muted-foreground">
              Após a data limite ultrapassada, lembra de X em X dias.
            </p>
          </div>
        </div>
      </div>

      <FormMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton>Guardar definições</SubmitButton>
      </div>
    </form>
  );
}
