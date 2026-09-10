"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";

interface CopyButtonProps extends Omit<ButtonProps, "onClick"> {
  value: string;
  label?: string;
}

export function CopyButton({
  value,
  label = "Copiar ligação",
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      {...props}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success("Ligação copiada");
          setTimeout(() => setCopied(false), 1600);
        } catch {
          toast.error("Não foi possível copiar");
        }
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copiada!" : label}
    </Button>
  );
}
