"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { reviewItemAction } from "@/server/actions/items";
import { initialActionState } from "@/lib/action-state";

export function ReviewPanel({ requestItemId }: { requestItemId: string }) {
  const [mode, setMode] = useState<"none" | "reject">("none");
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  async function decide(decision: "accepted" | "rejected") {
    const fd = new FormData();
    fd.set("requestItemId", requestItemId);
    fd.set("decision", decision);
    fd.set("rejectionReason", reason);
    startTransition(async () => {
      const result = await reviewItemAction(initialActionState, fd);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(
          decision === "accepted" ? "Documento aceite ✓" : "Documento rejeitado"
        );
        setMode("none");
        setReason("");
      }
    });
  }

  return (
    <div className="space-y-2">
      {mode === "none" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() => decide("accepted")}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Check /> Aceitar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setMode("reject")}
            className="text-destructive hover:text-destructive"
          >
            <X /> Rejeitar
          </Button>
        </div>
      ) : (
        <div className="space-y-2 rounded-md border border-red-200 bg-red-50/50 p-3">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (opcional) — visível para o cliente"
            rows={2}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => decide("rejected")}
            >
              Confirmar rejeição
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setMode("none");
                setReason("");
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
