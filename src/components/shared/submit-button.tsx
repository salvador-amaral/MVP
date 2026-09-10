"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

interface SubmitButtonProps extends ButtonProps {
  pendingText?: string;
}

/** Button that shows a spinner while its enclosing <form> is submitting. */
export function SubmitButton({
  children,
  pendingText,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} {...props}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? (pendingText ?? "A guardar…") : children}
    </Button>
  );
}
