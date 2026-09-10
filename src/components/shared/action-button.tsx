"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import type { ActionState } from "@/lib/action-state";

interface ActionButtonProps extends Omit<ButtonProps, "onClick" | "type"> {
  /** Server action returning an ActionState. */
  action: () => Promise<ActionState | void>;
  confirmText?: string;
  successMessage?: string;
  pendingText?: string;
}

/** Runs a server action with loading state + toast feedback. */
export function ActionButton({
  action,
  confirmText,
  successMessage,
  pendingText,
  children,
  disabled,
  ...props
}: ActionButtonProps) {
  const [pending, startTransition] = useTransition();
  const [localPending, setLocalPending] = useState(false);

  async function handleClick() {
    if (confirmText && !window.confirm(confirmText)) return;
    setLocalPending(true);
    try {
      const result = (await action()) as ActionState | undefined;
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.warning) {
        toast.warning(result.warning);
      } else if (result?.ok) {
        toast.success(result.message ?? successMessage ?? "Operação concluída");
      }
    } catch {
      toast.error("Ocorreu um erro. Tente novamente.");
    } finally {
      setLocalPending(false);
    }
  }

  const busy = pending || localPending;

  return (
    <Button
      type="button"
      disabled={disabled || busy}
      onClick={() => startTransition(() => handleClick())}
      {...props}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {busy ? (pendingText ?? "A processar…") : children}
    </Button>
  );
}
