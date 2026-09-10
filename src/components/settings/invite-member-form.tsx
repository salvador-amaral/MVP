"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { initialActionState } from "@/lib/action-state";
import { inviteMemberAction } from "@/server/actions/settings";

export function InviteMemberForm() {
  const [state, formAction] = useActionState(
    inviteMemberAction,
    initialActionState
  );

  return (
    <form action={formAction} className="mt-4 space-y-4 border-t pt-4">
      <div>
        <h3 className="text-sm font-semibold">Convidar membro da equipa</h3>
        <p className="text-xs text-muted-foreground">
          A pessoa recebe um email para criar a palavra-passe e entra
          diretamente nesta organização.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="inviteName">Nome</Label>
          <Input
            id="inviteName"
            name="fullName"
            placeholder="Ex.: Ana Costa"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inviteEmail">Email</Label>
          <Input
            id="inviteEmail"
            name="email"
            type="email"
            placeholder="pessoa@escritorio.pt"
            required
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-40 flex-1 space-y-2">
          <Label>Função</Label>
          <Select name="role" defaultValue="member">
            <SelectTrigger aria-label="Função do membro">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Membro</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <SubmitButton>
          <UserPlus /> Enviar convite
        </SubmitButton>
      </div>

      <FormMessage state={state} />
    </form>
  );
}
