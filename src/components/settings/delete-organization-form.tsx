"use client";

import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { initialActionState } from "@/lib/action-state";
import { deleteOrganizationAction } from "@/server/actions/settings";

/**
 * Deleting an organization destroys every client, request and uploaded document
 * in the account, so the action requires the caller to type the organization's
 * name. The button stays disabled until it matches — a `window.confirm()` is
 * far too easy to click through for something this final.
 */
export function DeleteOrganizationForm({
  organizationName,
}: {
  organizationName: string;
}) {
  const [state, formAction] = useActionState(
    deleteOrganizationAction,
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
        pendingText="A eliminar…"
      >
        Eliminar organização definitivamente
      </SubmitButton>
    </form>
  );
}
