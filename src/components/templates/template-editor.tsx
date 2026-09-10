"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Hash,
  Plus,
  SquareCheck,
  Trash2,
  Type,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmitButton } from "@/components/shared/submit-button";
import { FormMessage } from "@/components/shared/form-message";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { TEMPLATE_ITEM_TYPE_DESCRIPTIONS } from "@/lib/constants";
import type { TemplateItemType } from "@/types/database";

export interface TemplateEditorItem {
  title: string;
  description: string;
  type: TemplateItemType;
  is_required: boolean;
}

interface TemplateEditorProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultName?: string;
  defaultDescription?: string;
  initialItems?: TemplateEditorItem[];
}

const TYPE_ICONS: Record<TemplateItemType, React.ComponentType<{ className?: string }>> = {
  file: FileText,
  text: Type,
  number: Hash,
  checkbox: SquareCheck,
};

export function TemplateEditor({
  action,
  defaultName = "",
  defaultDescription = "",
  initialItems = [],
}: TemplateEditorProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(action, initialActionState);
  const [items, setItems] = useState<TemplateEditorItem[]>(initialItems);

  useEffect(() => {
    if (state.ok) {
      const data = state.data as { id?: string } | undefined;
      router.push(data?.id ? `/templates/${data.id}` : "/templates");
    }
  }, [state, router]);

  function patch(index: number, patch: Partial<TemplateEditorItem>) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { title: "", description: "", type: "file", is_required: true },
    ]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function move(index: number, delta: -1 | 1) {
    setItems((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do modelo *</Label>
          <Input
            id="name"
            name="name"
            defaultValue={defaultName}
            placeholder="Ex.: Fecho de Contas Mensal"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={defaultDescription}
            placeholder="Para que serve este modelo…"
            rows={2}
          />
        </div>
      </div>

      {/* items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Itens da lista <span className="text-muted-foreground font-normal">({items.length})</span>
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus /> Adicionar item
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Adicione os documentos ou perguntas que o cliente deve preparar.
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((item, index) => {
              const Icon = TYPE_ICONS[item.type];
              return (
                <li
                  key={index}
                  className="rounded-lg border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <Icon className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      <Input
                        value={item.title}
                        onChange={(e) => patch(index, { title: e.target.value })}
                        placeholder="Título do item (ex.: Cartão de cidadão)"
                        className="font-medium"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        aria-label="Mover para cima"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={index === items.length - 1}
                        onClick={() => move(index, 1)}
                        aria-label="Mover para baixo"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => removeItem(index)}
                        aria-label="Remover item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-2">
                      <Textarea
                        value={item.description}
                        onChange={(e) =>
                          patch(index, { description: e.target.value })
                        }
                        placeholder="Instrução para o cliente (opcional)"
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      <Select
                        value={item.type}
                        onValueChange={(value) =>
                          patch(index, { type: value as TemplateItemType })
                        }
                      >
                        <SelectTrigger aria-label="Tipo do item">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="file">Ficheiro</SelectItem>
                          <SelectItem value="text">Texto</SelectItem>
                          <SelectItem value="number">Número</SelectItem>
                          <SelectItem value="checkbox">Caixa de seleção</SelectItem>
                        </SelectContent>
                      </Select>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={item.is_required}
                          onChange={(e) =>
                            patch(index, { is_required: e.target.checked })
                          }
                          className="h-4 w-4 rounded border-primary"
                        />
                        Obrigatório
                      </label>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {TEMPLATE_ITEM_TYPE_DESCRIPTIONS[item.type]}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* serialized payload */}
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <FormMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton disabled={items.length === 0}>
          Guardar modelo
        </SubmitButton>
      </div>
    </form>
  );
}
