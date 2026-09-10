"use client";

import { Button, type ButtonProps } from "@/components/ui/button";

interface ConfirmButtonProps extends Omit<ButtonProps, "onClick" | "type"> {
  action: () => void | Promise<void>;
  confirmText?: string;
}

/** Runs a (server) action after the user confirms in a native dialog. */
export function ConfirmButton({
  action,
  confirmText,
  children,
  ...props
}: ConfirmButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      {...props}
      onClick={async () => {
        if (window.confirm(confirmText ?? "Tem a certeza?")) {
          await action();
        }
      }}
    >
      {children}
    </Button>
  );
}
