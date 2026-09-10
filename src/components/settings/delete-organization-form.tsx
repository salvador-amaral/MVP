"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { initialActionState } from "@/lib/action-state";
import { requestOrganizationDeletionAction } from "@/server/actions/organization-deletion";

/**
 * Step 1 of organization deletion: typing the organization's name queues the
 * request and emails a confirmation link to the owner. Nothing is destroyed
 * yet — the deletion only happens when that link is opened, so a hijacked
 * session on its own cannot wipe a tenant without access to the owner's inbox.
 *
 * The submit button stays disabled until the name matches, because a
 * `window.confirm()` is far too easy to click through.
 */
export function DeleteOrganizationForm({
  organizationName,
}: {
  organizationName: string;
}) {
  const [state, formAction] = useActionState(
    requestOrganizationDeletionAction,
    initialActionState
  );
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === organizationName;

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="confirmation">
          Escreva <span className="font-semibold">{organizationName}</span> para
          confirmar
        </Label>
        <Input
          id="confirmation"
          name="confirmation"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          placeholder={organizationName}
        />
      </div>

      <FormMessage state={state} />

      <SubmitButton
        variant="destructive"
        disabled={!matches}
        pendingText="A enviar…"
      >
        Enviar email de confirmação
      </SubmitButton>
    </form>
  );
}
