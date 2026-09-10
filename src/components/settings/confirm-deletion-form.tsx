"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { initialActionState } from "@/lib/action-state";
import { confirmOrganizationDeletionAction } from "@/server/actions/organization-deletion";

/**
 * Step 2, reachable only from the link emailed to the owner. Carries the
 * single-use token and performs the actual deletion.
 */
export function ConfirmDeletionForm({
  token,
  organizationName,
}: {
  token: string;
  organizationName: string;
}) {
  const [state, formAction] = useActionState(
    confirmOrganizationDeletionAction,
    initialActionState
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />
      <SubmitButton variant="destructive" pendingText="A eliminar…">
        Eliminar «{organizationName}» definitivamente
      </SubmitButton>
    </form>
  );
}
