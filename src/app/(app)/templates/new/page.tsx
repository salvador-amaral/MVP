import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TemplateEditor } from "@/components/templates/template-editor";
import { ActionButton } from "@/components/shared/action-button";
import { createTemplateAction, seedExampleTemplatesAction } from "@/server/actions/templates";
import { DEFAULT_TEMPLATES } from "@/lib/default-templates";

export default function NewTemplatePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/templates"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Modelos
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Novo modelo de documentos</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateEditor action={createTemplateAction} />
        </CardContent>
      </Card>

      <details className="rounded-lg border bg-muted/40 p-4 text-sm">
        <summary className="cursor-pointer font-medium">
          👀 Ver {DEFAULT_TEMPLATES.length} exemplos prontos a usar
        </summary>
        <div className="mt-3">
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            {DEFAULT_TEMPLATES.map((t) => (
              <li key={t.name}>{t.name}</li>
            ))}
          </ul>
          <ActionButton
            variant="outline"
            size="sm"
            className="mt-3"
            action={seedExampleTemplatesAction}
            successMessage="Modelos de exemplo adicionados"
            pendingText="A carregar…"
          >
            <Sparkles /> Carregar modelos de exemplo
          </ActionButton>
        </div>
      </details>
    </div>
  );
}
