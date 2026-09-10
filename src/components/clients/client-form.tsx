"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { initialActionState, type ActionState } from "@/lib/action-state";

interface ClientFormProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultValues?: { name: string; email: string; phone: string; notes: string };
}

export function ClientForm({ action, defaultValues }: ClientFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.ok) {
      const data = state.data as { id?: string } | undefined;
      router.push(data?.id ? `/clients/${data.id}` : "/clients");
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaultValues?.name}
          placeholder="Ex.: João Silva Lda."
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={defaultValues?.email}
          placeholder="cliente@empresa.pt"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={defaultValues?.phone}
          placeholder="+351 …"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={defaultValues?.notes}
          placeholder="Notas internas sobre este cliente…"
          rows={3}
        />
      </div>
      <FormMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton>{defaultValues ? "Guardar alterações" : "Criar cliente"}</SubmitButton>
      </div>
    </form>
  );
}
