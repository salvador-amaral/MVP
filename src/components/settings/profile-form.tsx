"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { initialActionState } from "@/lib/action-state";
import { updateProfileAction } from "@/server/actions/settings";

export function ProfileForm({ defaultName }: { defaultName: string }) {
  const [state, formAction] = useActionState(updateProfileAction, initialActionState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">O seu nome</Label>
        <Input id="fullName" name="fullName" defaultValue={defaultName} required />
      </div>
      <FormMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton>Guardar perfil</SubmitButton>
      </div>
    </form>
  );
}
