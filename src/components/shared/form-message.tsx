import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ActionState } from "@/lib/action-state";

export function FormMessage({ state }: { state?: ActionState }) {
  if (!state) return null;
  if (state.error) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{state.error}</span>
      </div>
    );
  }
  if (state.ok && state.message) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{state.message}</span>
      </div>
    );
  }
  return null;
}
